-- SCR-BR03 hosted-parity reconstruction
-- Restores the production-hosted 20260823142733_free_concept_lead_entitlement
-- schema/function behavior to repository authority using direct Supabase control-plane evidence.
-- Repository only: this file is NOT applied by this commit.

alter table public.public_project_inquiries
  add column if not exists studio_unlock_token_hash text,
  add column if not exists studio_unlock_expires_at timestamptz,
  add column if not exists studio_unlocked_at timestamptz,
  add column if not exists studio_owner_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists public_project_inquiries_studio_token_idx
  on public.public_project_inquiries (studio_unlock_token_hash)
  where studio_unlock_token_hash is not null;

create table if not exists public.studio_lead_entitlements (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references public.public_project_inquiries(id) on delete cascade,
  project_id uuid not null unique references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  allowance smallint not null default 1 check (allowance = 1),
  used smallint not null default 0 check (used >= 0 and used <= allowance),
  status text not null default 'active' check (status in ('active', 'exhausted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_lead_entitlements enable row level security;

revoke all on public.studio_lead_entitlements from public, anon, authenticated;
grant select, insert, update, delete on public.studio_lead_entitlements to service_role;

create index if not exists studio_lead_entitlements_owner_idx
  on public.studio_lead_entitlements(owner_user_id);

comment on table public.studio_lead_entitlements is
  'One complimentary concept entitlement granted after a validated estimate inquiry. No direct browser access.';

create or replace function public.br02_claim_free_concept(
  p_token_hash text,
  p_project_id uuid,
  p_owner_user_id uuid
)
returns table (entitlement_id uuid, error_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inquiry_row public.public_project_inquiries%rowtype;
  new_entitlement_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    return query select null::uuid, 'FREE_CONCEPT_NOT_AVAILABLE'::text;
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
    and studio_unlock_expires_at > now()
    and studio_unlocked_at is null
  for update;

  if not found then
    return query select null::uuid, 'FREE_CONCEPT_NOT_AVAILABLE'::text;
    return;
  end if;

  update public.public_project_inquiries
  set studio_unlocked_at = now(), studio_owner_user_id = p_owner_user_id
  where id = inquiry_row.id;

  insert into public.studio_lead_entitlements (
    inquiry_id, project_id, owner_user_id, allowance, used, status
  ) values (
    inquiry_row.id, p_project_id, p_owner_user_id, 1, 0, 'active'
  ) returning id into new_entitlement_id;

  return query select new_entitlement_id, null::text;
end;
$$;

revoke all on function public.br02_claim_free_concept(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.br02_claim_free_concept(text, uuid, uuid)
  to service_role;

create or replace function public.br02_reserve_free_generation(
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
  entitlement_row public.studio_lead_entitlements%rowtype;
  reservation record;
begin
  if p_ordinal <> 1 then
    return query select null::uuid, 'CONCEPT_LIMIT_REACHED'::text;
    return;
  end if;

  select * into entitlement_row
  from public.studio_lead_entitlements
  where project_id = p_project_id
    and owner_user_id = p_owner_user_id
    and status = 'active'
    and used < allowance
  for update;

  if not found then
    return query select null::uuid, 'FREE_CONCEPT_NOT_AVAILABLE'::text;
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

  update public.studio_lead_entitlements
  set used = 1, status = 'exhausted', updated_at = now()
  where id = entitlement_row.id;

  return query select reservation.concept_id::uuid, null::text;
end;
$$;

revoke all on function public.br02_reserve_free_generation(
  uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.br02_reserve_free_generation(
  uuid, uuid, uuid, smallint, text, text, text, text, text, text, text, numeric, numeric
) to service_role;
