-- SCR-BR03-IMPLEMENTATION-001 G1
-- Progressive-access core schema for the Remodel Studio.
-- Repository-only additive migration. It is intentionally unapplied by this run.

-- Keep the technical generation status separate from the CRM/business lifecycle.
alter table public.remodel_projects
  add column if not exists business_stage text not null default 'studio_unlocked';

alter table public.remodel_projects
  drop constraint if exists remodel_projects_business_stage_check;
alter table public.remodel_projects
  add constraint remodel_projects_business_stage_check
  check (business_stage in (
    'inquiry_received',
    'studio_unlocked',
    'complimentary_concept_completed',
    'planning_contact',
    'planning_studio',
    'qualified_site_consultation',
    'site_consultation_completed',
    'estimate_preparation',
    'proposal_sent',
    'proposal_accepted',
    'deposit_due',
    'deposit_paid',
    'scheduled',
    'active_project',
    'completed',
    'closed'
  ));

create index if not exists remodel_projects_business_stage_idx
  on public.remodel_projects(business_stage, updated_at desc);

create index if not exists public_project_inquiries_studio_owner_idx
  on public.public_project_inquiries(studio_owner_user_id)
  where studio_owner_user_id is not null;

-- Make concept slots stage-aware. Existing concepts remain pre-contract and retain
-- the historical ordinal range; later protected server logic enforces per-stage caps.
alter table public.remodel_concepts
  add column if not exists access_stage text not null default 'pre_contract';

alter table public.remodel_concepts
  drop constraint if exists remodel_concepts_access_stage_check;
alter table public.remodel_concepts
  add constraint remodel_concepts_access_stage_check
  check (access_stage in ('pre_contract', 'active_project'));

alter table public.remodel_concepts
  drop constraint if exists remodel_concepts_ordinal_check;
alter table public.remodel_concepts
  add constraint remodel_concepts_ordinal_check
  check (ordinal >= 1);

alter table public.remodel_concepts
  drop constraint if exists remodel_concepts_project_id_ordinal_key;
alter table public.remodel_concepts
  add constraint remodel_concepts_project_stage_ordinal_key
  unique (project_id, access_stage, ordinal);

create index if not exists remodel_concepts_project_stage_idx
  on public.remodel_concepts(project_id, access_stage, ordinal);

-- Existing hosted deployments may already have payment_orders; this repository
-- does not recreate that ledger. Extend it only when present at apply time.
do $$
begin
  if to_regclass('public.payment_orders') is not null then
    alter table public.payment_orders
      add column if not exists commercial_terms_id uuid;

    alter table public.payment_orders
      drop constraint if exists payment_orders_purpose_check;
    alter table public.payment_orders
      add constraint payment_orders_purpose_check
      check (purpose in (
        'studio_pass',
        'remodeling_deposit',
        'project_deposit',
        'planning_measurement_reservation'
      ));
  end if;
end;
$$;

create table if not exists public.studio_access_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('planning', 'active_project')),
  source text not null check (source in ('staff', 'project_deposit')),
  allowance smallint not null,
  used smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'exhausted', 'revoked')),
  granted_by_user_id uuid references auth.users(id) on delete set null,
  payment_order_id uuid,
  reason_code text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'staff' and allowance in (1, 2))
    or (source = 'project_deposit' and stage = 'active_project' and allowance = 3)
  ),
  check (used >= 0 and used <= allowance),
  check (source = 'staff' or payment_order_id is not null)
);

create unique index if not exists studio_access_grants_project_deposit_order_idx
  on public.studio_access_grants(payment_order_id)
  where source = 'project_deposit';
create index if not exists studio_access_grants_project_active_idx
  on public.studio_access_grants(project_id, stage, status, expires_at);
create index if not exists studio_access_grants_owner_idx
  on public.studio_access_grants(owner_user_id, stage, status);
create index if not exists studio_access_grants_payment_order_idx
  on public.studio_access_grants(payment_order_id)
  where payment_order_id is not null;
create trigger studio_access_grants_set_updated_at
before update on public.studio_access_grants
for each row execute function public.br02_set_updated_at();

do $$
begin
  if to_regclass('public.payment_orders') is not null
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.studio_access_grants'::regclass
        and conname = 'studio_access_grants_payment_order_fk'
    ) then
    alter table public.studio_access_grants
      add constraint studio_access_grants_payment_order_fk
      foreign key (payment_order_id)
      references public.payment_orders(id)
      on delete restrict;
  end if;
end;
$$;

create table if not exists public.studio_generation_credit_reservations (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null unique references public.remodel_concepts(id) on delete cascade,
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  credit_source text not null check (credit_source in ('lead', 'grant')),
  lead_entitlement_id uuid references public.studio_lead_entitlements(id) on delete restrict,
  grant_id uuid references public.studio_access_grants(id) on delete restrict,
  state text not null default 'reserved' check (state in ('reserved', 'consumed', 'released')),
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  check (
    (credit_source = 'lead' and lead_entitlement_id is not null and grant_id is null)
    or (credit_source = 'grant' and lead_entitlement_id is null and grant_id is not null)
  ),
  check ((state = 'reserved' and settled_at is null) or (state <> 'reserved' and settled_at is not null))
);

create index if not exists studio_generation_reservations_project_idx
  on public.studio_generation_credit_reservations(project_id, state, reserved_at desc);
create index if not exists studio_generation_reservations_owner_idx
  on public.studio_generation_credit_reservations(owner_user_id, state, reserved_at desc);
create index if not exists studio_generation_reservations_lead_idx
  on public.studio_generation_credit_reservations(lead_entitlement_id)
  where lead_entitlement_id is not null;
create index if not exists studio_generation_reservations_grant_idx
  on public.studio_generation_credit_reservations(grant_id)
  where grant_id is not null;

create table if not exists public.studio_staff_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (char_length(note) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_staff_notes_project_idx
  on public.studio_staff_notes(project_id, created_at desc);
create index if not exists studio_staff_notes_author_idx
  on public.studio_staff_notes(author_user_id, created_at desc);
create trigger studio_staff_notes_set_updated_at
before update on public.studio_staff_notes
for each row execute function public.br02_set_updated_at();

create table if not exists public.project_commercial_terms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  version smallint not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'accepted', 'superseded', 'cancelled')),
  contract_reference text not null check (char_length(contract_reference) between 1 and 240),
  contract_total_cents bigint not null check (contract_total_cents > 0),
  deposit_amount_cents bigint not null check (deposit_amount_cents > 0),
  deposit_basis_points integer check (deposit_basis_points is null or deposit_basis_points between 1 and 10000),
  accepted_at timestamptz,
  approved_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);
create index if not exists project_commercial_terms_project_version_idx
  on public.project_commercial_terms(project_id, version desc);
create index if not exists project_commercial_terms_accepted_idx
  on public.project_commercial_terms(project_id, accepted_at desc)
  where status = 'accepted';
create trigger project_commercial_terms_set_updated_at
before update on public.project_commercial_terms
for each row execute function public.br02_set_updated_at();

create table if not exists public.project_pricing_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  direct_job_cost_cents bigint not null check (direct_job_cost_cents > 0),
  verified_competitor_price_cents bigint check (verified_competitor_price_cents is null or verified_competitor_price_cents > 0),
  comparator_note text,
  comparable_scope_verified boolean not null default false,
  target_discount_basis_points integer not null default 500 check (target_discount_basis_points between 0 and 10000),
  minimum_gross_margin_basis_points integer not null default 3000 check (minimum_gross_margin_basis_points between 0 and 9999),
  competitor_target_cents bigint generated always as (
    case when verified_competitor_price_cents is null then null
      else floor(verified_competitor_price_cents * (10000 - target_discount_basis_points) / 10000.0)::bigint end
  ) stored,
  margin_floor_cents bigint generated always as (
    ceil(direct_job_cost_cents / ((10000 - minimum_gross_margin_basis_points) / 10000.0))::bigint
  ) stored,
  internal_target_cents bigint generated always as (
    case when comparable_scope_verified and verified_competitor_price_cents is not null
      and floor(verified_competitor_price_cents * (10000 - target_discount_basis_points) / 10000.0)
        >= ceil(direct_job_cost_cents / ((10000 - minimum_gross_margin_basis_points) / 10000.0))
      then floor(verified_competitor_price_cents * (10000 - target_discount_basis_points) / 10000.0)::bigint
      else ceil(direct_job_cost_cents / ((10000 - minimum_gross_margin_basis_points) / 10000.0))::bigint
    end
  ) stored,
  meets_five_percent_target boolean generated always as (
    comparable_scope_verified
    and verified_competitor_price_cents is not null
    and floor(verified_competitor_price_cents * (10000 - target_discount_basis_points) / 10000.0)
      >= ceil(direct_job_cost_cents / ((10000 - minimum_gross_margin_basis_points) / 10000.0))
  ) stored,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists project_pricing_assessments_project_idx
  on public.project_pricing_assessments(project_id, created_at desc);
create index if not exists project_pricing_assessments_author_idx
  on public.project_pricing_assessments(author_user_id, created_at desc);

do $$
begin
  if to_regclass('public.payment_orders') is not null
    and not exists (
      select 1 from pg_constraint
      where conrelid = 'public.payment_orders'::regclass
        and conname = 'payment_orders_commercial_terms_fk'
    ) then
    alter table public.payment_orders
      add constraint payment_orders_commercial_terms_fk
      foreign key (commercial_terms_id)
      references public.project_commercial_terms(id)
      on delete restrict;
  end if;
end;
$$;

-- All new operational tables are service/staff-side only in G1. No browser policies.
alter table public.studio_access_grants enable row level security;
alter table public.studio_generation_credit_reservations enable row level security;
alter table public.studio_staff_notes enable row level security;
alter table public.project_commercial_terms enable row level security;
alter table public.project_pricing_assessments enable row level security;

revoke all on public.studio_access_grants from public, anon, authenticated;
revoke all on public.studio_generation_credit_reservations from public, anon, authenticated;
revoke all on public.studio_staff_notes from public, anon, authenticated;
revoke all on public.project_commercial_terms from public, anon, authenticated;
revoke all on public.project_pricing_assessments from public, anon, authenticated;
grant all on public.studio_access_grants to service_role;
grant all on public.studio_generation_credit_reservations to service_role;
grant all on public.studio_staff_notes to service_role;
grant all on public.project_commercial_terms to service_role;
grant all on public.project_pricing_assessments to service_role;

comment on table public.studio_access_grants is 'BR03 staff/deposit-controlled Studio concept allowances; service-side only.';
comment on table public.studio_generation_credit_reservations is 'BR03 atomic customer-credit reservations; settlement occurs only after successful delivery.';
comment on table public.studio_staff_notes is 'BR03 private staff planning notes; never customer-readable.';
comment on table public.project_commercial_terms is 'BR03 exact server-authorized commercial terms; deposit percentage remains provisional.';
comment on table public.project_pricing_assessments is 'BR03 internal pricing intelligence; margin floor controls competitive targeting.';
