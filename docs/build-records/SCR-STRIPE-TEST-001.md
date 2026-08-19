# SCR-STRIPE-TEST-001 — Stripe Test-Mode Payment Architecture

| Metadata field | Value |
|---|---|
| Record ID | SCR-STRIPE-TEST-001 |
| Version | 1.1 |
| Status | Test architecture implemented and fail-closed; commercial terms remain Proposed |
| Effective date | 2026-08-19 for technical controls only |
| Founder authority | Test-mode preparation authorized 2026-08-19 |
| Adoption status | Proposed — requires founder price/allowance adoption and test-account configuration |
| Scope | Test-mode Studio Concept Pass and future remodeling-deposit separation |
| Explicit exclusions | Live charges, live deposits, contracts, financing and production entitlement activation |
| Dependencies | SCR-META-000; SCR-FIN-001; SCR-BR02-001; verified Stripe test account |

## Proposed Studio Concept Pass

- One-time purchase; no subscription.
- Proposed price: USD 19.
- Proposed allowance: up to three concepts for one owned Studio project.
- Payment must be verified by a signed Stripe webhook before an entitlement can
  be activated.
- Browser success redirects are never payment proof.
- Price, currency and allowance are server-controlled and never accepted from
  browser input.

## Reserved Remodeling Deposit Architecture

- Separate payment purpose, order type, ledger classification and receipt path.
- Proposed amount: 15% of a server-verified authorized contract price.
- Browser input may identify an authorized contract but may not supply or alter
  the charge amount.
- Live activation remains closed until formation, banking, contract,
  jurisdictional compliance, insurance and Stripe production gates pass.
- A deposit is restricted project cash and is never represented as profit.

## Required Server-Side Records

1. `payment_orders` — owner, project/contract reference, purpose, currency,
   immutable amount snapshot, mode, status and Stripe Checkout Session reference.
2. `payment_events` — unique Stripe event ID, signature-verified processing
   status, event type and non-sensitive audit metadata.
3. `studio_entitlements` — owner/project scope, verified order reference,
   allowance, usage and revocation/refund state.

All three tables require RLS and no direct browser write policy. Service-side
webhook processing is the only entitlement activation path.

## Required Functions

### Create Checkout Session

- authenticated owner only;
- test secret must be present and identify test mode;
- server selects the adopted Stripe test Price ID;
- idempotency key and unique client request ID prevent duplicate orders;
- session metadata contains only internal non-sensitive identifiers;
- remodeling-deposit purpose fails closed until its legal/financial gate opens.

### Stripe Webhook

- public HTTP endpoint with no Supabase JWT requirement;
- raw request body preserved;
- `Stripe-Signature` verified with the endpoint secret before parsing/processing;
- unique Stripe event ID enforces idempotency;
- payment mode, currency, amount, purpose and order ownership are revalidated;
- entitlement is granted only for a paid, verified Studio order;
- refund/dispute events revoke or suspend the related entitlement as adopted.

## Configuration Gate

Implementation must fail closed unless all required test-only values are
configured server-side:

- `STRIPE_SECRET_KEY` using a test key;
- `STRIPE_WEBHOOK_SECRET` for the exact test webhook endpoint;
- adopted Studio test Price ID;
- approved success and cancel origins;
- `STRIPE_TEST_MODE_ENABLED=true`.

No secret may be committed, returned to the browser, written to proof records or
displayed in logs.

## Acceptance Tests

- duplicate Checkout creation returns/reuses one governed order;
- unsigned, malformed and replayed webhook events are rejected;
- one verified paid event creates exactly one entitlement;
- browser-altered amount/currency/purpose is ignored or rejected;
- cancellation and failed payment create no entitlement;
- refund/dispute handling changes entitlement state exactly once;
- Studio generation remains independently closed until its own gate opens;
- remodeling deposit creation remains disabled.

## External implementation references

- Stripe Checkout Session API: <https://docs.stripe.com/api/checkout/sessions/create>
- Stripe webhook signatures: <https://docs.stripe.com/webhooks/signature>
- Stripe idempotent requests: <https://docs.stripe.com/api/idempotent_requests>

## Gate verdict

- CANON CREATED: Proposed Stripe test-mode architecture record
- CANON LOCKED: No
- PROVISIONAL / UNRESOLVED: USD 19 price and three-concept allowance
- GATES OPEN: Fail-closed test records and Edge Function deployment
- GATES CLOSED: Stripe API execution, paid entitlement activation, live charges and deposits
- NEXT BEST ACTION: Founder adopts or revises the proposed Studio price and allowance, then configures test-only Stripe secrets and the signed webhook endpoint.

## 2026-08-19 implementation proof

- Hosted migration `stripe_test_mode_architecture` applied successfully.
- `payment_orders`, `payment_events` and `studio_entitlements` are RLS-enabled,
  have no browser policies and explicitly revoke `anon`/`authenticated` access.
- `create-checkout-session` version 1 is ACTIVE with JWT verification required.
- `stripe-webhook` version 1 is ACTIVE with Supabase JWT verification disabled
  only because the function requires Stripe raw-body signature verification.
- Missing/unadopted test configuration fails closed with HTTP 503
  `PAYMENT_DISABLED` before any Stripe request.
- Unsigned webhook input fails with HTTP 401 `NOT_AUTHORIZED`.
- Anonymous Data API access to payment orders fails with HTTP 401.
- No Stripe API call, Checkout Session, payment, entitlement or deposit was
  created during implementation.
- Remodeling-deposit creation is not implemented in either function and remains
  explicitly closed.

## Change history

- v1.0 — 2026-08-19: Created fail-closed test-mode architecture; no Stripe call or charge made.
- v1.1 — 2026-08-19: Applied test-only schema, deployed fail-closed Checkout/webhook functions and verified denial paths without calling Stripe.
