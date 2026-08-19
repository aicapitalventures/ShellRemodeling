# SCR-PUBLIC-LAUNCH-001 — Public Marketing Launch & Secure Inquiry Proof

| Metadata field | Value |
|---|---|
| Record ID | SCR-PUBLIC-LAUNCH-001 |
| Version | 1.0 |
| Status | Under Review |
| Effective date | Pending deployed-site verification |
| Originating architect | Production Software / Launch / Repository Governance Architecture |
| Founder authority | Public-launch authorization supplied in the controlling prompt |
| Approval authority | Founder review |
| Adoption status | Not yet adopted |
| Branch | `build/02-secure-remodel-studio` |
| Dependencies | SCR-META-000; SCR-WEB-001; SCR-BR02-001; SCR-BR02-T08-001 |
| Supersedes | None |
| Superseded by | None |
| Modification authority | Founders or authorized repository architect |

## Scope

Prepare and verify a truthful public marketing launch that accepts private,
nonbinding project inquiries while the Remodel Studio, payments, financing,
portfolio imagery, credentials and formal business gates remain closed.

## Confirmed facts

- The approved customer call/text number is `(502) 303-2398`.
- The current service-area direction is Kentuckiana, subject to project and
  jurisdiction verification.
- The successful T08 concept and proof remain preserved.
- The OpenAI generation gate is closed and this launch work made no OpenAI call.
- Supabase migration `public_launch_inquiries` was applied to project
  `mlxboidajkqyayxjdcvh`.
- Edge Function `submit-inquiry` version 1 is active with `verify_jwt = false`
  because it implements public-endpoint origin, validation, timing, honeypot,
  HMAC IP rate-limit, duplicate and private service-role write controls.

## Public launch controls

- Public Studio photo upload and generation controls are disabled.
- The public browser cannot create an anonymous Studio session from the launch UI.
- No payment, financing, deposit, contract or appointment-acceptance control is active.
- Present-tense LLC, licensing, bond, insurance and financing claims are prohibited.
- Inquiry records are held in an RLS-enabled table with no client policies.
- No image upload is accepted through the public inquiry form.
- Marketing consent is separate and optional.
- Inquiry submission is expressly nonbinding.

## Secure inquiry acceptance proof

Test date: 2026-08-19 UTC.

| Test | Result |
|---|---|
| Valid synthetic inquiry | PASS — HTTP 201 and one private record stored |
| Duplicate inquiry | PASS — HTTP 409 `DUPLICATE_INQUIRY` |
| Invalid phone/input | PASS — HTTP 400 `INVALID_REQUEST` |
| Honeypot submission | PASS — HTTP 202 with no record stored |
| Temporary record cleanup | PASS — deleted and verified count `0` |
| RLS | PASS — enabled with no browser read/write policy |
| OpenAI call | PASS — none made |
| Payment call | PASS — none made |

## Security advisor disposition

The Supabase advisor reports the private inquiry table's lack of policies as an
informational item. This is intentional: the table must remain inaccessible to
browser roles and is accessed only by the validated service-side function.
Pre-existing BR02 anonymous-session advisories and leaked-password-protection
configuration remain separate production security gates.

## Provisional / unresolved

- The public GitHub Pages URL must be deployed, opened and tested before this
  record can advance from Under Review.
- The purchased custom domain is not represented as active until DNS and HTTPS
  are directly verified.
- CAPTCHA/Turnstile is a post-launch hardening item; the current launch endpoint
  uses honeypot, timing, rate and duplicate controls.
- Founder lead-notification routing is not yet active. Authorized users must
  review new inquiries through the private Supabase destination until routing is
  adopted and configured.
- Stripe pricing, allowances and deposits remain proposed and test-mode only.

## Next authorized action

Commit the reviewed launch diff, publish it to the authorized branch, merge the
exact reviewed diff to the Pages source branch if required, and verify the live
deployment on desktop and mobile.

## Change history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-19 | Created launch and secure-inquiry proof record. |
