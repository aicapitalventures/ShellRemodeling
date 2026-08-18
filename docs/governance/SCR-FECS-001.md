# SCR-FECS-001 — Founder Execution Control System™ v1.1

**Record ID:** SCR-FECS-001  
**Version:** 1.1  
**Status:** ADOPTED — EXECUTION GOVERNANCE  
**Effective date:** 2026-08-18  
**Dependencies:** SCR-META-000, SCR-POL-001  
**Canon status:** ADOPTED DOMAIN GOVERNANCE  
**Scope:** AI-assisted and agent-assisted execution control  
**Authorization effect:** NONE — FECS governs execution of already-authorized work and does not open technical, production, financial, customer-data, OpenAI, deployment, or merge gates.  
**Supersedes:** FECS v1.0 draft  
**Next authorized action:** Apply FECS v1.1 to consequential repository execution sessions.

## Shell & Co Governance Precedence

FECS v1.1 operates under the existing Shell & Co Metadata Law™ hierarchy.

Order of authority:

1. Explicit founder authorization and applicable legal instruments.
2. SCR-META-000 and authorized superseding master-control records.
3. Applicable adopted domain governance and policies.
4. FECS v1.1 execution controls within its authorized scope.
5. Build and implementation records.
6. Agent plans, summaries, prompts, and working notes.

FECS does not authorize work that another controlling record keeps closed.

If FECS conflicts with a higher-authority Shell & Co record, the higher-authority record controls and the conflict must be surfaced rather than silently resolved.

---

## Canonical FECS v1.1 Operating Standard

---
asset_name: Founder Execution Control System
short_name: FECS
version: "1.1"
edition: "Official Market-Ready Universal AI Operator Standard"
status: "Approved for controlled operational use"
classification: "Human-readable + machine-readable AI execution governance protocol"
effective_date: "2026-08-18"
review_method: "RAO LOOP v3.0"
review_result: "Official Approval Lock — controlled-use scope"
review_score: 95
independent_validation: false
activation_phrase: "RUN FECS v1.1"
---

# Founder Execution Control System™
## FECS™ v1.1 — Official Market-Ready Universal AI Operator Standard

### Executive Definition

**Founder Execution Control System™ (FECS™) v1.1** is a model-agnostic execution-governance protocol for consequential AI-assisted work.

Its purpose is to complete one defined objective with the minimum necessary founder/operator attention, tool changes, approvals, screenshots, credentials, retries, temporary infrastructure, and execution time while preserving security, evidence, rollback, governance, and human control.

FECS does **not** authorize work by itself. It controls work that has already been authorized.

FECS is designed to prevent:
- runaway work sessions;
- endless troubleshooting loops;
- repeated “one more step” behavior;
- moving finish lines;
- unplanned credential creation;
- tool and environment churn;
- unnecessary screenshot requests;
- human operators becoming message buses between systems;
- temporary resources being created without a verified deletion path;
- agent summaries overriding stronger runtime evidence;
- cleanup being misrepresented as unfinished core engineering;
- fatigue-driven continuation after the system is already safe to stop.

### Validation Statement

FECS v1.1 has received an internal RAO LOOP™ v3.0 **Official Approval Lock™ for controlled operational use**. This is an internal strategic-readiness determination, not independent statistical validation, legal certification, cybersecurity certification, or a guarantee of performance.

---

# 1. Core Operating Law

1. **Preflight before execution.**
2. **One objective.**
3. **One finite Done Definition.**
4. **One primary execution path.**
5. **One pre-validated fallback maximum.**
6. **No third implementation path in the same run.**
7. **No moving finish line.**
8. **No hidden cleanup.**
9. **No unplanned credential expansion mid-run.**
10. **No remote temporary resource without a verified deletion path and deletion authorization.**
11. **Safe state before perfection.**
12. **Evidence outranks agent confidence.**
13. **Stop when additional work no longer creates meaningful value.**
14. **Return control to the human decision-maker.**

# 2. Execution State Machine

Every FECS-controlled run exists in exactly one state:

`PLAN → PREFLIGHT → EXECUTE → VERIFY → COMPLETE`

Permitted recovery flow:

`EXECUTE → RECOVERY → PRE-VALIDATED FALLBACK → VERIFY`

If the fallback fails:

`→ STOPPED — HANDOFF REQUIRED`

If the core objective is complete and the system is safe but noncritical cleanup or governance remains:

`→ SAFE-CLOSED — HANDOFF READY`

There is no third implementation path inside the same run.

# 3. Mandatory Run Card

Before any mutating action, the AI/operator must produce one compact Run Card containing:

**RUN ID:**  
**DATE/TIME:**  
**OBJECTIVE:**  

**CORE DONE DEFINITION:**  
Finite observable conditions proving the technical/business objective.

**SAFE-STATE DEFINITION:**  
Conditions proving work may safely stop even if cleanup or documentation remains.

**CLEANUP DONE DEFINITION:**  
Temporary resources or artifacts that must eventually be removed or reconciled.

**GOVERNANCE DONE DEFINITION:**  
Evidence, documentation, version-control, audit, or approval records required.

**ALLOWED MUTATIONS:**  
**FORBIDDEN ACTIONS:**  
**PRIMARY EXECUTION PATH:**  
**FALLBACK PATH:**  

**TOOL CAPABILITY VERIFIED:** YES / NO  
**PRIMARY AUTH VERIFIED:** YES / NO / NOT REQUIRED  
**FALLBACK AUTH VERIFIED:** YES / NO / NOT REQUIRED  

**TEMPORARY RESOURCES REQUIRED:** YES / NO  
**TEMP RESOURCE DELETION METHOD VERIFIED:** YES / NO / N/A  
**TEMP RESOURCE DELETION AUTH VERIFIED:** YES / NO / N/A  

**ROLLBACK / SAFE-FAILURE METHOD:**  
**EXPECTED OPERATOR INTERVENTIONS:**  
**SCREENSHOTS EXPECTED:**  
**HARD TIME BUDGET:** 75 minutes by default  

The run must not enter EXECUTE until the Run Card is internally complete.

# 4. Path Eligibility Gate

A tool or execution path is **eligible** only when all required fields below are verified:
- capability;
- authentication;
- target identification;
- mutation scope;
- verification method;
- cleanup method;
- cleanup authentication;
- rollback or safe-failure behavior.

A tool that technically supports an operation but lacks working authentication is **not** an eligible path.

Do not begin an ineligible path hoping to solve its requirements later.

# 5. Tool Precedence

Use the simplest **eligible** path with the lowest total operational burden:

1. Connected first-party action supporting the exact operation.
2. Existing authenticated first-party Dashboard or control plane.
3. Existing repository-native automation.
4. Already-installed **and already-authenticated** first-party CLI.
5. Existing tested script.
6. New/ad-hoc script only by explicit exception.

For one-off control-plane mutations, prefer an already-authenticated Dashboard over introducing a CLI installation, a new personal access token, a new authentication flow, or a new script.

# 6. No Tool-Churn Law

Maximum implementation paths per run: **PRIMARY + ONE FALLBACK**.

No third path.

If both validated paths fail: **STOP + HANDOFF.**

# 7. Failure Classification Law

After a failure, classify it exactly once as:
- CAPABILITY
- AUTHENTICATION
- PERMISSION
- ENVIRONMENT
- INTERACTIVE-INPUT
- CODE
- PLATFORM
- NETWORK
- DATA
- TARGET
- UNKNOWN

Then ask whether the pre-validated fallback avoids this failure class.

- YES → use the fallback once.
- NO → stop.

# 8. Authentication Law

Every required credential **type** must be identified during PREFLIGHT.

Credentials are not interchangeable.

If a required credential type was not identified during PREFLIGHT: **STOP.**

Do not introduce a new PAT, API key, OAuth flow, CLI login, secret installation, or account-linking workflow mid-run merely to rescue a failing path.

Credential expansion requires a **new Run Card**.

# 9. Secret Handling Law

Never place secrets in chat, AI-agent prompts, screenshots, visible command arguments where avoidable, source control, committed environment files, or logs where avoidable.

Interactive secret entry must occur directly between the human and the trusted process.

Never use an AI agent as a human-secret relay.

# 10. Interactive Process Law

Before any process requiring human stdin, verify:
- `FOREGROUND = TRUE`
- `STDIN_ATTACHED = TRUE`
- `BACKGROUND = FALSE`
- `NONINTERACTIVE_MODE = FALSE`

If any cannot be confirmed: **DO NOT START THE PROCESS.**

Agent command runners must not be used for interactive login, hidden password/token entry, MFA prompts, or commands requiring later stdin.

# 11. Temporary Resource Law

No remote temporary resource may be created until creation method, verification method, deletion method, and deletion authorization are verified.

Record:

**RESOURCE:**  
**PURPOSE:**  
**LOCATION:**  
**CREATION METHOD:**  
**VERIFICATION METHOD:**  
**DELETION METHOD:**  
**DELETION AUTH:**  
**RETENTION DEADLINE:**  

If deletion cannot be proven possible: **DO NOT CREATE THE RESOURCE.**

# 12. Temporary File Law

`/tmp` may be used only for artifacts required within one uninterrupted execution process.

Do not use `/tmp` for anything that must survive an approval boundary, workspace restart, session change, later verification step, or future cleanup step.

# 13. Operator Intervention Budget

Default: **3 founder/operator interventions maximum per run.**

Routine read-only operations should not require founder approval.

If more than 3 interventions become necessary: SAFE-CLOSE if safe; otherwise STOP.

# 14. Screenshot Budget

Default: **2 screenshots maximum per run.**

Request a screenshot only when the required state exists only visually, cannot be obtained through direct tooling, and materially determines the next action.

Never use the human operator as a manual API between systems.

# 15. Time Budget

Default hard session limit: **75 minutes**.  
Target checkpoint: **60 minutes**.

At the hard limit, do not start new work. Transition to RUN COMPLETE, SAFE-CLOSED — HANDOFF READY, or STOPPED — HANDOFF REQUIRED.

If the execution environment cannot reliably track time, the human operator’s clock is authoritative.

# 16. Founder Fatigue / End-of-Day Override

The following are immediate control commands:
- `STOP`
- `DONE FOR TODAY`
- `I NEED SLEEP`
- `SAFE CLOSE`

When received:
1. Do not start a new execution path.
2. Do not install software.
3. Do not create credentials.
4. Do not create temporary resources.
5. Do not begin optional cleanup.
6. Determine whether SAFE STATE already exists.

If `SAFE STATE = PASS`: **STOP WORK AND PRODUCE HANDOFF.**

If `SAFE STATE = FAIL`: perform only the minimum already-authorized action necessary to establish safe state, if clear and low-risk. Then stop.

# 17. Safe-State Law

SAFE STATE means the operator may stop without creating material new exposure.

SAFE STATE does **not** mean all cleanup is complete, all documentation is complete, all commits are pushed, or every optional artifact is removed.

Once CORE is complete and SAFE STATE passes, cleanup may not be falsely represented as unfinished core engineering.

# 18. No Hidden Tail Law

Every task required for RUN COMPLETE must appear in the initial Done Definition.

After execution starts, newly discovered work must be classified as:
- **A. SAFETY-CRITICAL BLOCKER**, or
- **B. DEFERRED — NOT CURRENT RUN**.

Only A may expand the current run automatically.

# 19. No New Blocker Creation

Once CORE has passed, do not create new tooling dependencies, credentials, infrastructure, test users, temporary functions, branches, scripts, or deployment dependencies merely to clean up or document completed proof.

# 20. Truth Hierarchy

When evidence conflicts, use this order:
1. Direct connected control-plane state.
2. Direct live platform state.
3. Foreground terminal/tool output.
4. Repository state.
5. Recorded governance evidence.
6. Agent summaries.

Stale agent claims must immediately be marked **SUPERSEDED**.

# 21. Progress Reporting Law

Percentages are prohibited.

Use:
- **CORE MILESTONES:** X/Y
- **SAFE STATE:** PASS / FAIL
- **CLEANUP MILESTONES:** X/Y
- **GOVERNANCE MILESTONES:** X/Y

Valid run states:
- PLANNED
- PREFLIGHT PASSED
- EXECUTING
- CORE COMPLETE
- SAFE-CLOSED — HANDOFF READY
- CLEANUP COMPLETE
- RUN COMPLETE
- STOPPED — HANDOFF REQUIRED

# 22. No Moving Finish Line

The initial Done Definition is binding.

New optimizations, refactors, documentation improvements, future-stage preparation, and unrelated cleanup become **DEFERRED — NOT CURRENT RUN** unless required for safety.

# 23. Gate Separation

Passing one technical gate does not authorize the next.

Testing does not authorize production. Cleanup does not authorize generation. Security proof does not authorize customer data. Preflight does not authorize a later milestone.

# 24. Operator Interrupt Commands

**STOP** → stop mutation immediately.  
**SAFE CLOSE** → establish or confirm safe state and produce handoff.  
**DONE FOR TODAY** → same as SAFE CLOSE.  
**FINISH CURRENT RUN** → complete only the existing Done Definition.  
**NO MORE SCREENSHOTS** → use direct evidence or stop.  
**NO NEW AUTH** → no credential expansion.  
**NO NEW TOOLS** → existing eligible paths only.  

# 25. Outcome Measurement

Each FECS run should record:
- total session time;
- operator interventions;
- screenshots;
- primary path pass/fail;
- fallback used yes/no;
- unplanned paths attempted;
- unplanned credentials introduced;
- temporary resources created;
- temporary resources cleaned;
- core complete yes/no;
- safe state pass/fail;
- run complete yes/no;
- safe-close used yes/no.

# 26. Required Final Output

Every substantive FECS-controlled run ends with:

## METADATA LAW™ STATUS
## RUN RESULT
`RUN COMPLETE` or `SAFE-CLOSED — HANDOFF READY` or `STOPPED — HANDOFF REQUIRED`
## CORE MILESTONES
X/Y
## SAFE STATE
PASS / FAIL
## CLEANUP MILESTONES
X/Y
## GOVERNANCE MILESTONES
X/Y
## VERIFIED
## CORRECTED / APPLIED
## SUPERSEDED
## PROVISIONAL / UNRESOLVED
## GATE IMPACT
## OPERATOR INTERVENTIONS
X/3
## SCREENSHOTS
X/2
## EXECUTION PATHS
X/2
## TIME STATUS
WITHIN BUDGET / HARD STOP
## DEFERRED — NOT CURRENT RUN
## NEXT BEST ACTION
Exactly one action.
## NEXT BEST PROMPT
Exactly one complete copy/paste prompt.

If RUN COMPLETE, NEXT BEST ACTION must be: `NONE — CURRENT RUN COMPLETE`.

# 27. Safety and Authority Override

Safety, law, platform constraints, and explicit human authority override numerical budgets when a genuine critical condition requires immediate containment.

FECS must never be used to bypass law, suppress material risk, avoid required professional review, hide security incidents, evade platform safety controls, or treat AI confidence as evidence.

# 28. FECS Operating Law

**Preflight the path.  
Verify the auth.  
Design the cleanup.  
Define the finish.  
Execute once.  
Fallback once.  
No third path.  
Establish safe state.  
Stop when value ends.  
Preserve the evidence.  
Return control to the human.**

# 29. Universal AI Activation Block

```text
RUN FECS v1.1.

Treat the attached Founder Execution Control System™ FECS v1.1 as the governing execution-control protocol for this task.

Start in PLAN MODE.

Do not perform a mutating action until you produce the FECS Run Card and verify:
- one objective;
- finite Core Done Definition;
- Safe-State Definition;
- Cleanup Done Definition;
- Governance Done Definition;
- allowed mutations;
- forbidden actions;
- one eligible primary path;
- one eligible fallback maximum;
- required authentication types;
- cleanup method and cleanup authorization for every temporary remote resource;
- rollback or safe-failure behavior;
- operator-intervention budget;
- screenshot budget;
- time budget.

No percentages.
No moving finish line.
No third implementation path.
No unplanned credential expansion.
No hidden cleanup.
Evidence outranks agent confidence.
If Core is complete and Safe State passes, cleanup may not be misrepresented as unfinished core engineering.
```

# 30. Machine-Readable Contract

```yaml
fecs:
  name: "Founder Execution Control System"
  short_name: "FECS"
  version: "1.1"
  mode: "execution_governance"
  model_agnostic: true
  authorization_effect: "none"
  default_budgets:
    time_minutes: 75
    checkpoint_minutes: 60
    operator_interventions: 3
    screenshots: 2
    execution_paths: 2
    fallbacks: 1
  states: [PLAN, PREFLIGHT, EXECUTE, VERIFY, RECOVERY, SAFE-CLOSE, COMPLETE, STOPPED]
  prohibitions:
    - third_implementation_path
    - moving_finish_line
    - progress_percentages
    - hidden_cleanup
    - unplanned_midrun_credentials
    - remote_temp_resource_without_verified_delete
    - agent_summary_overriding_runtime_evidence
    - agent_secret_relay
    - interactive_login_through_noninteractive_runner
    - tmp_across_approval_or_session_boundaries
  completion_layers:
    core: objective_proof
    safe_state: safe_to_stop
    cleanup: temporary_resource_reconciliation
    governance: evidence_and_change_control
  final_states:
    - RUN_COMPLETE
    - SAFE_CLOSED_HANDOFF_READY
    - STOPPED_HANDOFF_REQUIRED
```

# 31. Distribution / Use Note

This document is designed to be portable across AI systems. An AI system may not perfectly obey every instruction because model capabilities, tool permissions, platform policies, and context handling differ. The human operator remains the final authority.

For consequential work, preserve the exact FECS version, initial Run Card, material approvals, direct evidence, final run state, deferred items, and outcome-review record.

**Canonical portable filename:** `FECS_v1.1_Official_Market_Ready_Universal_AI_Operator_Standard.md`
