-- SCR-BR03 hotfix reconciliation: qualify remodel_concepts ordinal/project/stage references
-- Mirrors the verified hosted br03_reserve_generation definition after G5.6 repair.

create or replace function public.br03_reserve_generation(
  p_project_id uuid,
  p_owner_user_id uuid,
  p_source_asset_id uuid,
  p_access_stage text,
  p_concept_direction text,
  p_model text,
  p_quality text,
  p_image_size text,
  p_prompt_version text,
  p_prompt_hash text,
  p_ip_hash text,
  p_reserved_cost numeric,
  p_monthly_budget numeric
)
returns table(concept_id uuid, ordinal smallint, access_stage text, credit_source text, error_code text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  project_row public.remodel_projects%rowtype;
  source_asset public.remodel_assets%rowtype;
  selected_lead public.studio_lead_entitlements%rowtype;
  selected_grant public.studio_access_grants%rowtype;
  new_concept_id uuid;
  selected_credit_source text;
  next_ordinal integer;
  reserved_count bigint;
  user_attempt_count bigint;
  ip_attempt_count bigint;
  reserved_month_total numeric;
  current_month timestamptz := date_trunc('month', now());
begin
  perform pg_advisory_xact_lock(hashtext('br03:month:' || to_char(current_month, 'YYYY-MM')));
  perform pg_advisory_xact_lock(hashtext('br03:user:' || p_owner_user_id::text));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext('br03:ip:' || p_ip_hash));
  end if;
  perform pg_advisory_xact_lock(hashtext('br03:project:' || p_project_id::text));

  if p_access_stage not in ('pre_contract', 'active_project')
    or p_reserved_cost < 0 or p_monthly_budget < 0 then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  select * into project_row from public.remodel_projects
  where id = p_project_id and owner_user_id = p_owner_user_id;
  if not found then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'NOT_FOUND'::text;
    return;
  end if;

  select * into source_asset from public.remodel_assets
  where id = p_source_asset_id and project_id = p_project_id
    and owner_user_id = p_owner_user_id and kind = 'source'
    and validation_status = 'ready';
  if not found then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'UPLOAD_NOT_READY'::text;
    return;
  end if;

  select count(*) into user_attempt_count from public.generation_events
  where owner_user_id = p_owner_user_id and event_type = 'attempt'
    and created_at >= now() - interval '24 hours';
  if user_attempt_count >= 8 then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'RATE_LIMITED'::text;
    return;
  end if;

  if p_ip_hash is not null then
    select count(*) into ip_attempt_count from public.generation_events
    where ip_hash = p_ip_hash and event_type = 'attempt'
      and created_at >= now() - interval '1 hour';
    if ip_attempt_count >= 3 then
      return query select null::uuid, null::smallint, p_access_stage, null::text, 'RATE_LIMITED'::text;
      return;
    end if;
  end if;

  select coalesce(sum(reserved_cost_usd), 0) into reserved_month_total
  from public.generation_events
  where event_type = 'attempt' and created_at >= current_month;
  if reserved_month_total + p_reserved_cost > p_monthly_budget then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'BUDGET_LIMIT_REACHED'::text;
    return;
  end if;

  select coalesce(max(c.ordinal), 0) + 1 into next_ordinal
  from public.remodel_concepts c
  where c.project_id = p_project_id and c.access_stage = p_access_stage;
  if next_ordinal > 32767 then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'RATE_LIMITED'::text;
    return;
  end if;

  if p_access_stage = 'pre_contract' then
    select * into selected_lead
    from public.studio_lead_entitlements l
    where l.project_id = p_project_id and l.owner_user_id = p_owner_user_id
      and l.status = 'active'
      and l.used + (
        select count(*) from public.studio_generation_credit_reservations r
        where r.lead_entitlement_id = l.id and r.state = 'reserved'
      ) < l.allowance
    order by l.created_at
    limit 1 for update;

    if found then
      selected_credit_source := 'lead';
    else
      select * into selected_grant
      from public.studio_access_grants g
      where g.project_id = p_project_id and g.owner_user_id = p_owner_user_id
        and g.stage = 'planning' and g.source = 'staff'
        and g.status = 'active'
        and (g.expires_at is null or g.expires_at > now())
        and g.used + (
          select count(*) from public.studio_generation_credit_reservations r
          where r.grant_id = g.id and r.state = 'reserved'
        ) < g.allowance
      order by g.created_at
      limit 1 for update;
      if found then selected_credit_source := 'grant'; end if;
    end if;
  else
    select * into selected_grant
    from public.studio_access_grants g
    where g.project_id = p_project_id and g.owner_user_id = p_owner_user_id
      and g.stage = 'active_project' and g.status = 'active'
      and (g.expires_at is null or g.expires_at > now())
      and g.used + (
        select count(*) from public.studio_generation_credit_reservations r
        where r.grant_id = g.id and r.state = 'reserved'
      ) < g.allowance
    order by g.created_at
    limit 1 for update;
    if found then selected_credit_source := 'grant'; end if;
  end if;

  if selected_credit_source is null then
    return query select null::uuid, null::smallint, p_access_stage, null::text, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  new_concept_id := gen_random_uuid();
  insert into public.remodel_concepts (
    id, project_id, owner_user_id, source_asset_id, ordinal, access_stage,
    concept_direction, model, quality, image_size, prompt_version, prompt_hash, status
  ) values (
    new_concept_id, p_project_id, p_owner_user_id, p_source_asset_id, next_ordinal::smallint,
    p_access_stage, p_concept_direction, p_model, p_quality, p_image_size,
    p_prompt_version, p_prompt_hash, 'generating'
  );

  insert into public.studio_generation_credit_reservations (
    concept_id, project_id, owner_user_id, credit_source, lead_entitlement_id, grant_id
  ) values (
    new_concept_id, p_project_id, p_owner_user_id, selected_credit_source,
    case when selected_credit_source = 'lead' then selected_lead.id else null end,
    case when selected_credit_source = 'grant' then selected_grant.id else null end
  );

  insert into public.generation_events (
    project_id, owner_user_id, concept_id, ip_hash, event_type, reserved_cost_usd
  ) values (
    p_project_id, p_owner_user_id, new_concept_id, p_ip_hash, 'attempt', p_reserved_cost
  );

  return query select new_concept_id, next_ordinal::smallint, p_access_stage, selected_credit_source, null::text;
end;
$function$;

revoke all on function public.br03_reserve_generation(uuid,uuid,uuid,text,text,text,text,text,text,text,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.br03_reserve_generation(uuid,uuid,uuid,text,text,text,text,text,text,text,text,numeric,numeric) to service_role;
