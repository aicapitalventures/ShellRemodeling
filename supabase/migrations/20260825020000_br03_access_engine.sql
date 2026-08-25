-- SCR-BR03-IMPLEMENTATION-001 G2
-- Verified customer claim, staff authorization, and fair Studio credit accounting.
-- Repository-only migration. Do not apply without a separate deployment gate.

create table if not exists public.studio_staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'reviewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_staff_members_status_role_idx
  on public.studio_staff_members(status, role);
create trigger studio_staff_members_set_updated_at
before update on public.studio_staff_members
for each row execute function public.br02_set_updated_at();

alter table public.studio_staff_members enable row level security;
revoke all on public.studio_staff_members from public, anon, authenticated;
grant all on public.studio_staff_members to service_role;

create or replace function public.br03_claim_inquiry_studio_access(
  p_token_hash text,
  p_project_id uuid,
  p_owner_user_id uuid,
  p_verified_normalized_email text
)
returns table (entitlement_id uuid, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inquiry_row public.public_project_inquiries%rowtype;
  new_entitlement_id uuid;
  normalized_email text := lower(trim(p_verified_normalized_email));
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return query select null::uuid, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  if not exists (
    select 1 from public.remodel_projects
    where id = p_project_id and owner_user_id = p_owner_user_id
  ) then
    return query select null::uuid, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  select * into inquiry_row
  from public.public_project_inquiries
  where studio_unlock_token_hash = p_token_hash
  for update;

  if not found
    or inquiry_row.studio_unlock_expires_at <= now()
    or inquiry_row.studio_unlocked_at is not null
    or nullif(trim(inquiry_row.email), '') is null
    or lower(trim(inquiry_row.email)) <> normalized_email then
    return query select null::uuid, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  update public.public_project_inquiries
  set studio_unlocked_at = now(), studio_owner_user_id = p_owner_user_id
  where id = inquiry_row.id;

  insert into public.studio_lead_entitlements (
    inquiry_id, project_id, owner_user_id, allowance, used, status
  ) values (
    inquiry_row.id, p_project_id, p_owner_user_id, 1, 0, 'active'
  )
  on conflict (inquiry_id) do nothing
  returning id into new_entitlement_id;

  if new_entitlement_id is null then
    return query select null::uuid, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  return query select new_entitlement_id, null::text;
end;
$$;

revoke all on function public.br03_claim_inquiry_studio_access(text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.br03_claim_inquiry_studio_access(text, uuid, uuid, text)
  to service_role;

create or replace function public.br03_grant_studio_access(
  p_project_id uuid,
  p_staff_user_id uuid,
  p_stage text,
  p_allowance smallint,
  p_reason_code text default null
)
returns table (grant_id uuid, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  project_row public.remodel_projects%rowtype;
  new_grant_id uuid;
  current_planning_allowance bigint;
  lead_allowance bigint;
begin
  perform pg_advisory_xact_lock(hashtext('br03:grant:' || p_project_id::text));

  if not exists (
    select 1 from public.studio_staff_members
    where user_id = p_staff_user_id and role = 'admin' and status = 'active'
  ) then
    return query select null::uuid, 'STAFF_NOT_AUTHORIZED'::text;
    return;
  end if;

  select * into project_row
  from public.remodel_projects
  where id = p_project_id
  for update;
  if not found then
    return query select null::uuid, 'NOT_FOUND'::text;
    return;
  end if;

  if p_stage = 'planning' then
    if p_allowance not in (1, 2) then
      return query select null::uuid, 'NOT_AUTHORIZED'::text;
      return;
    end if;
    if not exists (
      select 1 from public.studio_lead_entitlements
      where project_id = p_project_id
    ) then
      return query select null::uuid, 'NOT_AUTHORIZED'::text;
      return;
    end if;

    select coalesce(sum(allowance), 0) into current_planning_allowance
    from public.studio_access_grants
    where project_id = p_project_id
      and stage = 'planning'
      and source = 'staff'
      and status <> 'revoked';
    select coalesce(sum(allowance), 0) into lead_allowance
    from public.studio_lead_entitlements
    where project_id = p_project_id
      and status <> 'revoked';
    if lead_allowance + current_planning_allowance + p_allowance > 3 then
      return query select null::uuid, 'NOT_AUTHORIZED'::text;
      return;
    end if;
  elsif p_stage = 'active_project' then
    if p_allowance not in (1, 2)
      or project_row.business_stage not in ('deposit_paid', 'scheduled', 'active_project') then
      return query select null::uuid, 'NOT_AUTHORIZED'::text;
      return;
    end if;
  else
    return query select null::uuid, 'NOT_AUTHORIZED'::text;
    return;
  end if;

  insert into public.studio_access_grants (
    project_id, owner_user_id, stage, source, allowance, granted_by_user_id, reason_code
  ) values (
    p_project_id, project_row.owner_user_id, p_stage, 'staff', p_allowance,
    p_staff_user_id, nullif(left(trim(coalesce(p_reason_code, '')), 240), '')
  ) returning id into new_grant_id;

  insert into public.audit_events (
    subject_project_id, owner_user_id, event_type, metadata
  ) values (
    p_project_id, project_row.owner_user_id, 'studio_access_granted',
    jsonb_build_object('stage', p_stage, 'allowance', p_allowance, 'source', 'staff')
  );

  return query select new_grant_id, null::text;
end;
$$;

revoke all on function public.br03_grant_studio_access(uuid, uuid, text, smallint, text)
  from public, anon, authenticated;
grant execute on function public.br03_grant_studio_access(uuid, uuid, text, smallint, text)
  to service_role;

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
returns table (concept_id uuid, ordinal smallint, access_stage text, credit_source text, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  select coalesce(max(ordinal), 0) + 1 into next_ordinal
  from public.remodel_concepts
  where project_id = p_project_id and access_stage = p_access_stage;
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
$$;

revoke all on function public.br03_reserve_generation(uuid, uuid, uuid, text, text, text, text, text, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.br03_reserve_generation(uuid, uuid, uuid, text, text, text, text, text, text, text, numeric, numeric)
  to service_role;

create or replace function public.br03_finalize_generation_success(
  p_concept_id uuid,
  p_result_asset_id uuid,
  p_openai_request_id text default null
)
returns table (concept_id uuid, status text, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_row public.studio_generation_credit_reservations%rowtype;
  concept_row public.remodel_concepts%rowtype;
  result_asset public.remodel_assets%rowtype;
  project_row public.remodel_projects%rowtype;
  new_used smallint;
begin
  select * into reservation_row from public.studio_generation_credit_reservations
  where concept_id = p_concept_id for update;
  if not found then
    return query select p_concept_id, 'failed'::text, 'NOT_FOUND'::text;
    return;
  end if;
  if reservation_row.state = 'consumed' then
    return query select p_concept_id, 'completed'::text, null::text;
    return;
  end if;
  if reservation_row.state <> 'reserved' then
    return query select p_concept_id, 'failed'::text, 'GENERATION_FAILED'::text;
    return;
  end if;

  select * into concept_row from public.remodel_concepts where id = p_concept_id for update;
  select * into result_asset from public.remodel_assets
  where id = p_result_asset_id and project_id = reservation_row.project_id
    and owner_user_id = reservation_row.owner_user_id and kind = 'concept';
  if not found or result_asset.validation_status <> 'ready' then
    return query select p_concept_id, 'failed'::text, 'GENERATION_FAILED'::text;
    return;
  end if;

  if reservation_row.credit_source = 'lead' then
    update public.studio_lead_entitlements
    set used = used + 1,
        status = case when used + 1 >= allowance then 'exhausted' else status end,
        updated_at = now()
    where id = reservation_row.lead_entitlement_id and used < allowance
    returning used into new_used;
  else
    update public.studio_access_grants
    set used = used + 1,
        status = case when used + 1 >= allowance then 'exhausted' else status end,
        updated_at = now()
    where id = reservation_row.grant_id and used < allowance
    returning used into new_used;
  end if;
  if new_used is null then
    return query select p_concept_id, 'failed'::text, 'GENERATION_FAILED'::text;
    return;
  end if;

  update public.studio_generation_credit_reservations
  set state = 'consumed', settled_at = now()
  where id = reservation_row.id;
  update public.remodel_concepts
  set result_asset_id = p_result_asset_id, openai_request_id = p_openai_request_id,
      status = 'completed', error_code = null, updated_at = now()
  where id = p_concept_id;
  update public.remodel_projects
  set status = 'concepts_ready',
      business_stage = case when business_stage = 'studio_unlocked'
        then 'complimentary_concept_completed' else business_stage end,
      retention_expires_at = now() + interval '30 days', updated_at = now()
  where id = reservation_row.project_id
  returning * into project_row;

  insert into public.generation_events (
    project_id, owner_user_id, concept_id, event_type, normalized_code, reserved_cost_usd
  ) values (
    reservation_row.project_id, reservation_row.owner_user_id, p_concept_id,
    'completed', null, 0
  );
  insert into public.audit_events (subject_project_id, owner_user_id, event_type, metadata)
  values (reservation_row.project_id, reservation_row.owner_user_id, 'concept_generated',
    jsonb_build_object('concept_id', p_concept_id));

  return query select p_concept_id, 'completed'::text, null::text;
end;
$$;

revoke all on function public.br03_finalize_generation_success(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.br03_finalize_generation_success(uuid, uuid, text)
  to service_role;

create or replace function public.br03_finalize_generation_failure(
  p_concept_id uuid,
  p_error_code text
)
returns table (concept_id uuid, status text, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_row public.studio_generation_credit_reservations%rowtype;
  normalized_code text := case when p_error_code in ('MODERATION_BLOCKED', 'GENERATION_TIMEOUT', 'GENERATION_FAILED', 'UPLOAD_NOT_READY') then p_error_code else 'GENERATION_FAILED' end;
  failed_status text := case when p_error_code = 'MODERATION_BLOCKED' then 'blocked' else 'failed' end;
begin
  select * into reservation_row from public.studio_generation_credit_reservations
  where concept_id = p_concept_id for update;
  if not found then
    return query select p_concept_id, 'failed'::text, 'NOT_FOUND'::text;
    return;
  end if;
  if reservation_row.state = 'released' then
    return query select p_concept_id, failed_status, normalized_code;
    return;
  end if;
  if reservation_row.state = 'consumed' then
    return query select p_concept_id, 'completed'::text, null::text;
    return;
  end if;

  update public.studio_generation_credit_reservations
  set state = 'released', settled_at = now()
  where id = reservation_row.id;
  update public.remodel_concepts
  set status = failed_status, error_code = normalized_code, updated_at = now()
  where id = p_concept_id;
  insert into public.generation_events (
    project_id, owner_user_id, concept_id, event_type, normalized_code, reserved_cost_usd
  ) values (
    reservation_row.project_id, reservation_row.owner_user_id, p_concept_id,
    case when failed_status = 'blocked' then 'blocked' else 'failed' end,
    normalized_code, 0
  );

  return query select p_concept_id, failed_status, normalized_code;
end;
$$;

revoke all on function public.br03_finalize_generation_failure(uuid, text)
  from public, anon, authenticated;
grant execute on function public.br03_finalize_generation_failure(uuid, text)
  to service_role;

create or replace function public.br03_get_access_snapshot(
  p_project_id uuid,
  p_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  project_row public.remodel_projects%rowtype;
  lead_allowance bigint := 0;
  lead_used bigint := 0;
  lead_reserved bigint := 0;
  planning_allowance bigint := 0;
  planning_used bigint := 0;
  planning_reserved bigint := 0;
  active_allowance bigint := 0;
  active_used bigint := 0;
  active_reserved bigint := 0;
  pre_available bigint;
  active_available bigint;
begin
  select * into project_row from public.remodel_projects
  where id = p_project_id and owner_user_id = p_owner_user_id;
  if not found then return jsonb_build_object('error_code', 'NOT_FOUND'); end if;

  select coalesce(sum(allowance), 0), coalesce(sum(used), 0)
    into lead_allowance, lead_used
  from public.studio_lead_entitlements where project_id = p_project_id;
  select count(*) into lead_reserved from public.studio_generation_credit_reservations
  where project_id = p_project_id and credit_source = 'lead' and state = 'reserved';
  select coalesce(sum(allowance), 0), coalesce(sum(used), 0)
    into planning_allowance, planning_used
  from public.studio_access_grants
  where project_id = p_project_id and stage = 'planning' and status <> 'revoked';
  select count(*) into planning_reserved from public.studio_generation_credit_reservations r
  join public.studio_access_grants g on g.id = r.grant_id
  where r.project_id = p_project_id and r.state = 'reserved' and g.stage = 'planning';
  select coalesce(sum(allowance), 0), coalesce(sum(used), 0)
    into active_allowance, active_used
  from public.studio_access_grants
  where project_id = p_project_id and stage = 'active_project' and status <> 'revoked';
  select count(*) into active_reserved from public.studio_generation_credit_reservations r
  join public.studio_access_grants g on g.id = r.grant_id
  where r.project_id = p_project_id and r.state = 'reserved' and g.stage = 'active_project';

  pre_available := greatest(0, lead_allowance - lead_used - lead_reserved)
    + greatest(0, planning_allowance - planning_used - planning_reserved);
  active_available := greatest(0, active_allowance - active_used - active_reserved);

  return jsonb_build_object(
    'business_stage', project_row.business_stage,
    'pre_contract', jsonb_build_object(
      'lead_allowance', lead_allowance, 'lead_used', lead_used, 'lead_reserved', lead_reserved,
      'planning_grant_allowance', planning_allowance, 'planning_grant_used', planning_used,
      'planning_grant_reserved', planning_reserved, 'available', pre_available,
      'can_generate', pre_available > 0
    ),
    'active_project', jsonb_build_object(
      'allowance', active_allowance, 'used', active_used, 'reserved', active_reserved,
      'available', active_available, 'can_generate', active_available > 0
    ),
    'can_generate', case when pre_available > 0 or active_available > 0 then true else false end
  );
end;
$$;

revoke all on function public.br03_get_access_snapshot(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.br03_get_access_snapshot(uuid, uuid)
  to service_role;
