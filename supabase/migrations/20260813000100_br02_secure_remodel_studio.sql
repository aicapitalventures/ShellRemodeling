-- SCR-BR02-001 / SCR-BR02-DATA-001
-- Shell & Co Remodel Studio secure proof schema.
-- TEST DATA ONLY until production gates are opened.

create extension if not exists pgcrypto;

create or replace function public.br02_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.remodel_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_type text not null check (char_length(project_type) between 2 and 120),
  planning_budget text not null default 'Not sure yet',
  timing text,
  property_status text,
  source_truth text not null default '',
  preserve_items jsonb not null default '[]'::jsonb check (jsonb_typeof(preserve_items) = 'array'),
  change_items jsonb not null default '[]'::jsonb check (jsonb_typeof(change_items) = 'array'),
  must_have_items jsonb not null default '[]'::jsonb check (jsonb_typeof(must_have_items) = 'array'),
  design_direction text not null default 'Clean Modern',
  vision_notes text not null default '',
  accessibility_requirements text not null default '',
  status text not null default 'draft' check (status in ('draft','source_ready','concepts_ready','selected','reviewed','deleted')),
  selected_concept_id uuid,
  retention_expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists remodel_projects_owner_idx on public.remodel_projects(owner_user_id, created_at desc);
create index if not exists remodel_projects_retention_idx on public.remodel_projects(retention_expires_at) where status <> 'deleted';

create trigger remodel_projects_set_updated_at
before update on public.remodel_projects
for each row execute function public.br02_set_updated_at();

create table if not exists public.remodel_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('source','concept')),
  bucket text not null check (bucket in ('remodel-source-private','remodel-results-private')),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes bigint,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  validation_status text not null default 'pending' check (validation_status in ('pending','ready','rejected','deleted')),
  rejection_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists remodel_assets_project_idx on public.remodel_assets(project_id, created_at);
create index if not exists remodel_assets_owner_idx on public.remodel_assets(owner_user_id, created_at desc);

create trigger remodel_assets_set_updated_at
before update on public.remodel_assets
for each row execute function public.br02_set_updated_at();

create table if not exists public.remodel_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_asset_id uuid not null references public.remodel_assets(id) on delete restrict,
  result_asset_id uuid references public.remodel_assets(id) on delete set null,
  ordinal smallint not null check (ordinal between 1 and 4),
  concept_direction text not null,
  model text not null default 'gpt-image-2',
  quality text not null default 'medium' check (quality in ('low','medium','high')),
  image_size text not null default '1536x1024',
  prompt_version text not null default 'SCR-BR02-PROMPT-001-v1.0',
  prompt_hash text not null check (prompt_hash ~ '^[0-9a-f]{64}$'),
  openai_request_id text,
  status text not null default 'queued' check (status in ('queued','generating','completed','blocked','failed','deleted')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, ordinal)
);

create index if not exists remodel_concepts_owner_idx on public.remodel_concepts(owner_user_id, created_at desc);
create index if not exists remodel_concepts_project_idx on public.remodel_concepts(project_id, ordinal);

create trigger remodel_concepts_set_updated_at
before update on public.remodel_concepts
for each row execute function public.br02_set_updated_at();

alter table public.remodel_projects
  drop constraint if exists remodel_projects_selected_concept_fk;
alter table public.remodel_projects
  add constraint remodel_projects_selected_concept_fk
  foreign key (selected_concept_id) references public.remodel_concepts(id) on delete set null;

create table if not exists public.buildability_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.remodel_projects(id) on delete cascade,
  concept_id uuid not null references public.remodel_concepts(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('green','yellow','red')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(concept_id)
);

create trigger buildability_reviews_set_updated_at
before update on public.buildability_reviews
for each row execute function public.br02_set_updated_at();

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.remodel_projects(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  concept_id uuid references public.remodel_concepts(id) on delete set null,
  ip_hash text,
  event_type text not null check (event_type in ('attempt','completed','blocked','failed')),
  normalized_code text,
  reserved_cost_usd numeric(10,4) not null default 0 check (reserved_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists generation_events_owner_time_idx on public.generation_events(owner_user_id, created_at desc);
create index if not exists generation_events_ip_time_idx on public.generation_events(ip_hash, created_at desc) where ip_hash is not null;
create index if not exists generation_events_month_idx on public.generation_events(created_at desc);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  subject_project_id uuid,
  owner_user_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_project_idx on public.audit_events(subject_project_id, created_at desc);

-- RLS: all writes are intended to flow through authenticated Edge Functions
-- using the service role after validating the caller's JWT. Customer sessions
-- receive only limited read policies for their own non-secret project data.
alter table public.remodel_projects enable row level security;
alter table public.remodel_assets enable row level security;
alter table public.remodel_concepts enable row level security;
alter table public.buildability_reviews enable row level security;
alter table public.generation_events enable row level security;
alter table public.audit_events enable row level security;

-- No INSERT/UPDATE/DELETE policy is granted to client roles.
drop policy if exists "br02_projects_read_own" on public.remodel_projects;
create policy "br02_projects_read_own"
on public.remodel_projects for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "br02_concepts_read_own" on public.remodel_concepts;
create policy "br02_concepts_read_own"
on public.remodel_concepts for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "br02_reviews_read_own_project" on public.buildability_reviews;
create policy "br02_reviews_read_own_project"
on public.buildability_reviews for select
to authenticated
using (
  exists (
    select 1 from public.remodel_projects p
    where p.id = buildability_reviews.project_id
      and p.owner_user_id = auth.uid()
  )
);

-- remodel_assets, generation_events, and audit_events intentionally have no
-- client policies. They are service-side only in BR02.

-- Private Storage buckets. No public Storage policies are created: objects are
-- accessed through server-issued signed upload/download authorization.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('remodel-source-private','remodel-source-private',false,6291456,array['image/jpeg','image/png','image/webp']),
  ('remodel-results-private','remodel-results-private',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Do not create broad storage.objects policies. Signed URLs/tokens are issued
-- only by Edge Functions after ownership checks.

comment on table public.remodel_projects is 'SCR-BR02 test/prod project state; no direct customer PII in BR02 proof.';
comment on table public.remodel_assets is 'Private source/result provenance; storage object paths are server-side.';
comment on table public.remodel_concepts is 'AI concept provenance. Raw compiled prompts are intentionally not stored.';
comment on table public.buildability_reviews is 'Human-only controlling GREEN/YELLOW/RED review.';
comment on table public.generation_events is 'Non-PII application quota and budget-control events.';
comment on table public.audit_events is 'Minimal lifecycle audit/tombstones; no raw prompt/photo/PII.';
