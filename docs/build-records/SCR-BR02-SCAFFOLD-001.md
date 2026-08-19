# SCR-BR02-SCAFFOLD-001 — Secure Backend Proof Scaffold Implementation Record v1.0

**Record ID:** SCR-BR02-SCAFFOLD-001  
**Version:** 1.0  
**Status:** SCAFFOLD COMPLETE — CLOUD EXECUTION / VALIDATION PENDING  
**Effective date:** 2026-08-12  
**Branch:** `build/02-secure-remodel-studio`  
**Dependencies:** SCR-BR02-001 v1.0, SCR-BR02-DATA-001 v1.0, SCR-BR02-PROMPT-001 v1.0, SCR-BR02-TEST-001 v1.0, SCR-AIVIS-001 v0.2  

## Implemented Repository Scaffold

Governance/config:

- `docs/build-records/SCR-BR02-001.md`
- `docs/build-records/SCR-BR02-TEST-001.md`
- `docs/policies/SCR-BR02-DATA-001.md`
- `docs/website/SCR-BR02-PROMPT-001.md`
- `docs/website/SCR-AIVIS-001.md` v0.2 synchronization
- `.env.example`
- `supabase/config.toml`
- `supabase/README-BR02.md`

Database/storage:

- `supabase/migrations/20260813000100_br02_secure_remodel_studio.sql`
- private source/result bucket definitions
- Postgres provenance schema
- RLS customer-read boundaries
- no direct client write policies

Edge Function scaffold:

- `_shared/core.ts` — auth, CORS, hashing, image signature validation, safe error helpers
- `_shared/prompt.ts` — SCR-BR02-PROMPT-001 compiler
- `create-project`
- `create-upload`
- `finalize-upload`
- `generate-concept`
- `get-concept`
- `select-concept`
- `review-concept`
- `delete-project`
- `purge-expired`

## Security Defaults

- OpenAI disabled unless `BR02_OPENAI_ENABLED=true`.
- Kill switch closed unless `BR02_KILL_SWITCH=false`.
- No secret values in repository.
- No actual Supabase project reference in source.
- No customer PII fields used in proof project creation.
- Private object storage only.
- Signed result retrieval defaults to 60 seconds.
- Initial source-image proof limit: 6 MiB JPEG/PNG/WEBP.
- Actual uploaded bytes are re-read and validated before `ready` status.
- GPT generation shares one total 120-second proof deadline across retries; no retry may extend the function beyond that application deadline.
- Raw IP is not persisted; HMAC-derived IP hash only when configured.
- Raw compiled prompts are not stored.
- Staff human review requires Auth `app_metadata.shell_role` = `reviewer` or `admin`.

## Current Verification

Repository comparison to locked Build Room 01 base `d80821ef9286a09a694577358a28dbff93cb9526` shows the BR02 branch is ahead only by Build Room 02 records/config/schema/function work and the BR02-only update of SCR-AIVIS-001. Build Room 01 website files remain inherited unchanged.

The scaffold has **not** been deployed or executed in a Shell & Co Supabase project because no dedicated Shell & Co project exists yet. Static repository presence is not evidence that migrations compile, RLS behaves correctly, functions deploy, or the OpenAI call succeeds. Those claims require execution under SCR-BR02-TEST-001.

## Supabase Separation Finding

The connected Supabase account contains an unrelated `Voice to Legacy Lead Funnel` project. It was inspected only to determine whether a Shell & Co project already existed. It is not authorized for Shell & Co and was not modified.

A dedicated Shell & Co project must be created after founder cost confirmation.

## Gate Impact

### OPEN

- dedicated Supabase project cost review/creation;
- migration deployment into that isolated project;
- RLS/private-storage proof;
- synthetic upload/finalize/deletion tests;
- dedicated OpenAI key setup and one controlled synthetic generation after pre-OpenAI tests pass.

### CLOSED

- real customer PII/photos;
- public frontend connection to BR02 backend;
- production lead routing;
- production OpenAI generation;
- custom-domain deployment;
- merge to main.

## Next Best Action

Obtain founder confirmation to create the dedicated Shell & Co Supabase project in the connected AICV organization after the current Supabase project cost is displayed and acknowledged. Then apply the migration and execute T02–T06 with the OpenAI kill switch closed.
