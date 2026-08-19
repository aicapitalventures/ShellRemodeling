-- SCR-PUBLIC-LAUNCH-001
-- Private, nonbinding project-inquiry intake for the public marketing launch.

create table if not exists public.public_project_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 40),
  email text not null default '' check (char_length(email) <= 254),
  project_zip text not null check (project_zip ~ '^[0-9A-Za-z -]{3,12}$'),
  project_type text not null check (char_length(project_type) between 2 and 120),
  planning_budget text not null default 'Not sure yet' check (char_length(planning_budget) <= 80),
  desired_timing text not null default 'Just planning' check (char_length(desired_timing) <= 80),
  property_status text not null default '' check (char_length(property_status) <= 160),
  project_message text not null default '' check (char_length(project_message) <= 2000),
  contact_consent boolean not null check (contact_consent = true),
  marketing_consent boolean not null default false,
  source text not null default 'public_website' check (source = 'public_website'),
  status text not null default 'new' check (status in ('new','contacted','qualified','closed','spam','deleted')),
  dedupe_hash text not null check (dedupe_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent text not null default '' check (char_length(user_agent) <= 300),
  retention_expires_at timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_project_inquiries_created_idx
  on public.public_project_inquiries(created_at desc);
create index if not exists public_project_inquiries_status_idx
  on public.public_project_inquiries(status, created_at desc);
create index if not exists public_project_inquiries_dedupe_idx
  on public.public_project_inquiries(dedupe_hash, created_at desc);
create index if not exists public_project_inquiries_ip_idx
  on public.public_project_inquiries(ip_hash, created_at desc);
create index if not exists public_project_inquiries_retention_idx
  on public.public_project_inquiries(retention_expires_at);

create trigger public_project_inquiries_set_updated_at
before update on public.public_project_inquiries
for each row execute function public.br02_set_updated_at();

alter table public.public_project_inquiries enable row level security;

-- No client policies are created. Only the validated Edge Function service
-- role may write or read inquiry records.
comment on table public.public_project_inquiries is
  'Private nonbinding public website inquiries. No direct browser access; service-side validation required.';
