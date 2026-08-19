# SCR-BR02-DATA-001 — Remodel Studio Private Photo, Retention & Consent Control v1.0

**Record ID:** SCR-BR02-DATA-001  
**Version:** 1.0  
**Status:** ADOPTED FOR BUILD ROOM 02 PROOF / PRODUCTION WORDING PENDING  
**Effective date:** 2026-08-12  
**Dependencies:** SCR-META-000, SCR-BR01-FINAL-LOCK-001, SCR-BR02-001  

## Purpose

Define the minimum privacy and data-handling controls required before Shell & Co Remodel Studio™ may transmit or retain customer project photographs.

## Data Minimization

The BR02 proof uses synthetic/test images only and stores no customer name, email, phone number, street address or other direct PII.

The production data model should collect only information required for the requested visualization, estimate workflow, fraud/abuse prevention, customer-selected communications and legally required records.

## Photo Use Purpose

Customer-uploaded project photos are collected to:

1. understand the current space;
2. generate the requested remodel concept(s);
3. preserve source/provenance for the customer's selected concept;
4. support Shell & Co's pre-estimate and human buildability-review workflow.

Upload for an estimate/visualization does **not** authorize publication, advertising, social-media use or portfolio use.

## AI Provider Disclosure

Production disclosure shall clearly state that a customer-authorized project photo and the instructions needed to create the requested concept may be securely transmitted to OpenAI as the AI generation provider. The disclosure must not imply that OpenAI is the contractor or that an AI result is a construction decision.

## Private Storage

- source images: private Supabase Storage bucket;
- generated concepts: separate private Supabase Storage bucket;
- no public object URLs;
- short-lived signed access only after ownership/authorization checks;
- no photos committed to GitHub or stored in GitHub Pages assets;
- server-side secrets only.

## Retention

Default pre-estimate retention: **30 days**.

The system shall store an explicit `retention_expires_at` timestamp when a project is created. A future production conversion-to-contract workflow may extend retention only under a separately adopted recordkeeping policy.

## Deletion

A project owner may request early deletion. The deletion flow must remove:

- source photos;
- generated concept images;
- active project rows;
- asset metadata;
- concept records;
- customer-visible buildability records tied solely to the deleted project.

A minimal non-PII audit tombstone may be retained for up to **12 months** containing only system identifiers, lifecycle event code, timestamp and non-sensitive operational reason. It must not contain raw prompt text, customer contact information, images or storage URLs.

## Marketing Consent Separation

Estimate/contact permission and optional marketing permission are separate choices.

A customer may request an estimate without opting into promotional messaging. A project photo may not be reused for marketing unless a separate affirmative photo/publicity authorization is recorded.

## Upload Validation

Initial proof:

- JPEG, PNG or WEBP only;
- declared size at signed-upload request must be ≤ 6 MiB;
- server revalidates actual bytes after upload;
- actual magic bytes/file signature must agree with allowed format;
- SHA-256 recorded;
- malformed/mismatched object deleted and marked rejected;
- user-supplied filenames are not used as storage paths.

## Abuse / Security Logging

Raw IP addresses are not stored in Remodel Studio database records for application rate limiting. If an IP signal is needed, the backend stores only a salted cryptographic hash. Logs must avoid PII, image bytes, signed URLs, secrets and raw prompt bodies.

## Production Disclosure Draft Requirements

Before production transmission is enabled, the customer-facing disclosure must answer in plain language:

- What is collected?
- Why is it collected?
- Is the photo sent to an AI provider?
- Where is it stored?
- How long is it kept?
- How can it be deleted?
- Is it used for marketing?
- What does the AI result mean and not mean?

## Gate

**PROOF GATE:** OPEN for synthetic/test images only.  
**REAL CUSTOMER PHOTO GATE:** CLOSED until dedicated backend exists, security test passes, production privacy wording is adopted, deletion is tested, and founder deployment authorization is issued.

## Next Best Action

Apply this policy through the BR02 SQL/storage/function scaffold, then validate deletion and private-object access in the dedicated Shell & Co Supabase test project.
