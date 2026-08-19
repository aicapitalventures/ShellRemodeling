# Shell & Co Remodeling — Public GitHub Pages Deployment

**Branch:** `build/01-ux-ui-prototype`  
**Purpose:** public launch-stage marketing site and secure nonbinding inquiry intake

**Verified public URL:** `https://aicapitalventures.github.io/ShellRemodeling/`

**Status:** active and returning HTTP 200 as of 2026-08-19 UTC

## Current deployment configuration

GitHub Pages is enabled and deploys the repository root from
`build/01-ux-ui-prototype`. The deployment branch is intentionally fast-forwarded
to the reviewed main launch commit after each accepted launch change.

Current Pages source commit:
`a5ec693271c18ce1b99d408c51787b7bf4886f46`.

## Public launch controls

The public site is customer-visible but intentionally limited to truthful
launch-stage marketing and nonbinding project inquiries.

- Public Studio photo upload and OpenAI generation are disabled.
- The inquiry form sends validated records to a private, RLS-protected Supabase
  destination and does not accept photos.
- Inquiry submission is nonbinding and does not confirm an appointment, quote,
  contract, payment or accepted job.
- Licensing, registration, insurance, bond, financing and legal-entity claims
  remain absent until verified.
- No OpenAI API key may be placed in this repository or browser JavaScript.

## Custom domain status

`https://shellremodeling.com/` is not active and returned HTTP 502 during the
2026-08-19 verification. Keep the working project URL public until all of the
following pass:

1. the custom domain is configured in GitHub Pages;
2. founder-controlled Namecheap DNS records are updated;
3. DNS and HTTPS resolve successfully;
4. `https://shellremodeling.com` is added to the private inquiry function's
   allowed-origin configuration;
5. the custom-domain inquiry workflow is tested directly.

## Production AI architecture

The proposed production path is:

`GitHub Pages frontend → secure backend/serverless endpoint → OpenAI API → approved private storage/result handling → customer UI + Shell & Co lead packet`

See `docs/website/SCR-AIVIS-001.md`.
