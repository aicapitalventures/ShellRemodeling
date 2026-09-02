-- SCR-BR04-G1B private lead response and qualification operations.
-- Repository-only additive migration. Do not apply without a separate deployment gate.

create table if not exists public.lead_operations (
  inquiry_id uuid primary key references public.public_project_inquiries(id) on delete cascade,
  lead_owner text check (lead_owner is null or lead_owner in ('bernard', 'elijah')),
  contact_status text not null default 'not_attempted' check (contact_status in ('not_attempted', 'attempted', 'connected', 'no_response')),
  contact_attempt_count smallint not null default 0 check (contact_attempt_count >= 0),
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  last_contact_method text check (last_contact_method is null or last_contact_method in ('phone', 'text', 'email')),
  qualification_status text not null default 'pending' check (qualification_status in ('pending', 'qualified', 'unqualified')),
  disposition_reason text check (disposition_reason is null or char_length(disposition_reason) <= 500),
  site_review_status text not null default 'not_needed' check (site_review_status in ('not_needed', 'recommended', 'scheduled', 'completed', 'declined')),
  site_review_at timestamptz,
  estimate_status text not null default 'not_started' check (estimate_status in ('not_started', 'preparing', 'sent', 'accepted', 'declined')),
  estimate_follow_up_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lead_operations_set_updated_at
before update on public.lead_operations
for each row execute function public.br02_set_updated_at();

alter table public.lead_operations enable row level security;
revoke all on public.lead_operations from public, anon, authenticated;
grant select, insert, update, delete on public.lead_operations to service_role;

comment on table public.lead_operations is
  'Private lead-response workflow state. No direct browser access; only authenticated Edge Function service role access.';