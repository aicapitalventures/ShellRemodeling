# SCR-BR03-IMPLEMENTATION-001 — Remodel Studio Consumer-Ready Technical Implementation Specification v1.0

**Record ID:** SCR-BR03-IMPLEMENTATION-001  
**Version:** 1.0  
**Status:** ADOPTED FOR BR03 REPOSITORY IMPLEMENTATION — PRODUCTION CLOSED  
**Effective date:** 2026-08-24  
**Branch:** `build/03-remodel-studio-consumer-ready`  
**Production base:** `main` @ `464df51cf765e2b995c3e52095eee5e7b2a37eed`  
**Historical Studio source:** `build/02-secure-remodel-studio` @ `268a6171106777f129aedd2ae90a63b326d34f73`  
**Common ancestor:** `a6ce4dfa18b37c2a0e59bcac96a06b8a6e812f02`  
**Controlling product/commercial canon:** `SCR-STUDIO-ACCESS-001 v1.1`  
**Execution governance:** FECS v1.1 + Metadata Law™  
**Production authority:** NONE — no merge, deploy, live Stripe, secret or production configuration mutation is authorized by this specification.

## 1. Objective

Convert the existing Shell & Co Remodel Studio proof/backend into a consumer-ready, inquiry-gated, securely resumable homeowner planning workspace and a protected Shell & Co staff planning surface while preserving the completed `shellremodeling.com` production baseline.

The implementation must support:

**Inquiry → one complimentary successful concept → staff +1/+2 planning grants → max 3 successful pre-contract concepts → free qualified initial consultation → estimate/proposal → accepted project → server-authorized Stripe project deposit → Active Project Studio → controlled additional concepts.**

## 2. Reconciliation Evidence — 2026-08-24

### Git

At BR03 implementation opening:

- `main` remains `464df51cf765e2b995c3e52095eee5e7b2a37eed`.
- BR03 was created directly from that production baseline.
- Before this implementation record, BR03 differed from `main` only by `SCR-BR03-CONSUMER-READY-001`.
- BR02 remains materially diverged: 20 commits ahead / 25 behind `main` at BR03 opening.
- BR02 shall be treated as historical source material, not a merge source.

### Hosted Supabase control plane

Project: `mlxboidajkqyayxjdcvh` — `Shell & Co Remodel Studio`.

Observed active Studio/payment functions include:

- `create-project` v23
- `create-upload` v21
- `finalize-upload` v21
- `get-concept` v21
- `select-concept` v21
- `review-concept` v20
- `delete-project` v21
- `generate-concept` v32
- `review-queue` v9
- `studio-access` v9
- `create-checkout-session` v11
- `stripe-webhook` v9
- `purge-expired` v9
- `submit-inquiry` v15
- temporary `br02-ip-diagnostic` v18

### Hosted migration drift

Hosted migration list includes:

- `20260813010109_br02_secure_remodel_studio`
- `20260813010205_br02_advisor_hardening`
- `20260813101405_br02_atomic_generation_reservation`
- `20260819065603_public_launch_inquiries`
- `20260819212748_stripe_test_mode_architecture`
- `20260819214415_adopt_three_concept_limit`
- `20260823000349_founder_demo_one_shot_gate`
- `20260823142733_free_concept_lead_entitlement`

`20260823142733_free_concept_lead_entitlement` is present in the hosted database but was absent from Git during reconciliation. BR03 must restore that migration from direct control-plane schema/function evidence before extending it.

### Current hosted complimentary-access model

The hosted schema contains:

- `public_project_inquiries.studio_unlock_token_hash`
- `studio_unlock_expires_at`
- `studio_unlocked_at`
- `studio_owner_user_id`
- private `studio_lead_entitlements` with one concept per inquiry/project
- `br02_claim_free_concept(...)`
- `br02_reserve_free_generation(...)`

Hosted `create-project` v23 requires `studio_unlock_token` and claims the complimentary entitlement. Hosted `generate-concept` v32 chooses `br02_reserve_free_generation` when a `studio_lead_entitlements` row exists.

### Current security findings

Supabase advisor presently reports:

- anonymous-user-readable RLS policies on `remodel_projects`, `remodel_concepts` and `buildability_reviews`;
- leaked-password protection disabled;
- intentionally service-only RLS tables with no browser policies;
- missing covering index on `public_project_inquiries.studio_owner_user_id`.

BR03's durable verified-customer identity design is intended to supersede anonymous Studio ownership before public AI activation. Existing anonymous policies remain untouched until the replacement flow is proven and a separate cloud deployment gate opens.

## 3. Preservation Rules

The following production behavior is immutable during BR03 repository development unless separately authorized:

- Bernard Shell Jr. remains the sole owner represented by current company/public canon.
- `shellremodeling.com` remains canonical.
- public inquiries remain nonbinding.
- `public_project_inquiries` remains the production lead system of record.
- `submit-inquiry` routing remains only `bernard@shellremodeling.com` and `elijah@shellremodeling.com`.
- no Yahoo/Gmail recipient restoration.
- no unverified licensing/insurance/financing claim.
- no public customer-image storage.
- no live Stripe charge.

## 4. Target Architecture

```text
shellremodeling.com
  |
  +-- Public inquiry (existing submit-inquiry)
  |     -> private inquiry record
  |     -> Shell notification
  |     -> one-time Studio claim token
  |
  +-- Studio claim / verified Auth
  |     -> durable customer user
  |     -> claimed inquiry/project ownership
  |
  +-- studio.html
  |     -> project truth
  |     -> private upload
  |     -> complimentary/planning/active credits
  |     -> GPT Image 2 concept generation
  |     -> compare/select
  |
  +-- staff/studio.html
  |     -> authorized staff project queue/detail
  |     -> planning grants
  |     -> staff notes / business stage
  |     -> GREEN/YELLOW/RED review
  |     -> pricing assessment
  |     -> authorized payment-order actions
  |
  +-- Stripe Checkout (test first)
        -> immutable payment order
        -> signed webhook
        -> verified project-deposit state
        -> Active Project Studio grant
```

## 5. Authentication / Customer Re-Entry

### Direction

The current inquiry unlock token becomes a one-time claim credential only.

Primary production target: Supabase Auth passwordless email OTP / magic-link style verification for Studio customers.

### Rules

1. Ordinary public inquiry remains available under current contact requirements.
2. Studio claim requires durable verified customer Auth before the project becomes long-term resumable.
3. The unlock token is never stored raw in the database; only its SHA-256 hash remains server-side.
4. Claim is single-use and expiry-bound.
5. After claim, future access uses the authenticated user, not the unlock token.
6. `public_project_inquiries.studio_owner_user_id` binds the inquiry to the verified Studio user.
7. The customer may access only projects owned by their Auth user.
8. Auth callback/OTP UX must not leak the claim token into analytics, logs or third-party URLs.

### Implementation approach

Primary path:

- keep the existing inquiry response token for initial handoff;
- route the customer to `studio.html?claim=<short-lived-value>` only if unavoidable; prefer sessionStorage transfer from inquiry success to Studio to avoid URL persistence;
- require/obtain verified email through Supabase Auth;
- call a JWT-protected claim/create-project function using the token after Auth verification;
- immediately remove the raw claim token from browser state after successful claim;
- persist only normal Supabase Auth session state for later re-entry.

Fallback path, only if email OTP implementation cannot be safely proven: preserve the current authenticated anonymous session for the same-browser proof but keep public production AI CLOSED. No third auth architecture in the same run.

## 6. Staff Authorization Model

### Role model

Use protected Auth `app_metadata.shell_role` values. Repository code recognizes roles; actual user-role assignment is a later protected control-plane step.

Authorized operational role set:

- `admin` — full Studio/staff operational authority;
- `studio_admin` — customer project view, grants, notes, stages, payment-order initiation, reviewer functions;
- `reviewer` — buildability review / project-read authority only.

Bernard Shell Jr. and Elijah L. Cooley are the initial authorized business users for `admin` / `studio_admin` assignment at activation. Do not hard-code their Auth IDs or secrets in Git.

### Shared server helper

Add `requireStaff(req, allowedRoles)` in `_shared/core.ts` or a dedicated `_shared/staff.ts` to:

- require valid JWT;
- retrieve trusted `app_metadata.shell_role`;
- reject missing/unapproved roles;
- return service client + caller user ID + role;
- never trust browser-supplied role claims.

## 7. Data Model — BR03 Additions

The existing BR02 data model is retained where valid. Additive BR03 schema should be implemented by migration after hosted parity is restored.

### 7.1 `studio_access_grants`

Purpose: staff/deposit-driven concept access beyond the one complimentary lead entitlement.

Recommended columns:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references remodel_projects(id) on delete cascade`
- `owner_user_id uuid not null references auth.users(id) on delete cascade`
- `stage text not null check stage in ('planning','active_project')`
- `source text not null check source in ('staff','project_deposit')`
- `allowance smallint not null`
- `used smallint not null default 0`
- `status text not null default 'active' check status in ('active','exhausted','revoked')`
- `granted_by_user_id uuid null references auth.users(id)`
- `payment_order_id uuid null references payment_orders(id)`
- `reason_code text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- optional `expires_at timestamptz null`

Rules:

- `planning/staff` grants: allowance must be 1 or 2.
- pre-contract total completed allowance across complimentary + planning may not exceed 3.
- `active_project/project_deposit` initial grant: allowance = 3 and unique per paid project-deposit order.
- later `active_project/staff` grants: +1/+2 only.
- no direct browser writes; service-side functions only.

### 7.2 `studio_generation_credit_reservations`

Purpose: ensure system/provider failures do not consume customer concept credits while remaining concurrency-safe.

Columns:

- `id uuid primary key`
- `concept_id uuid unique not null references remodel_concepts(id) on delete cascade`
- `project_id uuid not null`
- `owner_user_id uuid not null`
- `credit_source text not null check in ('lead','grant')`
- `lead_entitlement_id uuid null references studio_lead_entitlements(id)`
- `grant_id uuid null references studio_access_grants(id)`
- `state text not null check in ('reserved','consumed','released')`
- `reserved_at timestamptz default now()`
- `settled_at timestamptz null`

Exactly one entitlement reference must be present based on `credit_source`.

No customer credit is counted as used until successful concept settlement.

### 7.3 `studio_staff_notes`

- `id uuid`
- `project_id uuid`
- `author_user_id uuid`
- `note text`
- `created_at`
- `updated_at`

Service/staff only. Never returned to customer APIs.

### 7.4 Business lifecycle

Keep technical `remodel_projects.status` separate.

Add `business_stage text` to `remodel_projects` or a one-to-one `project_business_state` table.

Preferred minimal path: add `business_stage` to `remodel_projects` with allowed values from SCR-STUDIO-ACCESS-001 and default `studio_unlocked` for claimed projects.

Staff/server controls changes. Customer actions may trigger only explicitly authorized transitions such as successful complimentary generation.

### 7.5 `project_commercial_terms`

Purpose: immutable server authority for payment eligibility after written project acceptance without storing the full contract in this public repository/database surface.

Recommended fields:

- `id uuid`
- `project_id uuid`
- `version smallint`
- `status text in ('draft','accepted','superseded','cancelled')`
- `contract_reference text` — non-sensitive internal reference only
- `contract_total_cents bigint`
- `deposit_amount_cents bigint`
- `deposit_basis_points integer null` — informational/provisional; not automatic until legal gate opens
- `accepted_at timestamptz null`
- `approved_by_user_id uuid`
- timestamps

Rules:

- only accepted terms may authorize `project_deposit` orders;
- deposit amount is exact and server-controlled;
- 15% is not automatically enforced until separately legally approved;
- superseding terms create a new version rather than mutating accepted history.

### 7.6 `project_pricing_assessments`

Staff-only internal pricing intelligence; never a final automated quote.

Fields:

- project ID
- direct job cost cents
- verified comparable competitor price cents nullable
- comparator/source note
- comparable_scope_verified boolean
- target_discount_basis_points default 500
- minimum_gross_margin_basis_points default 3000
- calculated competitor target cents
- calculated margin floor cents
- recommended floor/target cents
- `meets_five_percent_target boolean`
- staff author/time

Formula:

- competitor target = competitor price × 95%
- margin floor = direct cost ÷ 70%
- if comparable competitor price exists and competitor target >= margin floor, competitive target may be used;
- otherwise margin floor controls.

No customer-facing auto-pricing endpoint is authorized.

## 8. Generation Credit Accounting

Current BR02 complimentary RPC consumes the lead allowance at reservation time. That conflicts with v1.1 fairness law when the provider/system fails after reservation.

BR03 must replace that behavior before consumer launch.

### Required transaction model

1. Lock applicable entitlement/grant.
2. Check `used + active_reserved < allowance`.
3. Enforce pre-contract cap where applicable.
4. Call/retain global quota and budget reservation logic.
5. Create `remodel_concepts` queued/generating record.
6. Create `studio_generation_credit_reservations` state=`reserved`.
7. Execute provider call.
8. On successful result persistence: settle credit to `consumed`, increment entitlement/grant `used`.
9. On normalized failure: settle to `released` without incrementing `used`.
10. `purge-expired` or a dedicated cleanup routine releases stale reservations whose generation can no longer complete.

Provider attempts may still count against the Shell global software budget because the provider may have incurred cost even when the customer credit is restored.

## 9. Generation Authorization / Kill Switch

Earlier BR02 canon required explicit software controls. BR03 retains that safety requirement.

`generate-concept` shall fail closed unless all are true:

- valid authenticated owner;
- valid owned project/source asset;
- explicit generation enable control is TRUE;
- explicit kill switch is FALSE;
- applicable customer concept credit is reservable;
- IP-hash/rate control passes;
- monthly software-budget reservation passes;
- required OpenAI key exists.

For backward compatibility, use the already governed environment names unless a later config migration is approved:

- `BR02_OPENAI_ENABLED=true`
- `BR02_KILL_SWITCH=false`

Presence of `OPENAI_API_KEY` alone is never sufficient to enable production generation.

No repository step changes those secrets.

## 10. Consumer Studio State Machine

Frontend states must be explicit rather than inferred from disabled controls.

Suggested states:

1. `needs_inquiry`
2. `claim_available`
3. `auth_required`
4. `claiming`
5. `project_setup`
6. `photo_required`
7. `photo_uploading`
8. `photo_ready`
9. `generation_available`
10. `generating`
11. `concept_ready`
12. `planning_limit_reached`
13. `additional_planning_access`
14. `selected`
15. `awaiting_shell_review`
16. `deposit_due`
17. `active_project_studio`
18. `project_closed`

Each async state needs customer-safe loading/error/retry handling and idempotent button behavior.

## 11. Consumer Frontend Files

Primary implementation:

- `studio.html`
- `assets/studio.css`
- `assets/studio.js`

Existing `index.html` should eventually contain only a concise Studio teaser/CTA plus existing inquiry success handoff. Keep Studio code isolated from production inquiry code wherever possible.

Consumer components:

- access/inquiry explanation
- claim/auth panel
- progress stepper
- project truth intake
- photo privacy/upload panel
- generation allowance/status
- concept gallery + original comparison
- selected concept state
- human-review boundary
- planning/contact continuation
- payment/deposit state when later eligible
- deletion/privacy controls

## 12. Staff Workspace

Primary static surface:

- `staff/studio.html`
- `assets/staff-studio.css`
- `assets/staff-studio.js`

All meaningful data operations use JWT-protected staff Edge Functions.

Recommended functions:

- `staff-projects` — paginated queue/filter, no private image URLs by default
- `staff-project-detail` — project/inquiry/planning/grant/payment state + short-lived signed images
- `grant-studio-access` — +1/+2 with stage/cap enforcement
- `update-project-stage` — validated state transition
- `staff-project-note` — create/update staff-only notes
- extend existing `review-concept` / `review-queue` rather than duplicate reviewer logic where safe
- `create-project-payment-order` — create an eligible test-mode project-deposit order only from accepted commercial terms

## 13. Stripe Payment Architecture

### Existing state

Current Stripe code is test-only and centered on `studio_pass`; it requires an `sk_test_` key and adopted USD 19 / three-concept configuration. That path is superseded from the primary remodeling funnel but remains historical/test evidence.

### Target order model

Extend `payment_orders` rather than create a second payment ledger.

Purpose values after BR03 migration should preserve historical rows and support:

- `studio_pass` — legacy/dormant test purpose
- `remodeling_deposit` — legacy compatibility until migration
- `project_deposit` — current canonical deposit purpose
- `planning_measurement_reservation` — reserved/provisional

Do not activate other purposes yet.

Add/retain:

- immutable amount snapshot
- project/owner binding
- commercial-terms reference for deposit
- payment mode
- idempotent client request ID
- Stripe Checkout Session ID
- PaymentIntent ID
- status
- paid/refund/dispute timestamps as appropriate

### Project-deposit Checkout

`create-project-payment-order`/Checkout must:

1. require authorized staff role or a server-created customer-payable order;
2. require accepted `project_commercial_terms`;
3. use exact `deposit_amount_cents` from that accepted record;
4. reject browser amount/currency overrides;
5. operate in Stripe test mode during BR03 proof;
6. use one-time Checkout;
7. use idempotency keyed to internal order ID;
8. return only the Checkout URL/order-safe fields.

For variable project deposits, use server-side Stripe `price_data` / `unit_amount` rather than trusting a browser value or requiring a unique pre-created Stripe Price for every project.

### Webhook

Signature verification remains mandatory on the raw request body.

On `checkout.session.completed` / appropriate payment-success event:

- deduplicate event ID;
- verify `livemode` matches configured mode;
- locate internal order;
- verify purpose, owner/project binding, amount and currency against stored order;
- verify the associated accepted commercial terms remain valid;
- mark paid once;
- transition project to `deposit_paid`/eligible business stage;
- create exactly one initial `active_project` grant allowance=3 using a unique payment-order linkage.

Refund/dispute handling must update payment/access state idempotently. Contractual refund rights remain controlled by the written agreement, not solely by webhook type.

## 14. Provisional USD 49 Planning Reservation

Architecture may reserve `planning_measurement_reservation`, but BR03 consumer UI must keep it disabled until founder/customer terms are separately adopted.

If later activated:

- server amount fixed to 4900 cents;
- one-time Checkout;
- 100% project credit rule represented in customer terms and accounting design;
- not treated as construction deposit.

## 15. Internal Competitive Pricing Logic

No public auto-quote and no public guaranteed 5%-beat claim.

Staff-only calculator:

```text
competitor_target = floor(verified_competitor_quote_cents * 0.95)
margin_floor = ceil(direct_job_cost_cents / 0.70)

if comparable_scope_verified and competitor_target >= margin_floor:
    internal_target = competitor_target
    meets_5pct_target = true
else:
    internal_target = margin_floor
    meets_5pct_target = false
```

The staff operator may choose a higher selling price. The system may never recommend below the margin floor solely to satisfy the 5% target.

## 16. Privacy / Retention

Pre-estimate default remains 30 days for source images, concepts and associated project content, subject to governed activity and conversion to an accepted project.

When a project becomes active, a later adopted active-project record-retention policy may supersede the pre-estimate 30-day rule. BR03 shall not silently make project records indefinite.

Customer deletion must remove private source/result objects and active Studio records as governed, while minimal non-PII audit/security tombstones may remain under existing policy.

No customer photo is authorized for marketing without separate affirmative permission.

## 17. Security Hardening Gates

Before public generation:

- verified customer re-entry replaces dependency on anonymous ownership;
- explicit OpenAI enable + kill switch restored;
- all sensitive Edge Functions require appropriate JWT/custom auth;
- staff role authorization tested against customer JWTs;
- private storage verified;
- no direct browser write to payment/grant/staff-note/pricing tables;
- rate/budget controls verified;
- claim tokens single-use and scrubbed from browser after claim;
- inquiry/studio abuse controls reviewed.

The older BR02 CAPTCHA requirement specifically targeted production anonymous-auth activation. If BR03 removes anonymous customer ownership in favor of verified email Auth, that anonymous-auth requirement may be superseded by a later security record. Turnstile remains a recommended no-cost abuse-control enhancement for public inquiry/claim surfaces but is not silently enabled by repository code without keys/configuration.

## 18. Testing Matrix

### Repository/static

- `git diff --check`
- link/asset validation
- secret-pattern scan
- no old inquiry recipients reintroduced
- no browser service-role/OpenAI/Stripe secret

### Auth/access

- invalid/expired/reused claim token denied
- claim succeeds once for verified user
- different user cannot access project
- customer cannot call staff endpoints
- staff role matrix enforced
- staff notes never returned to customer

### Credit accounting

- one inquiry gets one complimentary successful concept
- second complimentary generation denied without grant
- +1/+2 planning grant respected
- pre-contract successful total never exceeds 3
- concurrent generation cannot oversubscribe allowance
- provider/server failure releases customer credit
- successful generation consumes exactly one credit
- stale reservation cleanup restores credit safely

### Storage

- invalid MIME/signature/size rejected
- private buckets only
- signed retrieval short-lived
- source/result cross-user access denied

### Generation

- generation disabled unless explicit enable + kill-switch state allows
- rate/user/IP/budget ceilings fail closed
- moderation/provider/timeout errors normalized
- no raw upstream error/secret returned

### Stripe test

- browser amount ignored/rejected
- no deposit order without accepted commercial terms
- duplicate Checkout request idempotent
- unsigned webhook denied
- invalid signature denied
- replayed event processed once
- wrong mode/amount/currency/purpose denied
- paid deposit creates exactly one active-project initial grant
- cancellation/failure creates no grant
- refund/dispute state idempotent
- no live mode permitted in BR03 proof

### Pricing

- 5% target calculation correct
- 30% margin floor correct
- margin floor overrides unsafe competitive target
- incomplete/non-comparable competitor input cannot produce a false 5%-claim state

### Regression

- public inquiry still stores/validates exactly as production baseline expects
- notification recipient constants remain Bernard + Elijah only
- homepage/service/navigation unaffected except explicitly reviewed Studio CTA changes

## 19. Rollback

### Repository

Every BR03 implementation commit is independently revertible. `main` remains the known-good production rollback baseline until an eventual reviewed merge.

### Database future deployment

Before applying BR03 migrations to production:

- record current migration list/schema evidence;
- migration must be additive wherever practical;
- destructive drops require separate explicit approval;
- provide down/compensating SQL where safe;
- do not delete legacy Studio tables/functions until the new path is proven.

### Edge Functions

Record prior hosted version + source digest before deployment. If a deployed BR03 function fails acceptance, redeploy the prior known-good bundle where compatible, without changing unrelated functions/secrets.

### Stripe

BR03 proof remains test-only. Rollback does not require touching live Stripe because live mode remains closed.

## 20. Implementation Gates

### G0 — Authority / reconciliation

- v1.1 canon committed
- implementation spec committed
- hosted missing migration restored to Git

### G1 — Additive BR03 schema

- grants
- credit reservations
- staff notes
- business lifecycle
- commercial terms
- pricing assessments
- payment-order extension

Repository/migration only; not applied to production.

### G2 — Shared authorization + access RPCs

- customer claim/re-entry support
- staff role helper
- grant RPC
- credit reserve/settle RPC
- lifecycle transition helper

### G3 — Generation integration

- explicit kill switch
- fair credit settlement
- active/planning credit sources
- tests

### G4 — Consumer Studio UI

- dedicated `studio.html`
- access/auth/project/upload/generation/results/select/re-entry

### G5 — Staff workspace

- queue/detail/grants/notes/review/stage/pricing

### G6 — Stripe test project-deposit path

- accepted commercial terms
- server order
- Checkout
- signed webhook
- deposit→active grant

### G7 — Full local/repository QA

No production/cloud mutation.

### G8 — Controlled hosted proof

Requires separate explicit deployment/config authorization and safe test data only.

### G9 — Founder production release gate

Only after evidence passes; merge/live Stripe remain separate explicit actions.

## 21. Done Definitions

### CORE

BR03 repository contains a coherent implementation of inquiry-gated durable Studio access, fair generation-credit accounting, controlled planning/active grants, staff workspace, project lifecycle, internal pricing discipline, server-authorized test-mode deposit Checkout, and active-project activation—with tests and no production regression.

### SAFE STATE

- `main` untouched until release gate;
- no secrets committed;
- no uncontrolled public generation;
- no live Stripe;
- private customer assets preserved;
- customer/staff isolation enforced;
- explicit generation kill switch exists;
- browser cannot create/alter sensitive payment/grant/pricing state.

### CLEANUP

Before production release:

- hosted/Git parity achieved;
- obsolete founder-demo-only frontend/query parameters removed;
- temporary `br02-ip-diagnostic` removed/disabled only after evidence dependency is cleared;
- dormant USD 19 path clearly isolated or retired without destroying audit history;
- test/synthetic fixtures cleaned;
- dead Studio preview controls removed from launch frontend.

### GOVERNANCE

- SCR-STUDIO-ACCESS-001 v1.1 controlling;
- SCR-BR03-CONSUMER-READY-001 updated as needed;
- this implementation record updated with actual commits/tests/deployed versions;
- production baseline/recipient/ownership canon preserved;
- provisional 15% deposit and USD 49 reservation not silently activated;
- rollback evidence recorded before any future production merge/deploy.

## 22. Immediate Repository Action

Restore `20260823142733_free_concept_lead_entitlement.sql` to BR03 from verified hosted schema/function evidence. Then begin G1 as a separate scoped implementation run.
