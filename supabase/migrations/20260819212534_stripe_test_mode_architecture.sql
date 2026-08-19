-- SCR-STRIPE-TEST-001
-- Fail-closed Stripe test-mode records. No live charge or deposit path is authorized.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.remodel_projects(id) on delete cascade,
  purpose text not null check (purpose in ('studio_pass','remodeling_deposit')),
  mode text not null default 'test' check (mode = 'test'),
  currency text not null default 'usd' check (currency = 'usd'),
  amount_cents bigint not null check (amount_cents > 0),
  quantity smallint not null default 1 check (quantity = 1),
  allowance smallint check (allowance is null or allowance between 1 and 20),
  status text not null default 'created' check (status in ('created','checkout_created','paid','canceled','failed','refunded','disputed')),
  client_request_id uuid not null,
  stripe_price_id text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (owner_user_id, client_request_id)
);

create index if not exists payment_orders_owner_idx on public.payment_orders(owner_user_id, created_at desc);
create index if not exists payment_orders_project_idx on public.payment_orders(project_id, created_at desc);

create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.br02_set_updated_at();

create table if not exists public.payment_events (
  stripe_event_id text primary key,
  order_id uuid references public.payment_orders(id) on delete set null,
  event_type text not null,
  mode text not null default 'test' check (mode = 'test'),
  livemode boolean not null check (livemode = false),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null default 'received' check (processing_status in ('received','processing','processed','failed')),
  attempts smallint not null default 0 check (attempts >= 0),
  normalized_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payment_events_order_idx on public.payment_events(order_id, received_at desc);

create table if not exists public.studio_entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  allowance smallint not null check (allowance between 1 and 20),
  used smallint not null default 0 check (used >= 0 and used <= allowance),
  status text not null default 'active' check (status in ('active','exhausted','revoked','refunded','disputed')),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists studio_entitlements_active_project_idx
  on public.studio_entitlements(project_id)
  where status in ('active','exhausted');

create trigger studio_entitlements_set_updated_at
before update on public.studio_entitlements
for each row execute function public.br02_set_updated_at();

alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.studio_entitlements enable row level security;

-- Service-side functions own all payment and entitlement writes. Browser roles
-- receive no direct table policies and cannot treat a redirect as payment proof.
revoke all on public.payment_orders from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
revoke all on public.studio_entitlements from anon, authenticated;
grant select, insert, update, delete on public.payment_orders to service_role;
grant select, insert, update, delete on public.payment_events to service_role;
grant select, insert, update, delete on public.studio_entitlements to service_role;

comment on table public.payment_orders is 'Stripe test-mode order snapshots. Remodeling deposits remain disabled.';
comment on table public.payment_events is 'Signature-verified Stripe test event idempotency records; raw payloads are not stored.';
comment on table public.studio_entitlements is 'Studio access granted only after verified Stripe test webhook processing.';
