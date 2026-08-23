-- SCR-BR02-DEMO-001
-- Exactly one founder-authorized OpenAI demo attempt, available only after a
-- signature-verified Stripe test webhook grants the project's entitlement.

create table if not exists public.studio_generation_gates (
  gate_name text primary key,
  enabled boolean not null default false,
  max_attempts smallint not null check (max_attempts between 0 and 10),
  reserved_attempts smallint not null default 0 check (reserved_attempts >= 0 and reserved_attempts <= max_attempts),
  purpose text not null check (purpose = 'founder_demo'),
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.studio_generation_gates enable row level security;
revoke all on public.studio_generation_gates from public, anon, authenticated;
grant select, insert, update, delete on public.studio_generation_gates to service_role;

insert into public.studio_generation_gates (
  gate_name, enabled, max_attempts, reserved_attempts, purpose, opened_at, closed_at
) values (
  'founder_demo_20260823', true, 1, 0, 'founder_demo', now(), null
)
on conflict (gate_name) do update set
  enabled = case when public.studio_generation_gates.reserved_attempts = 0 then true else false end,
  max_attempts = 1,
  purpose = 'founder_demo',
  opened_at = case when public.studio_generation_gates.reserved_attempts = 0 then now() else public.studio_generation_gates.opened_at end,
  closed_at = case when public.studio_generation_gates.reserved_attempts = 0 then null else coalesce(public.studio_generation_gates.closed_at, now()) end,
  updated_at = now();

create or replace function public.br02_reserve_demo_generation(
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
  gate_row public.studio_generation_gates%rowtype;
  entitlement_row public.studio_entitlements%rowtype;
  reservation record;
begin
  select * into gate_row
  from public.studio_generation_gates
  where gate_name = 'founder_demo_20260823'
  for update;

  if not found or not gate_row.enabled or gate_row.reserved_attempts >= gate_row.max_attempts then
    return query select null::uuid, 'GENERATION_DISABLED'::text;
    return;
  end if;

  select * into entitlement_row
  from public.studio_entitlements
  where project_id = p_project_id
    and owner_user_id = p_owner_user_id
    and status = 'active'
    and used < allowance
  for update;

  if not found then
    return query select null::uuid, 'PAYMENT_REQUIRED'::text;
    return;
  end if;

  select * into reservation
  from public.br02_reserve_generation(
    p_project_id, p_owner_user_id, p_source_asset_id, p_ordinal,
    p_concept_direction, p_model, p_quality, p_image_size,
    p_prompt_version, p_prompt_hash, p_ip_hash, p_reserved_cost, p_monthly_budget
  );

  if reservation.concept_id is null then
    return query select null::uuid, coalesce(reservation.error_code, 'GENERATION_FAILED')::text;
    return;
  end if;

  update public.studio_entitlements
  set used = used + 1,
      status = case when used + 1 >= allowance then 'exhausted' else 'active' end,
      updated_at = now()
  where id = entitlement_row.id;

  update public.studio_generation_gates
  set reserved_attempts = reserved_attempts + 1,
      enabled = false,
      closed_at = now(),
      updated_at = now()
  where gate_name = gate_row.gate_name;

  return query select reservation.concept_id::uuid, null::text;
end;
$$;

revoke all on function public.br02_reserve_demo_generation(uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.br02_reserve_demo_generation(uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric)
  to service_role;

comment on table public.studio_generation_gates is
  'Fail-closed server-side generation gates. No secret material is stored here.';
comment on function public.br02_reserve_demo_generation(uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric) is
  'Atomically requires a verified Stripe test entitlement and consumes the single founder demo attempt before any provider call.';
