-- SCR-BR03 hotfix reconciliation: qualify settlement RPC column references
-- Mirrors the verified hosted br03_finalize_generation_success/failure definitions after G5.6 repair.

create or replace function public.br03_finalize_generation_success(
  p_concept_id uuid,
  p_result_asset_id uuid,
  p_openai_request_id text default null::text
)
returns table(concept_id uuid, status text, error_code text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  reservation_row public.studio_generation_credit_reservations%rowtype;
  concept_row public.remodel_concepts%rowtype;
  result_asset public.remodel_assets%rowtype;
  project_row public.remodel_projects%rowtype;
  new_used smallint;
begin
  select * into reservation_row
  from public.studio_generation_credit_reservations r
  where r.concept_id = p_concept_id
  for update;
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

  select * into concept_row
  from public.remodel_concepts c
  where c.id = p_concept_id
  for update;

  select * into result_asset
  from public.remodel_assets a
  where a.id = p_result_asset_id
    and a.project_id = reservation_row.project_id
    and a.owner_user_id = reservation_row.owner_user_id
    and a.kind = 'concept';
  if not found or result_asset.validation_status <> 'ready' then
    return query select p_concept_id, 'failed'::text, 'GENERATION_FAILED'::text;
    return;
  end if;

  if reservation_row.credit_source = 'lead' then
    update public.studio_lead_entitlements l
    set used = l.used + 1,
        status = case when l.used + 1 >= l.allowance then 'exhausted' else l.status end,
        updated_at = now()
    where l.id = reservation_row.lead_entitlement_id
      and l.used < l.allowance
    returning l.used into new_used;
  else
    update public.studio_access_grants g
    set used = g.used + 1,
        status = case when g.used + 1 >= g.allowance then 'exhausted' else g.status end,
        updated_at = now()
    where g.id = reservation_row.grant_id
      and g.used < g.allowance
    returning g.used into new_used;
  end if;
  if new_used is null then
    return query select p_concept_id, 'failed'::text, 'GENERATION_FAILED'::text;
    return;
  end if;

  update public.studio_generation_credit_reservations r
  set state = 'consumed', settled_at = now()
  where r.id = reservation_row.id;

  update public.remodel_concepts c
  set result_asset_id = p_result_asset_id,
      openai_request_id = p_openai_request_id,
      status = 'completed',
      error_code = null,
      updated_at = now()
  where c.id = p_concept_id;

  update public.remodel_projects p
  set status = 'concepts_ready',
      business_stage = case when p.business_stage = 'studio_unlocked'
        then 'complimentary_concept_completed' else p.business_stage end,
      retention_expires_at = now() + interval '30 days',
      updated_at = now()
  where p.id = reservation_row.project_id
  returning p.* into project_row;

  insert into public.generation_events (
    project_id, owner_user_id, concept_id, event_type, normalized_code, reserved_cost_usd
  ) values (
    reservation_row.project_id, reservation_row.owner_user_id, p_concept_id,
    'completed', null, 0
  );

  insert into public.audit_events (subject_project_id, owner_user_id, event_type, metadata)
  values (
    reservation_row.project_id,
    reservation_row.owner_user_id,
    'concept_generated',
    jsonb_build_object('concept_id', p_concept_id)
  );

  return query select p_concept_id, 'completed'::text, null::text;
end;
$function$;

create or replace function public.br03_finalize_generation_failure(
  p_concept_id uuid,
  p_error_code text
)
returns table(concept_id uuid, status text, error_code text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  reservation_row public.studio_generation_credit_reservations%rowtype;
  normalized_code text := case when p_error_code in ('MODERATION_BLOCKED', 'GENERATION_TIMEOUT', 'GENERATION_FAILED', 'UPLOAD_NOT_READY') then p_error_code else 'GENERATION_FAILED' end;
  failed_status text := case when p_error_code = 'MODERATION_BLOCKED' then 'blocked' else 'failed' end;
begin
  select * into reservation_row
  from public.studio_generation_credit_reservations r
  where r.concept_id = p_concept_id
  for update;
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
$function$;

revoke all on function public.br03_finalize_generation_success(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.br03_finalize_generation_success(uuid,uuid,text) to service_role;

revoke all on function public.br03_finalize_generation_failure(uuid,text) from public, anon, authenticated;
grant execute on function public.br03_finalize_generation_failure(uuid,text) to service_role;
