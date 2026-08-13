# SCR-BR02-TEST-001 — Secure End-to-End Proof Test & Acceptance Plan v1.0

**Record ID:** SCR-BR02-TEST-001  
**Version:** 1.0  
**Status:** TEST PLAN ADOPTED — EXECUTION PENDING CLOUD PROJECT  
**Effective date:** 2026-08-12  
**Dependencies:** SCR-BR02-001, SCR-BR02-DATA-001, SCR-BR02-PROMPT-001  

## Test Asset Law

Use only synthetic/non-customer imagery and synthetic project inputs. No customer PII, real customer photos or confidential project data may be used during BR02 proof execution.

## Acceptance Sequence

### T01 — Isolated Cloud Project

Pass when a dedicated Shell & Co Supabase project exists and no Shell & Co tables/buckets/functions are created in an unrelated venture project.

### T02 — Schema / RLS

Apply BR02 migration. Pass only when:

- required tables exist;
- RLS is enabled on customer-readable tables;
- unauthenticated direct reads fail;
- anonymous authenticated user A cannot read user B's project/assets/concepts/reviews;
- customer role cannot insert/update buildability reviews or audit records.

Run Supabase security/performance advisors after migration and resolve material findings before proof acceptance.

### T03 — Private Buckets

Pass only when both source/result buckets report private access and a guessed/public object URL cannot retrieve the synthetic image.

### T04 — Create Test Project

Anonymous authenticated test session creates one PII-free project through `create-project`. Verify `owner_user_id`, 30-day `retention_expires_at`, structured inputs and audit event.

### T05 — Signed Upload

Request signed source upload using JPEG/PNG/WEBP ≤6 MiB. Verify:

- random asset/path ID;
- no original filename used in storage path;
- no public URL returned;
- signed upload expires according to provider behavior;
- ownership enforced.

### T06 — Finalize / Validate

Upload synthetic image, call `finalize-upload`, and pass only when:

- actual bytes are downloaded server-side;
- size is rechecked;
- magic bytes match an allowed image format;
- SHA-256 is stored;
- asset state becomes `ready`.

Negative tests:

- oversized object rejected/deleted;
- MIME/signature mismatch rejected/deleted;
- wrong owner denied;
- missing object rejected.

### T07 — OpenAI Kill Switch

Before enabling OpenAI:

- dedicated Shell & Co OpenAI key/project configured as backend secret;
- `BR02_OPENAI_ENABLED=true` only for test window;
- `BR02_KILL_SWITCH=false` only for test window;
- application monthly ceiling set;
- platform/project spending control configured where available.

With kill switch ON, generation must fail closed with `GENERATION_DISABLED` and must not call OpenAI.

### T08 — One Controlled Concept

With test switch temporarily open, generate exactly ONE medium-quality GPT Image 2 concept through the server-side Image Edits flow.

Pass when:

- source object never becomes public;
- browser never sees OpenAI key;
- compiler version/hash recorded;
- concept status advances queued/generating/completed;
- OpenAI request ID recorded when supplied;
- result stored in private results bucket;
- result asset SHA-256 recorded;
- one generation event/cost reservation recorded;
- no raw prompt body written to audit/log tables.

### T09 — Result Retrieval

Request result through `get-concept`. Pass only when a short-lived signed URL is produced after ownership check and it expires as expected.

### T10 — Quotas / Error Normalization

Verify:

- project concept maximum = 4;
- anonymous user daily attempt maximum enforced;
- hashed-IP hourly maximum enforced;
- raw IP is absent from DB;
- monthly software ceiling blocks generation;
- moderation block is normalized;
- transient retry limit is bounded;
- provider error body/secret is not returned to client.

### T11 — Human Review Boundary

Verify anonymous customer cannot create GREEN/YELLOW/RED review. Authorized reviewer path is a later controlled staff-auth test. AI generation alone must never populate a controlling review status.

### T12 — Delete Project

Call `delete-project` as owner. Pass only when:

- source object removed;
- result object removed;
- active project/assets/concepts/reviews/generation records removed or cascaded as designed;
- a minimal non-PII deletion tombstone remains;
- signed URLs no longer resolve after deletion.

### T13 — Retention Strategy

Manually mark a test project expired and run the service-side purge path before production activation. Pass only when object deletion occurs before database cleanup and failure is recoverable/retriable without orphaning public data.

## Proof Exit Criteria

BR02 proof status may advance to `SECURE END-TO-END PROOF PASSED` only after T01–T13 are evidenced. A successful OpenAI image by itself is not sufficient.

Passing this proof does **not** authorize real customer data. A separate production-readiness gate remains required for privacy wording, business credentials, live lead routing, payment/financing integrations and deployment.

## Next Best Action

Create the dedicated Shell & Co Supabase project after cost confirmation, then apply the migration and execute T02–T06 with OpenAI disabled before provisioning the OpenAI proof key.
