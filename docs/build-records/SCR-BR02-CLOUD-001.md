# SCR-BR02-CLOUD-001 — Supabase Cloud Activation, Advisor Hardening & Pre-OpenAI Test Record v1.0

**Record ID:** SCR-BR02-CLOUD-001  
**Version:** 1.0  
**Status:** CLOUD PROJECT ACTIVE — T02–T06 PASSED / OPENAI GATE CLOSED
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

**PASS.**

Hosted bucket configuration verified:

- `remodel-source-private`: `public=false`, 6 MiB limit, JPEG/PNG/WEBP only;
- `remodel-results-private`: `public=false`, 6 MiB limit, JPEG/PNG/WEBP only.

No public Storage policy was added.

The synthetic object was uploaded through the returned signed authorization. A guessed public URL returned HTTP 400 and did not retrieve the object.

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

**PASS.**

Two anonymous sessions were created. Session A created one synthetic, PII-free project through `create-project` and received HTTP 201. The authenticated owner read verified the owner user ID, `draft` state, and retention at least 29 days from execution. The project later advanced to `source_ready`.

## T05 — Signed Upload

**PASS.**

The owner received a random project-scoped signed upload path and uploaded a synthetic PNG. No original filename or public URL was returned. Wrong-owner `create-upload` returned HTTP 404.

## T06 — Finalize / Validate

**PASS.**

The valid upload finalized with HTTP 200 and `ready`; the function returned the actual MIME `image/png`, actual byte size, and SHA-256. The project reached `source_ready`. Wrong-owner finalize returned HTTP 404. Finalizing an authorized but missing object returned HTTP 409. A declared-PNG object containing synthetic non-image bytes returned HTTP 400 with `INVALID_UPLOAD`; authenticated and public retrieval of that rejected object both returned HTTP 400, proving removal. An over-limit declaration of 6 MiB + 1 byte was rejected by `create-upload` with HTTP 400. Owner deletion returned HTTP 200 and subsequent retrieval of the valid object returned HTTP 400, confirming synthetic cleanup.

## 2026-08-13 Synthetic T03-T06 Execution Evidence

The approved proof script `/tmp/br02-t03-t06.sh` ran on branch `build/02-secure-remodel-studio` using only `/tmp/br02-test.env` and the browser-publishable key. It created two anonymous sessions and used synthetic image and project data only.

Observed results:

- T03 private-object proof: guessed/public URL denied with HTTP 400.
- T04 create-project: HTTP 201; owner and retention verified; final state verified as `source_ready`.
- T05 signed upload: HTTP 200; random private path; wrong-owner authorization denied with HTTP 404; synthetic PNG uploaded successfully.
- T06 valid finalize: HTTP 200 / `ready`; actual size, MIME, magic bytes, and SHA-256 validated.
- T06 negative cases: wrong-owner finalize HTTP 404; missing object HTTP 409; MIME/signature mismatch HTTP 400; rejected object retrieval denied HTTP 400; over-limit declaration HTTP 400.
- Cleanup: owner deletion HTTP 200; subsequent valid-object retrieval denied HTTP 400; no synthetic project or objects remained through the function's cleanup path.

No Auth settings, RLS policies, service-role key, management token, OpenAI configuration, or OpenAI function was used. `generate-concept` was not called.

## 2026-08-13 Execution Attempt

The deployed endpoint was reachable from the BR02 container at
`https://mlxboidajkqyayxjdcvh.supabase.co/functions/v1/create-project`.
An unauthenticated request returned HTTP 401 with
`UNAUTHORIZED_NO_AUTH_HEADER`, confirming the deployed function's authentication
boundary. The REST endpoint likewise returned HTTP 401 and `No API key found`.

This container has no `SUPABASE_ACCESS_TOKEN`, `SUPABASE_AUTH_TOKEN`,
`SUPABASE_PUBLISHABLE_KEY`, or project client configuration; the repository
contains placeholders only. Without the existing project's browser-publishable
key, an anonymous Auth session cannot be created and no valid JWT can be obtained
for T04–T06. No function invocation, Storage upload, database mutation, OpenAI
configuration, OpenAI call, or fixture was performed during this attempt.

This historical invocation block was superseded by the completed synthetic
proof recorded below after the browser-publishable test configuration became
available.

## 2026-08-13 Anonymous Auth Gate

With the existing project's browser-publishable configuration loaded only from
`/tmp/br02-test.env`, a POST to `/auth/v1/signup` returned HTTP 422 with
`Anonymous sign-ins are disabled`. Per the BR02 execution instruction, no Auth
setting was changed and no T03–T06 function call, Storage upload, fixture, or
OpenAI action was performed after this result. This historical Auth gate was
superseded after anonymous sign-in was enabled manually; no Auth setting was
changed by the proof execution.

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