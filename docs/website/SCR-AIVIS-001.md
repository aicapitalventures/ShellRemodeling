# SCR-AIVIS-001 — AI Remodel Visualization & Pre-Estimate Intelligence Architecture v0.1

**Record ID:** SCR-AIVIS-001  
**Version:** 0.1  
**Status:** PROPOSED — RESEARCH-BACKED PRODUCT ARCHITECTURE / NOT CANON-LOCKED  
**Effective date:** 2026-08-12  
**Dependencies:** SCR-META-000, SCR-WEB-001, SCR-BRAND-001, SCR-OPS-001  
**Deployment status:** UX/UI PROTOTYPE AUTHORIZED; LIVE AI GENERATION NOT YET CONNECTED  
**Security rule:** No OpenAI API key may appear in GitHub Pages, browser JavaScript, repository source, or other client-side code.

## Purpose

Turn Shell & Co Remodeling’s website from a conventional contractor lead form into a guided homeowner decision system that captures the customer’s actual space, desired transformation, constraints, preferences, and selected visual direction before the first field visit.

The target outcome is not merely an AI picture. The target outcome is a **contractor-ready pre-estimate intelligence packet** that helps Shell & Co understand what the homeowner wants before a site visit while clearly separating inspiration from verified buildability, scope, price, code, measurements, and field conditions.

## Research Finding — The Basic Visualizer Is Not Unique

Current market research confirms that the following workflow already exists in multiple products and contractor websites:

1. homeowner uploads a room photo;
2. homeowner selects a style or describes desired changes;
3. AI produces one or more photorealistic remodel concepts;
4. the contractor captures the lead or sends a proposal.

Examples identified during August 2026 research include Remod, Struqo, RenovateWithAI, Olvera’s AI Remodel Visualizer, Emerald City Construction’s visualizer, See It Done, Renvision, Vistari, Inspire AI, OpenVis, AirBuild, RoomDeco AI, ProEstimate AI, and others.

Several competitors already add cost ranges, proposals, material catalogs, CRM features, branded links, and product selection. Therefore Shell & Co must not claim that photo-to-render AI visualization itself is proprietary or industry-first.

## Proposed Differentiation

The differentiation should be the **governed workflow around the visualization**.

### 1. Space Truth Intake

Before generation, the homeowner identifies:
- room type;
- what must remain;
- what may change;
- what must change;
- known dimensions if available;
- plumbing-fixture locations that should remain or may move;
- accessibility needs;
- preferred materials/colors;
- target investment band;
- desired timing;
- inspiration notes.

The original photo remains the visual source of truth.

### 2. Preserve / Change / Must-Have Controls

Instead of a generic “pick a style” interface, the homeowner explicitly defines three categories:

**PRESERVE** — elements the AI should attempt to keep visually stable.  
**CHANGE** — elements open to redesign.  
**MUST-HAVE** — desired features the homeowner considers important.

This becomes part of the prompt and the contractor packet.

### 3. Multi-Concept Generation

Generate multiple materially different concept directions from the same customer photo, for example:
- Clean Modern;
- Warm Transitional;
- Spa / Natural;
- Custom Direction.

Concept names are product UX labels, not architectural claims.

### 4. Reality Check Layer

Every AI image is labeled **CONCEPT VISUALIZATION — NOT A CONSTRUCTION DRAWING OR QUOTE**.

The system must explicitly warn that AI may depict changes that are impractical, code-constrained, structurally impossible, dimensionally inaccurate, unavailable, or outside budget.

### 5. Shell & Co Buildability Review

The proposed proprietary layer is a human-in-the-loop review after the homeowner selects a concept.

Each important requested feature can later receive a contractor review status:
- **GREEN — appears feasible pending field verification**
- **YELLOW — needs measurement/trade/code verification**
- **RED — not recommended / likely impractical as shown**

No AI model may independently certify buildability.

### 6. Precision Scope Map

Translate the chosen visual direction into scope categories for contractor review, such as:
- demolition;
- tile;
- shower/tub;
- vanity;
- fixtures;
- plumbing implications;
- electrical/lighting implications;
- flooring;
- drywall/paint;
- trim/finish;
- accessibility;
- permits/trades requiring verification.

This is a preliminary scope-assistance layer, not a final scope of work.

### 7. Before-the-Visit Intelligence Packet

When the homeowner requests an estimate, Shell & Co should receive one organized packet containing:
- customer contact information;
- original customer-uploaded photos;
- selected concept(s);
- style/material preferences;
- Preserve / Change / Must-Have selections;
- budget/timing inputs where supplied;
- preliminary scope categories;
- questions/unknowns;
- AI limitations notice;
- contractor-review status;
- lead source and timestamp.

### 8. Selection Lock & Version History

The customer can identify one preferred concept and later revisions. Every revision should retain provenance so the contractor can distinguish the original upload, AI concept version, customer-selected version, and any contractor-reviewed revision.

## Proposed Product Principle

**Visualization → Preference Capture → Buildability Review → Scope Preparation → Estimate Visit**

The competitive objective is to transform AI inspiration into a disciplined Shell & Co sales and preconstruction workflow rather than offering unlimited fantasy renders with no connection to field execution.

## OpenAI Architecture — Current Direction

OpenAI currently supports image inputs through its API and provides image generation/editing capabilities through GPT image models. The intended production architecture is:

`GitHub Pages frontend → secure Shell & Co backend endpoint → OpenAI API → secure result storage/response → GitHub Pages UI`

The browser must never call OpenAI using a secret key embedded in JavaScript.

Potential backend patterns to evaluate before implementation:
- Supabase Edge Function + Storage/Database;
- Cloudflare Worker + object storage/database;
- Vercel/Netlify serverless function + approved storage;
- another controlled backend capable of environment-secret management, rate limiting, request validation, upload controls, logging, deletion policy, and spend controls.

Backend selection is **UNRESOLVED**.

## OpenAI Processing Stages — Proposed

1. Validate file type/size and user consent.
2. Optionally moderate image/text input.
3. Analyze the uploaded room image and structured homeowner selections.
4. Compile a controlled remodel prompt that emphasizes preserving architecture/perspective unless structural change is explicitly requested.
5. Generate/edit multiple concept images.
6. Return outputs with concept metadata and disclaimers.
7. Store only what the adopted privacy/data policy authorizes.
8. Allow customer selection and estimate-request handoff.

## Safety / Accuracy Controls

The system must not:
- claim an AI concept is architecturally accurate;
- imply code compliance;
- guarantee materials are available;
- issue final pricing based only on an image;
- certify structural, electrical, plumbing, accessibility, or permit feasibility;
- represent AI-generated concepts as completed Shell & Co work;
- expose customer photos or PII through the public GitHub repository;
- expose the OpenAI API key client-side.

## Founder Remodel Photo Hold

All prior-remodel photographs supplied by Bernard Shell Jr. remain **WITHHELD FROM THE WEBSITE** until their project grouping, before/after sequence, and use authorization are verified.

The UX/UI prototype therefore uses no founder-remodel photographs.

## Intellectual Property Position

“Proprietary” may describe Shell & Co’s own code, workflow design, prompt architecture, data structures, review process, and internal operating system once actually developed and controlled by Shell & Co.

Do not claim the underlying concept of AI remodel visualization, image generation, or contractor visualization is exclusive, patent-protected, or industry-first without separate IP/legal research and appropriate evidence.

## Working Product Name

No product name is adopted by this record. The UX may temporarily use **Shell & Co Remodel Studio** as a descriptive prototype label only. A protectable product name should be separately researched and founder-approved.

## Prototype Gate

OPEN for:
- upload UX;
- local image preview;
- preference controls;
- multi-concept placeholder flow;
- contractor packet UX;
- disclosures;
- responsive layout;
- GitHub Pages demonstration.

CLOSED for:
- live OpenAI generation;
- persistent customer uploads;
- live lead storage;
- automated pricing;
- claims of buildability;
- production privacy/data retention;
- API secrets in client code.

## Change History

- v0.1 — Competitive research converted into proposed Shell & Co differentiation and secure OpenAI-backed architecture.
