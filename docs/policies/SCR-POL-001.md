# SCR-POL-001 — Public Repository Safety & Information Classification Policy v1.0

**Record ID:** SCR-POL-001  
**Version:** 1.0  
**Status:** ADOPTED  
**Effective date:** 2026-08-11  
**Dependencies:** SCR-META-000  
**Canon status:** CONTROLLING PUBLIC-REPOSITORY POLICY  
**Next authorized action:** Apply this policy to every future commit and review.

## Purpose

Protect Shell & Co Remodeling, its founders, customers, workers, vendors, investors, and counterparties from inappropriate disclosure through this public GitHub repository.

## Repository Classification

`aicapitalventures/ShellRemodeling` is **PUBLIC — NON-SENSITIVE ARCHITECTURE ONLY**.

Public architecture may reference the existence, status, identifier, or dependency of a private record without exposing protected content.

## Prohibited Public Content

Do not commit:
- EINs or tax identifiers
- SSNs or other government identifiers
- dates of birth
- private home addresses
- bank names when disclosure itself is sensitive
- bank account/routing numbers
- card numbers or card credentials
- personal credit reports/scores/details
- customer PII or private communications
- signed customer contracts containing private information
- tax returns/records
- insurance policy numbers or protected policy documents
- passwords, API keys, access tokens, secrets, credentials
- private financial statements
- employee/applicant PII
- confidential vendor credentials or pricing where contractually restricted
- sensitive ownership documentation
- confidential investor information
- private signatures
- health or other regulated personal information
- unredacted identity documents
- any information whose public disclosure is unnecessary and materially increases risk

## Permitted Public Content

Subject to accuracy and rights:
- non-sensitive company architecture
- adopted public brand rules
- public website source
- sanitized templates
- non-sensitive operating workflows
- job-costing methodology without private transactions
- public policies
- build records
- public service descriptions after authorization
- real portfolio media only where rights/permission permit public use

## Private Record References

Use references such as:

`Private record exists — verification required; contents intentionally excluded from public repository.`

Do not create fake filenames or imply secure storage exists unless it actually does.

## Secret Handling

Secrets belong in approved secret-management systems/environment variables, never source files. If a secret is accidentally committed, removal from the latest file alone is insufficient; treat it as compromised, rotate/revoke it, and address repository history as appropriate.

## Customer/Project Data

Public project case studies must be permissioned and minimized. Avoid exposing addresses, access details, phone/email, payment information, private interiors beyond authorized imagery, or personally identifying information unless deliberately and validly authorized.

## AI/Generated Content

AI-generated renovation visuals may be used only when clearly presented as concepts/illustrations. They may not be represented as actual Shell & Co projects, customer homes, testimonials, or completed work.

## Enforcement

Any future repository change that conflicts with this policy is prohibited until corrected. Where uncertainty exists, default to private handling and record only non-sensitive metadata publicly.

## Change History

- v1.0 — Initial public repository safety and classification policy adopted.
