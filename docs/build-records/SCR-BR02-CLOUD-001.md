# SCR-BR02-CLOUD-001 — Supabase Cloud Activation, Advisor Hardening & Pre-OpenAI Test Record v1.0

**Record ID:** SCR-BR02-CLOUD-001  
**Version:** 1.0  
**Status:** CLOUD PROJECT ACTIVE — T02 PASSED / T03 PARTIAL / T04–T06 INVOCATION-GATED  
**Effective date:** 2026-08-12  
**Branch:** `build/02-secure-remodel-studio`  
**Supabase project:** `Shell & Co Remodel Studio`  
**Project ref:** `mlxboidajkqyayxjdcvh`  
**Region:** `us-east-1`  
**Organization:** `aicapitalventures's Org`  
**Cost confirmed before creation:** $0/month  
**Dependencies:** SCR-BR02-001 v1.0, SCR-BR02-DATA-001 v1.0, SCR-BR02-PROMPT-001 v1.0, SCR-BR02-TEST-001 v1.0, SCR-BR02-SCAFFOLD-001 v1.0, SCR-AIVIS-001 v0.2

## Isolation

A dedicated Shell & Co project was created. The unrelated `Voice to Legacy Lead Funnel` Supabase project was not used or modified for Shell & Co.

## Migration

Applied hosted migrations:

1. `br02_secure_remodel_studio`
2. `br02_advisor_hardening`

The second migration was created after hosted Supabase advisors identified avoidable RLS initialization-plan warnings and missing foreign-key indexes.

## Advisor Result

### Security

No warning/error-level security defect remained after migration. Supabase continues to report INFO notices for `remodel_assets`, `generation_events`, and `audit_events` because RLS is enabled with zero client policies. This is intentional: these tables are service-side only and deny direct client access by default.

### Performance

Material `auth_rls_initplan` warnings and unindexed foreign-key findings were corrected. Remaining advisor items are INFO-level `unused_index` notices expected in a new empty test database.

## T02 — Schema / RLS

**PASS.** Behavioral SQL tests used synthetic anonymous Auth rows only.

Verified:

- unauthenticated/`anon` role saw zero protected project rows;
- synthetic authenticated user A saw only A's project, concept, and related buildability review, not user B's;
- `remodel_assets` remained unreadable directly even to the owner because it has no client SELECT policy;
- direct authenticated INSERT into `buildability_reviews` was rejected by RLS;
- direct authenticated INSERT into `audit_events` was rejected by RLS;
- synthetic fixtures were deleted after the test and the project returned to zero project/assets/concept/review rows.

## T03 — Private Buckets

**PARTIAL PASS / OBJECT-RETRIEVAL SUBTEST PENDING.**

Hosted bucket configuration verified:

- `remodel-source-private`: `public=false`, 6 MiB limit, JPEG/PNG/WEBP only;
- `remodel-results-private`: `public=false`, 6 MiB limit, JPEG/PNG/WEBP only.

No public Storage policy was added.

The remaining T03 acceptance step — prove that a guessed public URL cannot retrieve an actually uploaded synthetic object — requires an actual Storage upload. The connected Supabase tool surface does not expose Storage object upload/invoke operations.

## Edge Functions

The following BR02 user-facing functions were deployed ACTIVE with `verify_jwt=true`:

- `create-project`
- `create-upload`
- `finalize-upload`
- `get-concept`
- `select-concept`
- `review-concept`
- `delete-project`
- `generate-concept`

`generate-concept` is deployed only so the server-side proof code exists. The OpenAI gate remains closed: no OpenAI API key has been configured through this activation, `BR02_OPENAI_ENABLED` defaults false, and the kill-switch logic defaults closed unless explicitly opened later.

The non-JWT cleanup function `purge-expired` was not part of this JWT-protected deployment step and remains a later controlled service-auth deployment.

## T04 — Create Test Project

**NOT EXECUTED — CONNECTOR INVOCATION GATE.**

The hosted `create-project` function is ACTIVE and JWT-protected, but the connected Supabase management tool exposes deploy/list/get operations and does not expose an Edge Function invocation action or anonymous-auth session creation call. Static deployment is not accepted as a behavioral T04 pass.

## T05 — Signed Upload

**NOT EXECUTED — CONNECTOR STORAGE/INVOCATION GATE.**

The hosted `create-upload` function is ACTIVE and the private bucket exists, but an authenticated function call plus binary upload is required. The current connector exposes neither Edge Function invocation nor Storage object upload.

## T06 — Finalize / Validate

**NOT EXECUTED — CONNECTOR STORAGE/INVOCATION GATE.**

The hosted `finalize-upload` function is ACTIVE. Actual byte validation, MIME-signature checking, SHA-256 persistence, ready-state transition, mismatch deletion, wrong-owner denial, and missing-object behavior must be exercised against a real synthetic upload before T06 can pass.

## OpenAI Gate

**CLOSED.**

No OpenAI generation was performed. No real customer data was used. No production frontend was connected. No custom domain or main-branch deployment occurred.

## Next Required Evidence

Obtain a test execution path capable of:

1. creating an anonymous/authenticated Supabase session;
2. POSTing to the deployed Edge Functions with its JWT;
3. uploading a synthetic image to the returned signed Storage upload authorization;
4. calling `finalize-upload`;
5. fetching the guessed/public object URL to prove denial;
6. executing T04–T06 negative cases.

Do not open T07/OpenAI until T03–T06 are behaviorally passed.