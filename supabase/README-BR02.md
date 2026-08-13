# Shell & Co Remodel Studio™ — BR02 Supabase Proof Scaffold

**Status:** Scaffold only. No Shell & Co Supabase project has been created by this branch. No real customer data is authorized.

## Architecture

GitHub Pages → Supabase Auth/JWT → Edge Functions → private Postgres/Storage → OpenAI server-side → private result → short-lived signed retrieval.

## Included

- `migrations/20260813000100_br02_secure_remodel_studio.sql`
- `_shared/core.ts`
- `_shared/prompt.ts`
- `create-project`
- `create-upload`
- `finalize-upload`
- `generate-concept`
- `get-concept`
- `select-concept`
- `review-concept`
- `delete-project`
- `purge-expired`

## Activation Order

1. Create a **dedicated Shell & Co** Supabase project after founder cost confirmation. Do not reuse another venture's project.
2. Link this branch/config to that project.
3. Apply the BR02 migration.
4. Run Supabase security and performance advisors and remediate material findings.
5. Enable anonymous authentication for proof and add CAPTCHA/Turnstile before any public exposure.
6. Configure Edge Function secrets. Keep `BR02_OPENAI_ENABLED=false` and `BR02_KILL_SWITCH=true`.
7. Deploy JWT-protected functions. `purge-expired` uses custom secret authentication and must not be browser-exposed.
8. Execute tests T02–T06 in `SCR-BR02-TEST-001` with a synthetic image and no PII.
9. Create/use a dedicated Shell & Co OpenAI project/key in backend secrets only.
10. Configure external OpenAI spend controls plus the application-side BR02 limits.
11. Temporarily set `BR02_OPENAI_ENABLED=true` and `BR02_KILL_SWITCH=false` for exactly one synthetic proof generation.
12. Re-close the kill switch after the proof call.
13. Execute retrieval, quota, deletion and retention tests.
14. Do not connect the public Remodel Studio to this backend until the separate production privacy/security/credential gate passes.

## Required Secret Contract

See repository root `.env.example`. Real values belong in Supabase/OpenAI secret management, never this repository.

## Staff Human Review

`review-concept` accepts only authenticated users whose Supabase Auth `app_metadata.shell_role` is `reviewer` or `admin`. Those roles are provisioned administratively; customer sessions cannot self-assign them.

## Upload Contract

The initial proof intentionally caps standard image uploads at 6 MiB. The existing front-end prototype may mention a larger local-only limit; production must not advertise a 10 MiB cloud upload limit until the resumable/TUS path is separately tested and adopted.

## OpenAI Contract

`generate-concept` is fail-closed unless both conditions are met:

- `BR02_OPENAI_ENABLED=true`
- `BR02_KILL_SWITCH=false`

It makes a server-side GPT Image 2 edit request, one concept at a time, and stores the result privately. No OpenAI key, raw upstream error payload or result storage path is returned to the browser.

## Metadata Law™

This directory implements `SCR-BR02-001`, `SCR-BR02-DATA-001`, `SCR-BR02-PROMPT-001` and `SCR-BR02-TEST-001`. If code behavior and a controlling record conflict, stop and reconcile the record/code rather than silently changing the governed behavior.
