# SCR-STUDIO-ACCESS-001 — Remodel Studio Progressive Access, Competitive Pricing & Payment Architecture v1.1

**Record ID:** SCR-STUDIO-ACCESS-001  
**Version:** 1.1  
**Status:** ADOPTED — CONTROLLING STUDIO ACCESS / COMMERCIAL ARCHITECTURE  
**Effective date:** 2026-08-24  
**Owner authority:** Founder-authorized operating direction; Bernard Shell Jr. remains 100% owner under SCR-META-000.  
**Implementation branch:** `build/03-remodel-studio-consumer-ready`  
**Dependencies:** SCR-META-000 v1.1; SCR-CLOSEOUT-001; SCR-BR03-CONSUMER-READY-001; SCR-AIVIS-001; SCR-BR02-001; SCR-STRIPE-TEST-001; RAO LOOP™ v3.0 optimized financial review.  
**Supersedes:** prior primary-funnel assumption that a USD 19 Studio pass should gate ordinary remodeling prospects; prior mandatory USD 49 first-site-visit direction.  
**Production authority:** NONE. This record authorizes BR03 repository implementation planning/build only; production activation remains separately gated.

## 1. Product Doctrine

Shell & Co Remodel Studio™ is a progressive-access remodeling acquisition and planning workspace, not an unrestricted public AI image generator and not primarily a standalone AI-image business.

Controlling customer progression:

**Public Website → Nonbinding Project Inquiry → One Complimentary Studio Concept → Shell & Co Planning Contact → Staff-Controlled Additional Concepts → Qualified Initial In-Home Consultation → Field Verification / Estimate → Written Project Acceptance → Project Deposit → Active Project Studio → Construction / Completion**

AI concepts support visualization and contractor/customer communication. They do not control construction scope, final dimensions, price, code, permits, engineering, material availability or contractual obligations.

## 2. Inquiry Gate

A public visitor may learn about Remodel Studio but may not create unrestricted Studio projects or generate concepts.

A valid Shell & Co nonbinding project inquiry is required before customer Studio access is claimable.

The existing production inquiry system remains protected:

- Supabase `public_project_inquiries` is the system of record.
- Notification routing remains only `bernard@shellremodeling.com` and `elijah@shellremodeling.com`.
- Customer Reply-To remains preserved when a valid email is supplied.
- No prior Yahoo/Gmail recipient may be restored without a later authorized routing change.

## 3. Complimentary Concept

Each accepted legitimate inquiry may authorize **one complimentary successful Studio concept**.

Customer price: **USD 0**.

The complimentary concept is treated as a controlled customer-acquisition / project-planning expense for Shell & Co.

Only a successfully delivered concept consumes the customer allowance. Upload validation failure, provider failure, backend failure, timeout or storage failure before successful delivery shall not consume the customer's concept allowance.

## 4. Customer Claim & Durable Re-Entry

The inquiry-issued Studio unlock token is a short-lived, single-use claim credential, not the customer's permanent Studio login.

Production target:

**Inquiry → one-time claim credential → verified customer authentication → project bound to customer identity → secure later re-entry**.

The ordinary public inquiry may remain phone-led, but durable Studio re-entry should require a verified customer identity. BR03's primary implementation direction is Supabase Auth email OTP/magic-link style authentication for Studio customers, subject to repository and production-auth verification before activation.

## 5. Pre-Contract Planning Grants

After meaningful planning contact, an authorized Shell & Co staff member may grant:

- **+1 concept**, or
- **+2 concepts**.

Maximum pre-contract allowance: **3 successful concepts total**, including the complimentary concept.

Customers cannot grant their own allowance. Grants must be server-controlled and auditable.

## 6. Authorized Staff

Initial business authority for Studio project review and access grants is limited to:

- Bernard Shell Jr.;
- Elijah L. Cooley.

Repository code shall use protected role-based authorization rather than hard-coded personal identifiers. Actual Auth-user role assignment is a protected control-plane activation step and must not expose credentials or private identifiers in the public repository.

Staff capabilities may include:

- view authorized customer Studio projects and concepts;
- view source photo through short-lived private access;
- review Preserve / Change / Must-Have / planning context;
- grant +1/+2 planning access;
- grant controlled active-project access;
- add staff-only planning notes;
- update business lifecycle stage;
- perform human buildability review;
- initiate authorized payment orders when the corresponding business gate is satisfied.

Customer users may not read staff-only notes.

## 7. Human Buildability Authority

Only authorized human Shell & Co reviewers may assign the controlling status:

- **GREEN — appears feasible pending field verification**
- **YELLOW — measurement / trade / code verification needed**
- **RED — likely impractical / not recommended as rendered**

AI may identify questions but may not certify the controlling status.

## 8. Qualified Initial In-Home Consultation

The initial qualified in-home consultation is **FREE** after inquiry + Studio/planning engagement + phone/video qualification.

This supersedes the prior mandatory USD 49 first-site-visit direction.

The purpose is to remain competitive while using inquiry, Studio and planning contact to prevent unnecessary field travel and staff-time waste.

## 9. Detailed Planning / Measurement Reservation — PROVISIONAL

A later second-stage detailed planning/measurement reservation may be adopted at **USD 49** where a project requires additional field measurement, design planning, extended scope development or a return visit.

If later activated:

- payment must use governed Stripe Checkout;
- the USD 49 must be **100% creditable toward an accepted project** under the final adopted terms;
- cancellation/rescheduling/refund language must be finalized before production;
- it must not be described as a construction deposit.

Current status: **PROVISIONAL / NOT ACTIVE**.

## 10. Competitive Pricing Doctrine

Shell & Co shall internally target pricing at least **5% below a verified apples-to-apples competitive price** only when the resulting project preserves a minimum **30% projected gross margin** using actual Shell job costing.

Internal calculation:

- `competitive_target = verified_comparable_price × 0.95`
- `margin_floor = direct_job_cost ÷ 0.70`

If `competitive_target >= margin_floor`, the competitive target may guide the proposed selling price.

If `competitive_target < margin_floor`, the margin floor controls. Shell & Co shall not accept an artificial loss merely to claim a lower price.

The 5% rule is an internal pricing discipline, not a public price-beat guarantee unless separately adopted.

Free competitor services are met or exceeded by value; they cannot be mathematically discounted below zero.

## 11. Studio Commercial Model

The ordinary remodeling funnel has:

- no Studio subscription;
- no mandatory USD 19 Studio charge;
- no per-image charge for qualified remodeling prospects;
- no unlimited generation.

Historical USD 19 / up-to-three-concept Stripe architecture remains test/dormant and is not the primary customer funnel.

Standalone paid Studio access may be evaluated later as a separate commercial channel but is CLOSED under v1.1.

## 12. Project Deposit Gate

A construction/project deposit may be requested only after:

1. project planning / field verification appropriate to the job;
2. scope/estimate/proposal preparation;
3. written project agreement acceptance; and
4. server-side creation of an authorized payment obligation.

Working deposit direction: **15% scheduling/mobilization deposit — PROVISIONAL pending legal/contract review**.

The final percentage, refundability, cancellation treatment, jurisdictional requirements and contract language must be approved before live activation.

Until then the production implementation shall support an exact server-authorized deposit amount without automatically enforcing 15%.

## 13. Stripe Checkout Law

Any activated customer-facing website charge shall use governed **one-time Stripe Checkout** rather than subscriptions or arbitrary browser-supplied payment amounts.

Required sequence:

**Authorized business event → immutable server payment order → Stripe Checkout → customer payment → signature-verified Stripe webhook → independent amount/currency/purpose verification → business-state transition**.

A success redirect is never payment proof.

The browser may identify the relevant project/order but may not determine or alter the amount, currency, payment purpose, allowance or contractual state.

## 14. Authorized / Reserved Payment Purposes

Near-term intended production purpose:

- `project_deposit` — amount derived from an accepted authorized project payment record.

Provisional future purpose:

- `planning_measurement_reservation` — fixed USD 49 only if separately activated.

Architecturally reserved but CLOSED until later adoption:

- `approved_change_order`;
- `project_progress_payment`;
- `final_project_payment`;
- standalone paid Studio products.

No generic "pay any amount" function is authorized.

## 15. Active Project Studio

After accepted written project terms and verified project-deposit payment, the customer becomes eligible for **Active Project Studio**.

Initial active-project allowance: **up to 3 additional successful concepts**.

These concepts are included as a planning benefit and may help evaluate tile, shower, vanity, fixtures, finishes, accessibility or other design directions.

Further +1/+2 access may be granted by authorized staff only when it advances a legitimate project decision and remains within system budget/rate controls.

## 16. AI Cost Controls

Launch generation target remains:

- model: `gpt-image-2`;
- quality: `medium`;
- controlled source-image edit architecture;
- application software budget ceiling: **USD 20/month initially**.

No automatic budget increase is authorized. Future increases require measured usage/value evidence.

Viewing existing images or staff reviewing project information consumes no generation allowance.

## 17. CRM-Lite Business Lifecycle

Studio should support, but not conflate with the technical generation state, these business stages:

1. `inquiry_received`
2. `studio_unlocked`
3. `complimentary_concept_completed`
4. `planning_contact`
5. `planning_studio`
6. `qualified_site_consultation`
7. `site_consultation_completed`
8. `estimate_preparation`
9. `proposal_sent`
10. `proposal_accepted`
11. `deposit_due`
12. `deposit_paid`
13. `scheduled`
14. `active_project`
15. `completed`
16. `closed`

Business-stage changes must be server/staff controlled where they carry commercial effect.

## 18. Staff Project Workspace Requirement

The consumer Studio and staff workspace are separate permission surfaces over the same governed project record.

The staff view shall eventually provide:

- customer/inquiry context;
- project truth / planning context;
- original private image;
- all generated concepts;
- selected concept;
- concept allowance/grant history;
- staff-only notes;
- human buildability review;
- business lifecycle stage;
- payment eligibility/status;
- pricing-assessment outputs where authorized.

## 19. Security / Privacy

Required controls remain:

- no secrets in browser/repository;
- private source/result storage;
- short-lived signed access;
- authenticated project ownership;
- server-side authorization for staff/customer sensitive operations;
- no raw IP storage;
- no public customer photo URLs;
- 30-day default pre-estimate image/project-content retention unless the project converts and later project-record policy controls;
- separate marketing/photo-publicity consent;
- normalized public errors;
- server-side rate/spend limits;
- explicit generation enable/kill-switch control;
- no live Stripe activation without separate production gate.

## 20. Financial Doctrine

**Remodel Studio generation is primarily an acquisition and project-planning expense of Shell & Co Remodeling, not an independent profit center within the primary contractor journey. Studio access shall be granted only where it advances a legitimate remodeling opportunity or active customer project. Legitimate customers should not be unnecessarily charged for useful planning visualization, while Shell & Co retains strict control over generation volume, staff time, field travel, pricing margin and payment exposure.**

## 21. Adoption / Gate Verdict

**ADOPTED:** inquiry-gated Studio; one complimentary successful concept; +1/+2 staff planning grants; three-successful-concept pre-contract ceiling; free qualified initial in-home consultation; no subscription; no USD 19 ordinary-funnel charge; internal 5%-advantage / 30%-gross-margin doctrine; Stripe Checkout for activated charges/deposits; Active Project Studio after accepted terms + verified deposit; controlled AI budget.

**PROVISIONAL:** 15% project-deposit percentage/legal terms; USD 49 second-stage Planning/Measurement Reservation and its customer terms.

**CLOSED:** unrestricted public Studio; unlimited generations; live Stripe activation; public 5%-price-beat guarantee; generic arbitrary payments; standalone paid Studio funnel.

## Change History

- **v1.0 — 2026-08-24:** Progressive-access concept drafted: inquiry → complimentary concept → staff planning grants → site visit → estimate → deposit → active-project Studio.
- **v1.1 — 2026-08-24:** RAO LOOP™ v3.0 cost controls and competitive-pricing findings adopted; mandatory USD 49 first consultation removed; qualified initial consultation made free; possible USD 49 second-stage planning reservation made provisional/creditable; 5%-competitive / 30%-gross-margin doctrine adopted; Stripe Checkout established as the governed website payment rail; USD 19 ordinary Studio charge superseded from the primary remodeling funnel.
