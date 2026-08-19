# Shell & Co Remodeling — GitHub Pages Founder Review

**Branch:** `build/01-ux-ui-prototype`  
**Purpose:** non-production founder-review UX/UI prototype  
**Expected project URL after Pages is enabled:** `https://aicapitalventures.github.io/ShellRemodeling/`

## One-time GitHub Pages activation

GitHub Pages is not currently enabled for this repository. To publish this branch as the founder-review site:

1. Open the `aicapitalventures/ShellRemodeling` repository on GitHub.
2. Open **Settings**.
3. Select **Pages** under Code and automation.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **`build/01-ux-ui-prototype`**.
6. Select folder **`/(root)`**.
7. Click **Save**.
8. Wait for GitHub to report that the site is live.
9. Open `https://aicapitalventures.github.io/ShellRemodeling/`.

## Prototype controls

This branch is intentionally not a production customer website.

- Prior remodeling photos supplied by Bernard Shell Jr. are excluded until before/after sequencing and use status are verified.
- The photo upload stays local in the browser in this prototype.
- AI concept cards demonstrate the workflow but are not live OpenAI-generated remodels yet.
- The estimate form prepares a local prototype packet; it does not transmit customer PII.
- Licensing/registration and insurance claims remain pending verification.
- No OpenAI API key may be placed in this repository or browser JavaScript.

## Production AI architecture

The proposed production path is:

`GitHub Pages frontend → secure backend/serverless endpoint → OpenAI API → approved private storage/result handling → customer UI + Shell & Co lead packet`

See `docs/website/SCR-AIVIS-001.md`.
