# SCR-BR04-G1A-001 — Lightweight Paid-Lead Attribution Implementation Record

**Record ID:** SCR-BR04-G1A-001
**Gate:** SCR-BR04-G1A — LIGHTWEIGHT PAID-LEAD ATTRIBUTION
**Date:** 2026-09-01
**Status:** LOCAL IMPLEMENTATION READY FOR FOUNDER REVIEW
**Working Branch:** `build/04-g1a-paid-lead-attribution`
**Base Commit:** `062d563a7835452e418e5169393f33e14b81d2db`

## Purpose

Implement lightweight repository-only campaign attribution so paid Google Ads leads can be attributed from landing page through the existing Shell & Co inquiry intake system to database storage and founder notifications.

## Five Captured Attribution Fields

1. `utm_source`
2. `utm_medium`
3. `utm_campaign`
4. `gclid`
5. `landing_page` (captured as `location.origin + location.pathname + location.search`)

## Files Changed

1. `assets/app.js` — Client-side capture of the 5 query/URL parameters added to `submit-inquiry` JSON payload.
2. `supabase/functions/submit-inquiry/index.ts` — Server-side text sanitization, database insert, and formatted email notification.
3. `supabase/migrations/20260901000000_br04_g1a_paid_lead_attribution.sql` — Additive forward-only migration defining 5 nullable columns on `public.public_project_inquiries`.
4. `docs/build-records/SCR-BR04-G1A-001.md` — Implementation record (this file).

`index.html` was NOT modified.

## Production Systems Explicitly Preserved

- Inquiry recipients remain strictly: `bernard@shellremodeling.com`, `elijah@shellremodeling.com`
- Inquiry sender remains strictly: `Shell & Co Remodeling <inquiries@shellremodeling.com>`
- Customer Reply-To logic remains unchanged
- Source column value remains `public_website`
- Deduplication hash inputs remain unchanged (attribution is excluded from dedupe hash)
- IP hashing, rate limiting, honeypot, contact consent, and timing guards remain unchanged
- Remodel Studio auth, generation, storage, and credits remain locked and untouched
- Stripe integration remains untouched
- DNS, Resend domain settings, and secrets remain untouched

## Repository-Only Boundaries

- No production migration applied
- No Edge Function deployed
- No Pages deployment
- No live inquiry submitted
- No Google Ads activated
- No generation invoked
- Status: LOCAL IMPLEMENTATION READY FOR FOUNDER REVIEW
