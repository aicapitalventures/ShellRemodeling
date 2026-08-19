# SCR-PUBLIC-LAUNCH-001 — Public Marketing Launch & Secure Inquiry Proof

| Metadata field | Value |
|---|---|
| Record ID | SCR-PUBLIC-LAUNCH-001 |
| Version | 1.2 |
| Status | Founder Approved |
| Effective date | 2026-08-19 |
| Originating architect | Production Software / Launch / Repository Governance Architecture |
| Founder authority | Public-launch authorization supplied in the controlling prompt |
| Approval authority | Founder review |
| Adoption status | Founder-authorized operational launch proof; not Canon-Locked |
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
- The customer-facing site is live at
  `https://aicapitalventures.github.io/ShellRemodeling/`.
- GitHub Pages deploys from `build/01-ux-ui-prototype`, which tracks reviewed
  main commits. Launch runtime baseline: `a5ec693271c18ce1b99d408c51787b7bf4886f46`.

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

## Public deployment proof

Verification date: 2026-08-19 UTC.

| Control | Result |
|---|---|
| Public Pages URL | PASS — HTTP 200 |
| Truthful launch-stage wording | PASS |
| Approved call/text number | PASS — `(502) 303-2398` |
| Desktop navigation | PASS — direct deployed-site browser verification |
| Mobile navigation | PASS — deployed menu DOM, links and responsive CSS verified; founder device QA remains recommended |
| Required local links/assets | PASS — static validation and deployed-page checks |
| Studio generation/photo controls | PASS — disabled and fail-closed |
| Completed-image house placeholder | PASS — suppressed by `.has-image` rule |
| Inquiry privacy/nonbinding notice | PASS |
| Public secret scan | PASS — no deployed credential found |
| Custom domain | PASS — `https://shellremodeling.com/` returns HTTP 200 over verified HTTPS |
| `www` domain | PASS — redirects to canonical `https://shellremodeling.com/` |
| Inquiry custom-origin preflight | PASS — HTTP 200 with exact allowed origin |
| Inquiry invalid-payload boundary | PASS — HTTP 400 `INVALID_REQUEST`; no inquiry created |

## Repository and deployment references

- Launch feature branch commit: `3a85be542ce09a4f8d52f8e7a0197b579645dd7b`
- Mobile-navigation branch commit: `395dea22ddbecc378ee7d24757168d70e58c83cd`
- Launch merge to main: `beadfd6f9aeb51469c3ae11c79d5db465049c432`
- Mobile-navigation merge to main and current Pages source:
  `a5ec693271c18ce1b99d408c51787b7bf4886f46`
- Pull requests: `#1` and `#2`
- Launch-proof reconciliation: pull request `#3`, main merge
  `4d93b95a4efba96800df331c9afa017d19fd037d`
- Custom-domain deployment commit on Pages source:
  `497b6802537863678c698a77999b01fd10b1c303`
- Cloud/repository parity: the Pages source contains `CNAME` with canonical domain
  `shellremodeling.com`; live root and `www` routing match that record.

## Security advisor disposition

The Supabase advisor reports the private inquiry table's lack of policies as an
informational item. This is intentional: the table must remain inaccessible to
browser roles and is accessed only by the validated service-side function.
Pre-existing BR02 anonymous-session advisories and leaked-password-protection
configuration remain separate production security gates.

## Provisional / unresolved

- CAPTCHA/Turnstile is a post-launch hardening item; the current launch endpoint
  uses honeypot, timing, rate and duplicate controls.
- Founder lead-notification routing is not yet active. Authorized users must
  review new inquiries through the private Supabase destination until routing is
  adopted and configured.
- Stripe pricing, allowances and deposits remain proposed and test-mode only.

## Next authorized action

Begin founder live QA at the verified public domain while preserving the closed
OpenAI, Stripe, deposit, contract and credential gates.

## Change history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-19 | Created launch and secure-inquiry proof record. |
| 1.1 | 2026-08-19 | Recorded verified public deployment, commits, controls and custom-domain gate. |
| 1.2 | 2026-08-19 | Verified Namecheap DNS, Pages CNAME deployment, HTTPS, canonical redirect, inquiry-origin allowlist and cloud/repository parity. |
