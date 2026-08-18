# Shell & Co Remodeling™ — Repository Execution Instructions

This repository is governed by Metadata Law™ and the Founder Execution Control System™ FECS v1.1.

Before performing any substantive mutating work, read:

- `docs/canon/SCR-META-000.md`
- `docs/governance/SCR-FECS-001.md`
- the applicable domain/build record for the task

## Authority

Founder authorization and controlling Metadata Law™ records outrank agent plans, summaries, suggestions, assumptions, and convenience.

FECS controls execution of already-authorized work. FECS does not itself open a technical, production, financial, customer-data, deployment, OpenAI, or merge gate.

Never silently convert:
- a proposal into approval;
- a plan into execution;
- a successful test into production authorization;
- one gate's PASS into authorization for the next gate.

## FECS v1.1 Mandatory Kernel

For consequential work:

1. One objective.
2. Produce a Run Card before mutation.
3. Define CORE, SAFE STATE, CLEANUP, and GOVERNANCE Done Definitions.
4. Use one eligible primary path.
5. Use at most one pre-validated fallback.
6. No third implementation path.
7. Verify tool capability and authentication before execution.
8. Do not introduce an unplanned credential mid-run.
9. Do not create a temporary remote resource until its deletion method and deletion authorization are verified.
10. Do not use `/tmp` across approval/session boundaries.
11. Interactive authentication or secret entry must not run through a noninteractive/background agent process.
12. Default founder-intervention budget: 3.
13. Default screenshot budget: 2.
14. Default execution-path budget: 2.
15. Default run budget: 75 minutes.
16. Percent-complete reporting is prohibited.
17. Do not move the original finish line.
18. Once CORE is complete and SAFE STATE passes, do not misrepresent cleanup as unfinished core engineering.
19. Evidence outranks agent confidence.
20. Stop and hand off when the primary plus permitted fallback cannot safely complete the objective.

## Truth Hierarchy

When evidence conflicts:

1. Connected control-plane state.
2. Direct live platform state.
3. Foreground terminal/tool output.
4. Repository state.
5. Governance/build records.
6. Agent summaries.

Mark stale lower-level claims `SUPERSEDED`.

## Founder Interrupt Commands

`STOP`
→ Stop mutation immediately.

`SAFE CLOSE`
`DONE FOR TODAY`
`I NEED SLEEP`
→ Do not start new tools, credentials, temporary resources, or optional cleanup. Confirm or establish the minimum safe state and hand off.

`FINISH CURRENT RUN`
→ Complete only the existing Done Definition.

`NO MORE SCREENSHOTS`
→ Use direct evidence or stop.

`NO NEW AUTH`
→ No credential expansion.

`NO NEW TOOLS`
→ Existing eligible paths only.

## Repository Protection

- Do not modify or merge `main` without explicit founder authorization.
- Never commit secrets, API keys, access tokens, customer PII, private financial data, or protected records.
- Do not expose OpenAI secrets browser-side.
- Do not transmit customer photos or customer PII to an external AI provider unless the controlling gate explicitly authorizes it.
- Do not alter Supabase, OpenAI, Auth, database, production, deployment, or billing state merely because repository work is authorized.

## Required Final Status

Every substantive execution run must end with:

- `RUN RESULT`
- `CORE MILESTONES`
- `SAFE STATE`
- `CLEANUP MILESTONES`
- `GOVERNANCE MILESTONES`
- `VERIFIED`
- `CORRECTED / APPLIED`
- `SUPERSEDED`
- `PROVISIONAL / UNRESOLVED`
- `GATE IMPACT`
- `OPERATOR INTERVENTIONS`
- `SCREENSHOTS`
- `EXECUTION PATHS`
- `TIME STATUS`
- `DEFERRED — NOT CURRENT RUN`
- `NEXT BEST ACTION`
- `NEXT BEST PROMPT`

If the defined run is fully complete:

`NEXT BEST ACTION: NONE — CURRENT RUN COMPLETE`
