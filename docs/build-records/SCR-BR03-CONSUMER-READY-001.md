# SCR-BR03-CONSUMER-READY-001 — Shell & Co Remodel Studio™ Consumer-Readiness Integration Build v1.0

**Record ID:** SCR-BR03-CONSUMER-READY-001  
**Version:** 1.0  
**Status:** AUTHORIZED — INTEGRATION / CONSUMER-READINESS BUILD OPEN  
**Effective date:** 2026-08-24  
**Repository:** `aicapitalventures/ShellRemodeling`  
**Active branch:** `build/03-remodel-studio-consumer-ready`  
**Production base:** `main` @ `464df51cf765e2b995c3e52095eee5e7b2a37eed`  
**Historical Studio source:** `build/02-secure-remodel-studio` @ `268a6171106777f129aedd2ae90a63b326d34f73`  
**Common ancestor:** `a6ce4dfa18b37c2a0e59bcac96a06b8a6e812f02`  
**Production status:** `main` remains frozen; no merge/deploy authority is created by this record.

## 1. Objective

Finish Shell & Co Remodel Studio™ as a trustworthy, low-friction homeowner product without regressing the completed ShellRemodeling.com production website baseline.

The product is not merely an AI image generator. It is a governed pre-estimate workflow:

**Project setup → Space Truth → Preserve / Change / Must-Have → planning context → privacy disclosure → secure photo upload → authorized concept generation → concept comparison/selection → human buildability boundary → project inquiry / estimate handoff → Shell & Co lead routing.**

## 2. Protected Production Baseline — MUST PRESERVE

The following current `main` behavior is protected and may not be overwritten by historical Studio files:

- Bernard Shell Jr. is the sole owner represented by current corporate/public canon.
- `shellremodeling.com` remains the canonical production domain.
- Public claims remain evidence-gated; no unverified licensing, insurance, financing or trade claims.
- Public inquiries remain nonbinding.
- Supabase `public_project_inquiries` remains the lead system of record.
- `submit-inquiry` v15 routing remains restricted to:
  - `bernard@shellremodeling.com`
  - `elijah@shellremodeling.com`
- Superseded Yahoo/Gmail inquiry recipients must not be restored.
- Customer Reply-To behavior must remain intact.
- Existing production brand, responsive website, documented-work presentation and inquiry reliability are protected.

## 3. Studio Architecture to Preserve

Carry forward only verified Studio capabilities that remain valid:

- dedicated Shell & Co Supabase project;
- authenticated customer project ownership;
- private source/result storage;
- signed upload and post-upload validation;
- JPEG/PNG/WEBP support with current 6 MiB controlled limit unless separately tested;
- SHA-256 asset provenance;
- source-space truth and Preserve / Change / Must-Have data;
- governed prompt compiler;
- `gpt-image-2` image-edit workflow;
- maximum three concept directions per adopted Studio pass;
- short-lived result retrieval;
- concept selection;
- human reviewer authority for GREEN/YELLOW/RED buildability status;
- project deletion and retention controls;
- 30-day default pre-estimate retention;
- separate marketing/photo-publicity consent;
- normalized public error states;
- server-side quotas, budget controls and no raw-IP application storage;
- Stripe architecture remains isolated from remodeling deposits.

## 4. Current Hosted Control-Plane Evidence

As of this build opening, the dedicated Supabase project reports active functions including:

`create-project`, `create-upload`, `finalize-upload`, `generate-concept`, `get-concept`, `select-concept`, `review-concept`, `review-queue`, `delete-project`, `purge-expired`, `studio-access`, `create-checkout-session`, `stripe-webhook`, `submit-inquiry`, and the temporary `br02-ip-diagnostic`.

Important current versions observed at build opening include:

- `generate-concept` v32
- `studio-access` v9
- `create-checkout-session` v11
- `stripe-webhook` v9
- `submit-inquiry` v15

Hosted control-plane state is evidence, not repository authority. Any hosted source not represented in Git must be reconciled before launch.

## 5. Critical Reconciliation Findings / Launch Blockers

### A. GitHub branch divergence

`build/02-secure-remodel-studio` is materially diverged from production and must not be merged wholesale. At BR03 opening it is 20 commits ahead and 25 commits behind `main`.

### B. Hosted-vs-repository Studio drift

Hosted `generate-concept` contains newer `studio_lead_entitlements` / estimate-request access logic that is not represented by the historical branch version inspected during BR03 opening. That logic must be reconstructed into repository-controlled migrations/functions or removed before production launch.

### C. Generation kill-switch governance drift

Earlier BR02 canon required explicit fail-closed controls including `BR02_OPENAI_ENABLED` and `BR02_KILL_SWITCH`. The hosted `generate-concept` v32 source inspected at BR03 opening does not visibly enforce those two controls; it checks for `OPENAI_API_KEY` and server-side reservation authorization. BR03 must either restore explicit kill-switch enforcement or create a separately reviewed supersession record. Consumer launch is blocked until this is resolved.

### D. Stripe remains test-mode architecture

`create-checkout-session` currently enforces `STRIPE_TEST_MODE_ENABLED=true`, requires an `sk_test_` secret and the adopted USD 19 / three-concept configuration, and returns to a founder-demo URL. This is test-only and must not be presented as a live consumer payment flow.

### E. Temporary diagnostic cleanup

`br02-ip-diagnostic` remains active and is not part of the consumer product. Remove/disable only after its evidence value is no longer required and after BR03 safe-state verification.

### F. CAPTCHA / public-upload abuse protection

Public photo upload/generation must not open until the adopted anonymous-session abuse protection/CAPTCHA gate is verified in the actual production flow.

## 6. Consumer Product Definition

The consumer-ready Studio must feel like one coherent guided experience, not a developer demo.

### Stage 1 — Start

- concise value proposition;
- explain what the Studio does and does not do;
- visible privacy/retention summary;
- clear estimated time to complete;
- Start Remodel Studio CTA.

### Stage 2 — Project Truth

Capture:

- project type;
- source-space truth / known constraints;
- Preserve items;
- Change items;
- Must-Have items;
- accessibility requirements;
- design direction;
- written vision;
- planning budget band;
- desired timing;
- property context.

Use progressive disclosure and homeowner language; do not expose internal field/schema terminology.

### Stage 3 — Secure Photo

- explain why photo is needed;
- explain private storage and 30-day default retention;
- disclose OpenAI transmission for requested generation;
- validate supported image type/size before upload;
- show upload progress, success, retry and replacement states;
- never expose private object paths or service credentials.

### Stage 4 — Access / Commercial Gate

BR03 must reconcile and founder-lock the production access model before exposure. Existing USD 19 / three-concept Stripe configuration remains test-only. Current hosted estimate-request/free-entitlement logic is provisional until reconstructed and adopted in Git-controlled canon.

No live charge may be enabled merely by making the UI visible.

### Stage 5 — Generate Concepts

- up to the authorized allowance;
- clear generating state and expected wait language;
- safe normalized error messages;
- no duplicate-charge/generation race;
- source photo remains controlling geometry;
- each result visibly labeled conceptual.

### Stage 6 — Compare / Select

- original vs generated concept comparison;
- concept cards with direction names;
- select preferred direction;
- concept count / allowance status;
- mobile-safe image viewing;
- no claim of final dimensions, price, code or buildability.

### Stage 7 — Human Reality Check

Explain that Shell & Co field/human review determines feasibility. Preserve GREEN/YELLOW/RED authority for authorized human reviewers only.

### Stage 8 — Estimate Handoff

- convert the Studio project into a nonbinding project inquiry / consultation request;
- reuse already-entered project context rather than forcing duplicate data entry;
- collect contact consent separately from marketing consent;
- route lead notification only to `bernard@shellremodeling.com` and `elijah@shellremodeling.com`;
- retain Supabase as system of record;
- show clear confirmation and expected response window without creating an appointment or contract.

## 7. UX / Accessibility Standard

Consumer-ready means:

- mobile-first at 360 px and above;
- keyboard-operable controls;
- visible focus states;
- proper labels and accessible status messaging;
- no color-only meaning;
- large tap targets;
- clear loading/empty/error/success states;
- photo preview and generated results sized without layout shift;
- no disabled-looking controls in a live flow unless action is genuinely unavailable;
- back/forward navigation does not silently discard project state;
- accidental refresh/navigation does not create duplicate projects, payments or generations.

## 8. Recommended Frontend Integration

Primary path: create a dedicated consumer Studio surface (`studio.html` plus scoped assets/modules) linked from the production homepage. Keep the completed homepage/service/inquiry baseline stable and reduce regression risk.

The current homepage preview may become a concise product teaser with a CTA to the Studio surface once launch gates pass.

Fallback path only if dedicated-page integration proves structurally impossible: retain an in-page Studio section while isolating all Studio JavaScript/CSS from the existing public inquiry code.

No third implementation path is authorized without a new plan review.

## 9. Implementation Order

1. Reconcile production/main, historical Studio branch and hosted Supabase source into BR03.
2. Restore repository authority for all hosted Studio logic/migrations.
3. Resolve generation kill-switch governance.
4. Remove historical website files from consideration when current `main` already supersedes them.
5. Build isolated consumer Studio frontend on BR03.
6. Wire authenticated project lifecycle and secure upload.
7. Wire generation access state and concept workflow.
8. Wire comparison/selection/deletion/retention UX.
9. Wire estimate handoff into the protected production inquiry architecture.
10. Complete test-mode commercial/payment UX without enabling live charges.
11. Complete CAPTCHA/abuse protection and reviewer security gates.
12. Run consumer acceptance, security, privacy, accessibility and failure-state matrix.
13. Founder review.
14. Only then prepare a production PR; no direct main push.

## 10. Consumer-Ready Done Definition

### CORE

- homeowner can complete the full intended Studio journey on mobile and desktop;
- secure project/session creation works;
- source photo upload/finalization works privately;
- authorized concept generation works and respects allowance/quotas;
- concepts can be retrieved, compared and selected;
- deletion/retention behavior is functional;
- estimate handoff creates the intended private lead and routes only to the authorized Shell & Co addresses;
- consumer-facing error states are complete.

### SAFE STATE

- no secrets in browser/repository;
- no public storage buckets for customer images;
- ownership/RLS/server checks verified;
- explicit OpenAI kill switch restored or formally superseded;
- no uncontrolled generation path;
- no live Stripe charge path unless separately authorized and production-reviewed;
- CAPTCHA/abuse controls verified before public upload/generation;
- no unverified public credential claims;
- concept limitations visible wherever generated content is shown.

### CLEANUP

- hosted functions and Git repository are reconciled;
- stale/superseded Studio code is not carried into BR03 merely for historical parity;
- temporary diagnostic function is removed/disabled when no longer required;
- synthetic fixtures/test projects cleaned according to governance;
- no dead UI controls, founder-demo query parameters or test-only customer copy remain in launch frontend.

### GOVERNANCE

- BR03 build record updated with actual deployed versions/evidence;
- production baseline preservation verified;
- current ownership and recipient canon preserved;
- all adopted privacy/retention/commercial terms documented;
- unresolved commercial choices remain explicitly gated rather than silently invented;
- final PR is reviewable, rollbackable and contains no unrelated website redesign.

## 11. Rollback Rule

Before any production merge, record the exact pre-merge `main` SHA. If post-merge acceptance fails, restore the prior known-good production commit through the governed Git rollback path and leave Supabase/OpenAI/Stripe configuration unchanged unless a specific cloud rollback is separately required and evidenced.

## 12. Immediate Next Action

Use BR03 in Codespaces/Copilot to perform reconciliation and build the isolated consumer Studio frontend. Do not merge, deploy, enable live Stripe, modify secrets, broaden inquiry recipients, or open unrestricted customer uploads until the corresponding BR03 gate is explicitly passed.
