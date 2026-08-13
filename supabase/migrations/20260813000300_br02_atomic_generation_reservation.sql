-- Atomically reserve a BR02 generation slot before any provider request.
-- Client roles cannot execute this function; it is for the service-side Edge Function.

create or replace function public.br02_reserve_generation(
  p_project_id uuid,
  p_owner_user_id uuid,
  p_source_asset_id uuid,
  p_ordinal smallint,
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
returns table (concept_id uuid, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reserved_concept_id uuid;
  concept_count bigint;
  user_attempt_count bigint;
  ip_attempt_count bigint;
  reserved_month_total numeric;
  current_month timestamptz := date_trunc('month', now());
begin
  -- Keep lock acquisition order stable to serialize quota checks and reservations.
  perform pg_advisory_xact_lock(hashtext('br02:month:' || to_char(current_month, 'YYYY-MM')));
  perform pg_advisory_xact_lock(hashtext('br02:user:' || p_owner_user_id::text));
  if p_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext('br02:ip:' || p_ip_hash));
  end if;
  perform pg_advisory_xact_lock(hashtext('br02:project:' || p_project_id::text));

  if p_reserved_cost < 0 or p_monthly_budget < 0 then
    return query select null::uuid, 'BUDGET_LIMIT_REACHED'::text;
    return;
  end if;

  if not exists (
    select 1 from public.remodel_projects
    where id = p_project_id and owner_user_id = p_owner_user_id
  ) then
    return query select null::uuid, 'NOT_FOUND'::text;
    return;
  end if;

  if not exists (
    select 1 from public.remodel_assets
    where id = p_source_asset_id
      and project_id = p_project_id
      and owner_user_id = p_owner_user_id
      and kind = 'source'
      and validation_status = 'ready'
  ) then
    return query select null::uuid, 'UPLOAD_NOT_READY'::text;
    return;
  end if;

  select count(*) into concept_count
  from public.remodel_concepts
  where project_id = p_project_id;
  if concept_count >= 4 or exists (
    select 1 from public.remodel_concepts
    where project_id = p_project_id and ordinal = p_ordinal
  ) then
    return query select null::uuid, 'RATE_LIMITED'::text;
    return;
  end if;

  select count(*) into user_attempt_count
  from public.generation_events
  where owner_user_id = p_owner_user_id
    and event_type = 'attempt'
    and created_at >= now() - interval '24 hours';
  if user_attempt_count >= 8 then
    return query select null::uuid, 'RATE_LIMITED'::text;
    return;
  end if;

  if p_ip_hash is not null then
    select count(*) into ip_attempt_count
    from public.generation_events
    where ip_hash = p_ip_hash
      and event_type = 'attempt'
      and created_at >= now() - interval '1 hour';
    if ip_attempt_count >= 3 then
      return query select null::uuid, 'RATE_LIMITED'::text;
      return;
    end if;
  end if;

  select coalesce(sum(reserved_cost_usd), 0) into reserved_month_total
  from public.generation_events
  where event_type = 'attempt'
    and created_at >= current_month;
  if reserved_month_total + p_reserved_cost > p_monthly_budget then
    return query select null::uuid, 'BUDGET_LIMIT_REACHED'::text;
    return;
  end if;

  reserved_concept_id := gen_random_uuid();
  insert into public.remodel_concepts (
    id, project_id, owner_user_id, source_asset_id, ordinal, concept_direction,
    model, quality, image_size, prompt_version, prompt_hash, status
  ) values (
    reserved_concept_id, p_project_id, p_owner_user_id, p_source_asset_id,
    p_ordinal, p_concept_direction, p_model, p_quality, p_image_size,
    p_prompt_version, p_prompt_hash, 'generating'
  );
  insert into public.generation_events (
    project_id, owner_user_id, concept_id, ip_hash, event_type, reserved_cost_usd
  ) values (
    p_project_id, p_owner_user_id, reserved_concept_id, p_ip_hash, 'attempt', p_reserved_cost
  );

  return query select reserved_concept_id, null::text;
end;
$$;

revoke all on function public.br02_reserve_generation(uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.br02_reserve_generation(uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric)
  to service_role;