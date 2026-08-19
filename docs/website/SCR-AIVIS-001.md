# SCR-AIVIS-001 — AI Remodel Visualization & Pre-Estimate Intelligence Architecture v0.2

**Record ID:** SCR-AIVIS-001  
**Version:** 0.2  
**Status:** ADOPTED PRODUCT ARCHITECTURE — BR02 SECURE IMPLEMENTATION OPEN / PRODUCTION DATA CLOSED  
**Effective date:** 2026-08-12  
**Dependencies:** SCR-META-000, SCR-WEB-001, SCR-BRAND-001 v1.3, SCR-BR01-001 v1.0, SCR-BR01-PORTFOLIO-001 v1.0, SCR-BR02-001 v1.0, SCR-BR02-DATA-001 v1.0, SCR-BR02-PROMPT-001 v1.0  
**Security rule:** No OpenAI API key, Supabase service-role key, customer photo or customer PII may appear in GitHub Pages/browser source or the public repository.

## Purpose

Turn Shell & Co Remodeling’s website from a conventional contractor lead form into a governed homeowner decision system that captures the real space, requested transformation, constraints, preferences and selected visual direction before the first field visit.

The product target is not merely an AI image. It is a **contractor-ready pre-estimate intelligence packet** that separates inspiration from verified buildability, scope, price, code, dimensions and field conditions.

## Market / IP Position

Basic upload-a-room-photo → choose style → generate remodel image workflows already exist in the market. Shell & Co shall not claim that generic AI remodel visualization is industry-first, patent-protected or exclusive without separate evidence.

Shell & Co’s differentiated product layer is its governed workflow, source-truth constraints, structured preference capture, provenance/versioning, human buildability review and estimate handoff.

“Proprietary” may describe Shell & Co’s own code, workflow design, prompt compiler, data structures, review process and operating system once actually developed/controlled by Shell & Co. It does not make the underlying concept of AI image editing exclusive.

## Controlling Customer Flow

**Space Truth Intake → Preserve / Change / Must-Have → Planning Budget / Timing / Property Context → Secure Photo Intake → Multi-Concept AI Visualization → Customer Selection → Human Buildability Review → Precision Scope Map → Pre-Estimate Intelligence Packet → Shell & Co Lead Routing → Site Visit / Estimate**

## Space Truth / Preference Law

The original customer photo remains the visual source of truth.

Before generation, the customer may identify:

- project type;
- what must remain;
- what may change;
- must-have features;
- known constraints;
- accessibility needs;
- desired design direction;
- target planning-budget band;
- desired timing;
- written vision.

The prompt compiler must favor explicit Preserve/source-truth information over aesthetically convenient hallucinated geometry.

## Multi-Concept Law

BR02 supports up to four controlled concept directions, one server-side image-edit request at a time:

- Clean Modern;
- Warm Transitional;
- Spa / Natural;
- Custom Direction.

Concept labels are UX directions, not architectural claims.

## Reality-Check Law

Every generated image is governed as:

**CONCEPT VISUALIZATION — NOT A CONSTRUCTION DRAWING, ENGINEERING DRAWING, PERMIT/CODE APPROVAL, FINAL DIMENSION, MATERIAL GUARANTEE OR CONSTRUCTION QUOTE.**

AI may depict details that are impractical, dimensionally inaccurate, unavailable, code-constrained or outside budget. The concept must enter human review before controlling buildability conclusions are made.

## Human Buildability Review

Only an authorized human Shell & Co reviewer may assign:

- **GREEN — appears feasible pending field verification**
- **YELLOW — measurement / trade / code verification needed**
- **RED — likely impractical / not recommended as rendered**

No AI model may independently certify the controlling status.

## Precision Scope Map

The selected concept may be translated into preliminary scope categories for contractor review, including demolition, tile, shower/tub, vanity, fixtures, plumbing/electrical implications, flooring, finish work, accessibility and permits/trades requiring verification.

This is preconstruction assistance, not the final contract scope.

## Pre-Estimate Intelligence Packet

The future production packet may include:

- customer-authorized contact information;
- original private project photo(s);
- structured Space Truth / Preserve / Change / Must-Have;
- planning budget/timing/property context;
- generated concept metadata and selected concept;
- preliminary scope categories;
- questions/unknowns;
- human buildability review;
- AI limitation disclosures;
- provenance/version timestamps;
- lead source.

BR02 proof contains **no customer PII**.

## Backend Selection — RESOLVED

Selected architecture:

`GitHub Pages frontend → Supabase Auth/JWT → Supabase Edge Functions → private Supabase Postgres/Storage → OpenAI API → private result Storage/Postgres → authorized short-lived retrieval`

Supabase is selected for BR02 because it combines authentication, RLS, private storage, signed access, relational provenance, server-side functions and deletion controls in one manageable backend.

Cloudflare Workers/R2/D1 remains a future alternative if scale/cost warrants a migration. Firebase is not selected for the first implementation.

Shell & Co must use a dedicated Supabase project. No other venture’s project/data store may be reused.

## OpenAI Decision — RESOLVED

Initial proof:

- model: **GPT Image 2 (`gpt-image-2`)**;
- API: **Image API edits**;
- one concept per request;
- maximum four concepts/project;
- medium quality;
- 1536×1024 output target;
- WEBP output;
- provider image moderation enabled in `auto` mode;
- server-side only;
- prompt compiler: SCR-BR02-PROMPT-001 v1.0;
- raw compiled prompts not stored by default.

High-quality generation is reserved for a later measured/founder-authorized tier.

## Security / Privacy Controls

- private source/result buckets;
- short-lived signed access;
- anonymous authenticated project owner session + RLS;
- server-side ownership checks;
- signed upload authorization;
- actual byte-size and file-signature validation after upload;
- SHA-256 asset provenance;
- 30-day default pre-estimate retention;
- owner-request deletion;
- minimal non-PII deletion tombstone only;
- separate marketing/photo-publicity consent;
- no raw IP in application DB;
- no raw upstream provider error bodies returned to frontend;
- OpenAI kill switch starts closed;
- per-project/user/IP-hash quotas and monthly software budget ceiling.

See SCR-BR02-001 and SCR-BR02-DATA-001.

## Founder Project Photography — SUPERSESSION NOTE

The v0.1 blanket founder-photo hold is **SUPERSEDED** by later founder evidence and SCR-BR01-PORTFOLIO-001. The three-job project-proof archive is separately authorized/governed for website marketing use.

Founder portfolio photos and future customer Remodel Studio uploads are different data classes. Authorization to publish founder-supplied portfolio proof does not authorize publication of customer-uploaded project photos.

## Product Name

**Shell & Co Remodel Studio™** is the founder-used working product name in Build Room 02. Use of ™ identifies brand usage; this record does not assert trademark registration, exclusivity or legal clearance.

## Gate State

### OPEN

- secure code/schema scaffold;
- dedicated Supabase project creation after cost confirmation;
- synthetic-image proof;
- server-side GPT Image 2 proof after dedicated OpenAI key/budget controls;
- private signed retrieval;
- deletion/retention testing;
- human-review staff-auth testing.

### CLOSED

- real customer photos/PII;
- public production AI generation;
- live lead email/SMS transmission;
- final automated pricing;
- AI buildability certification;
- custom-domain production deployment;
- secret keys in client code;
- merge to `main`.

## Next Best Action

Create the dedicated Shell & Co Supabase project after founder cost confirmation, apply the BR02 migration with OpenAI disabled, and execute the private-upload/RLS/deletion proof before the first OpenAI image call.

## Change History

- v0.1 — Competitive research converted into proposed workflow; backend unresolved; live AI closed.
- v0.2 — Build Room 01 lock incorporated; Supabase backend selected; GPT Image 2/Image Edits selected; privacy/retention/security controls adopted; founder-photo hold supersession reconciled; BR02 secure proof gate opened while production customer data remains closed.
