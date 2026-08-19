-- SCR-BR02 advisor hardening after first hosted migration.
-- Fixes material performance findings without broadening client access.

-- RLS init-plan optimization: evaluate auth.uid() once per statement.
drop policy if exists "br02_projects_read_own" on public.remodel_projects;
create policy "br02_projects_read_own"
on public.remodel_projects for select
to authenticated
using (owner_user_id = (select auth.uid()));

drop policy if exists "br02_concepts_read_own" on public.remodel_concepts;
create policy "br02_concepts_read_own"
on public.remodel_concepts for select
to authenticated
using (owner_user_id = (select auth.uid()));

drop policy if exists "br02_reviews_read_own_project" on public.buildability_reviews;
create policy "br02_reviews_read_own_project"
on public.buildability_reviews for select
to authenticated
using (
  exists (
    select 1 from public.remodel_projects p
    where p.id = buildability_reviews.project_id
      and p.owner_user_id = (select auth.uid())
  )
);

-- Cover foreign keys used by deletion, joins, and lifecycle queries.
create index if not exists buildability_reviews_project_idx
  on public.buildability_reviews(project_id);
create index if not exists buildability_reviews_reviewer_idx
  on public.buildability_reviews(reviewer_user_id);
create index if not exists generation_events_project_idx
  on public.generation_events(project_id);
create index if not exists generation_events_concept_idx
  on public.generation_events(concept_id);
create index if not exists remodel_concepts_source_asset_idx
  on public.remodel_concepts(source_asset_id);
create index if not exists remodel_concepts_result_asset_idx
  on public.remodel_concepts(result_asset_id);
create index if not exists remodel_projects_selected_concept_idx
  on public.remodel_projects(selected_concept_id)
  where selected_concept_id is not null;

-- NOTE: remodel_assets, generation_events, and audit_events intentionally retain
-- RLS with zero client policies. PostgreSQL therefore denies client access by
-- default; service-side Edge Functions are the only intended access path.