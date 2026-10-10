# INCIDENT RADAR
## Complete Build Blueprint for the Workato Hackathon
### PRD • TRD • AIRO MCP + `wk` CLI Setup • Milestone Plan • Master Coding Prompt

**Track:** Track 1 — Orchestrator + Agents: Enterprise Agentic Workflows  
**Prepared:** 10 October 2026  
**Status:** Proposed implementation specification; not evidence that the functionality is already implemented.  
**Repository:** https://github.com/Yashwanth-585/incident-radar

> **North-star promise:** Incident Radar converts operational noise into a controlled incident-response workflow and reports an incident as *resolved only after fresh telemetry proves recovery*. The project should demonstrate a real Workato-orchestrated process, not just a dashboard, a chatbot, or a sequence of mocked success messages.

---

# How to use this document

This is the single source of truth for the build. Use it in this order:

1. Complete **Part 1: Toolchain and workspace setup**. Do not edit recipes until AIRO MCP and the CLI have been independently verified.
2. Give **Part 2: Repository baseline audit** to your coding assistant. It must inspect the actual GitHub checkout before changing files.
3. Implement the milestones in **Part 6** in order. Each milestone has a completion gate; do not advance simply because the clock says so.
4. Use the **PRD** and **TRD** as requirements, not as claims about already-working code.
5. Paste the **Master Prompt** into Cursor, Claude Code, or another coding assistant at the repository root. Then use only the milestone prompt for the phase currently being implemented.
6. Build and test the three required scenarios before adding optional integrations.

**Document truth policy:** The existing repository was assessed previously by static inspection. This document does not claim that the current build, database, AIRO connection, Workato recipes, or end-to-end scenarios have been run successfully. The first milestone must establish those facts. Workato features and connectors vary by workspace, account permissions, and environment; the team must verify them in the actual hackathon workspace.

# Executive decision

## Product direction

Build **Incident Radar: Safe, Workato-Orchestrated Incident Recovery** for the IT & DevOps domain. Preserve the existing Next.js interface and incident-correlation foundation, but focus the new work on one full loop:

**Observe → Correlate → Investigate → Decide → Authorize → Act → Verify → Communicate → Audit**

The product is successful when a judge can inject a controlled failure, see a credible diagnosis backed by event IDs, observe Workato coordinate the process, see a permitted action change the demo service, and verify from fresh telemetry that the service recovered. The product must also show when it refuses to act, requests approval, or escalates.

## Recommended developer toolchain

Use the tools together, with explicit boundaries:

- **AIRO MCP:** inspect the Workato workspace and help create/edit recipes, Genies, mappings, and platform assets through the AI assistant.
- **Workato `wk` CLI:** synchronize recipes into local files, compare local and remote state, run supported validation plugins, and push reviewed changes.
- **Recipe Linter:** deterministic checks for common recipe structure, connector actions, and mapping mistakes.
- **Recipe Visualizer:** inspect recipe JSON as a workflow graph in Cursor/VS Code.
- **Workato Developer Skills:** connector-specific authoring knowledge for datapills, action names, mappings, control flow, and schema patterns. As of the official README reviewed for this plan, a Cursor plugin was listed as pending; for Cursor, clone the skill repository and explicitly direct the assistant to read it. Do not assume its Cursor plugin is available.
- **Cursor or Claude Code:** implement the Next.js/Supabase/payment-demo application and coordinate the tooling. It should not make policy decisions that belong in deterministic server code.

**Recommended rule:** AIRO MCP is the platform-aware authoring interface; `wk` is the local inspection, versioning, and synchronization interface. Do not edit the same recipe in AIRO and locally at the same time. Pull and reconcile between modes to prevent overwrites.

## Scope discipline

The MVP includes a normalized incident, one Triage Genie, one orchestrator recipe, a policy service, an action gateway with three allow-listed actions, a verifier, one approval path, one fallback path, a live execution page, a Recovery Receipt, and a replay mode. Defer incident merging, learning claims, multiple monitoring vendors, PagerDuty, MCP exposure, elaborate graphs, and production-scale multi-tenancy.

---

# Part 1 — Connect AIRO MCP and Workato CLI first

## 1.1 Prerequisites

Have these ready before starting:

- Windows 10/11, PowerShell, Git, Node.js with `node`/`npm` available, and Cursor or Claude Code.
- Access to the Incident Radar repository.
- A Workato account with **AIRO access** and permission to work in a development/sandbox environment.
- Access to a Workato API client and role that has only the permissions needed for the `wk` CLI operations you intend to use.
- A Supabase development project, or an explicit local-only mode while the database is being configured.
- A test Slack workspace/channel if Slack is part of the demo.

Run initial checks:

```powershell
node --version
npm --version
git --version
```

If you use Cursor with a local MCP process, make sure the Cursor agent is configured to run on **your local computer**, not in a cloud agent environment. The AIRO Cursor setup uses `npx`; Workato's instructions warn that the local command may not be available to remote cloud agents.

## 1.2 Choose the correct AIRO MCP URL

The AIRO MCP endpoint depends on the Workato data center. Sign in to the workspace and identify its actual data center before configuring MCP. Do not choose a URL based on your physical location.

| Workato environment/data center | AIRO MCP URL |
|---|---|
| US | `https://app.workato.com/airo_mcp` |
| EU | `https://app.eu.workato.com/airo_mcp` |
| JP | `https://app.jp.workato.com/airo_mcp` |
| SG | `https://app.sg.workato.com/airo_mcp` |
| AU | `https://app.au.workato.com/airo_mcp` |
| IL | `https://app.il.workato.com/airo_mcp` |
| KR | `https://app.kr.workato.com/airo_mcp` |
| UK | `https://app.uk.workato.com/airo_mcp` |
| Developer Sandbox / trial | `https://app.trial.workato.com/airo_mcp` |

The China data center is not listed as supported for AIRO MCP in the current documentation. Check the official page again before setup because availability can change: https://docs.workato.com/en/airo/mcp.html

## 1.3 Connect AIRO MCP to Cursor on Windows (recommended interactive route)

1. Sign in to the **target Workato workspace and environment** in your browser first. OAuth scopes the connection to the workspace/environment active during authorization.
2. In the Incident Radar repository root, create `.cursor/mcp.json` if it does not exist.
3. Use this project-scoped configuration, replacing the URL with your actual Workato data-center URL:

```json
{
  "mcpServers": {
    "workato-airo-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://app.trial.workato.com/airo_mcp"
      ]
    }
  }
}
```

4. Save the file and start a **new Cursor agent chat** so it reloads the MCP tools.
5. When prompted, complete the Workato OAuth flow in the browser and authorize the connection.
6. In Cursor, verify the MCP server shows as connected and ask: **“Use AIRO MCP in read-only mode. List the Workato projects and environments available to my account. Do not create or modify anything.”**
7. Confirm the result matches the workspace/environment you intended to target.

For a US workspace, use `https://app.workato.com/airo_mcp` instead. For example, if your workspace is not in the trial environment, do not keep the trial URL just because it appears in this example.

**Important:** OAuth is the recommended interactive method. Do not paste a long-lived token into the repository, `mcp.json`, a prompt, or a screenshot. If API-token authentication is required, use the official AIRO instructions, enable AIRO MCP on the relevant API client role, store the token securely, and scope its permissions as narrowly as practical.

## 1.4 Optional: connect AIRO MCP to Claude Code

Use the actual data-center URL:

```powershell
claude mcp add --transport http workato-airo-mcp-server https://app.trial.workato.com/airo_mcp
claude /mcp
```

Choose the server, authenticate in the browser, and verify that it is connected. For a non-trial workspace, replace the URL with the correct endpoint. See the official setup instructions for other clients and API-token authentication: https://docs.workato.com/en/airo/mcp.html

## 1.5 Install Workato `wk` CLI on Windows

Use the currently documented Workato Labs Scoop package:

```powershell
scoop bucket add workato https://github.com/workato-devs/scoop-bucket
scoop install workato/wk
wk version
```

If Scoop is not installed, first follow the official Scoop installation instructions. If installation fails, consult the current `wk` release/README rather than silently switching to an old or deprecated CLI.

Official source: https://github.com/workato-devs/wk

## 1.6 Create a least-privilege Workato API client for `wk`

In Workato:

1. Open **Workspace Admin → API clients → Client roles**.
2. Create a role with the documented minimum permissions required for your intended operations. The `wk` project README names Workspace details and Projects → Recipe Lifecycle Management, including both recipe lifecycle and export-manifest permissions for push/pull. Add only the metadata/features actually needed.
3. Create an API client, assign the role, and scope it to the development environment/project where possible.
4. Securely copy the token shown at creation. Never commit it.
5. Authenticate `wk` using your actual environment and region:

```powershell
wk auth login --token <WORKATO_API_TOKEN> --environment <YOUR_WORKATO_ENVIRONMENT> --region trial
wk auth status
wk auth list
```

Use `--region trial` only for a Developer Sandbox. The current CLI lists `us`, `eu`, `jp`, `au`, `sg`, `il`, `cn`, and `trial` as accepted regions. Use the region that matches the workspace. The environment value must be the actual Workato environment name, not a guessed label.

The CLI stores credentials in the system keychain by default. Keep `.wk/` local state and environment files out of Git if they contain local configuration or identifiers that should not be shared.

## 1.7 Initialize and pull the Workato project

First inspect:

```powershell
wk --help
wk init --help
```

Then initialize a dedicated Workato asset workspace. If the project is a new local sync container, the documented pattern is:

```powershell
mkdir workato-assets
Set-Location workato-assets
wk init --project "Incident Radar"
wk pull
wk status
wk diff
```

If a Workato project already exists and you are registering an existing local folder structure, use the existing-project/verification pattern documented by `wk` (for example, `wk init --projects-dir <path> --verify`) after reviewing `wk init --help`. **Do not accidentally create a duplicate production project.** Confirm project names and IDs before write operations.

After pulling, inspect the generated `.wk/wk.toml`, local recipe JSON, and `.meta.json` sidecars. Confirm `.wk` is ignored by Git as intended; check whether recipe JSON should be version-controlled for this project. Normally, the recipe files themselves are valuable reviewable source assets, while local sync state and credentials should not be committed.

## 1.8 Install Recipe Linter and Recipe Visualizer

Follow the current Workato Labs installation guide. The documented Windows sequence is:

```powershell
scoop bucket add workato-devs https://github.com/workato-devs/scoop-bucket
scoop install recipe-lint
wk plugins install recipe-lint
wk plugins list
```

If Scoop reports a package conflict or missing manifest, stop and follow the latest instructions at https://github.com/workato-devs/labs rather than guessing a package name. Then install the **Recipe Visualizer** extension in Cursor:

```powershell
cursor --install-extension WorkatoLabs.recipe-visualizer
```

If the `cursor` command is unavailable, install the extension through Cursor's Extensions marketplace by searching for **Recipe Visualizer**.

Use the visualizer to inspect branching and action order; use linting to catch common structural problems. Passing lint does not prove the recipe is behaviorally correct or secure.

## 1.9 Workato Developer Skills setup

Official repository: https://github.com/workato-devs/recipe-skills

The current repository describes connector-specific guidance for recipe JSON, datapills, action names, schema, control flow, and connector limitations. The published plugin installation paths include Claude Code and Codex; Cursor plugin support was listed as pending in the README reviewed for this plan.

For Cursor, use a local reference checkout:

```powershell
Set-Location $HOME
git clone https://github.com/workato-devs/recipe-skills.git workato-recipe-skills
```

Then tell the coding assistant to consult `$HOME/workato-recipe-skills/README.md` and the relevant base/connector skill folders before generating recipes. Do not assume this repository is a runtime dependency of Incident Radar; it is developer guidance. For Claude Code, follow the plugin installation instructions in the official skills README.

## 1.10 Establish a safe authoring and synchronization loop

Use this loop for every meaningful recipe change:

1. **Inspect:** AIRO MCP lists the relevant asset, its current steps, connections, and available operations. Ask for read-only inspection first.
2. **Plan:** Write the recipe's trigger, inputs, output contract, steps, failure branch, and callback contract before editing.
3. **Author:** Use AIRO MCP for platform-aware creation/editing, or edit the pulled local asset and push with `wk`. Choose one editing path for a given change.
4. **Synchronize:** If AIRO changed the remote asset, pull before making more local edits. If you edited locally, inspect `wk status` and `wk diff` before pushing.
5. **Validate:** Run the linter where supported and inspect the graph in Recipe Visualizer.
6. **Review:** Verify no credentials are hardcoded, every action has error handling, and callbacks include a stable `run_id` and `step_key`.
7. **Push:** Push only to the development workspace and only after reviewing the diff.
8. **Smoke test:** Trigger one real Workato job, inspect the job history, and confirm the expected callback appears in Incident Radar.
9. **Commit:** Commit local code/recipe asset changes and note the tested Workato job ID in the development log (not a secret).

**Never let AIRO MCP and `wk push` compete against each other on the same unsynchronized recipe.** A remote AIRO edit may be overwritten by a stale local asset. Pull, diff, reconcile, and only then continue.

## 1.11 First AIRO MCP prompt: read-only workspace audit

Paste into the connected AI coding assistant:

```text
Use AIRO MCP in READ-ONLY mode. Inspect the active Workato workspace and environment for Incident Radar. List existing projects, relevant recipes, Genies, available HTTP and Slack connections, callable-recipe options, supported structured Genie outputs, trigger types, approval mechanisms, and job-inspection tools. Do not create, start, stop, delete, or modify assets. Separate verified capabilities from assumptions. State which permissions or features are missing. Do not invent recipe names or connector capabilities.
```

Gate: you can name the target project/environment, see the required existing assets/connections, and know which features are available. If this gate fails, resolve access or adjust the design before building the workflow.

---

# Part 2 — Repository baseline and design decisions

## 2.1 Current repository: what is known and what must be verified

The public repository is a Next.js/React/TypeScript/Tailwind application with existing incident/event/service UI, a correlation engine, mappers, Supabase support, and a simulation view. The prior static review identified hardcoded simulation results, silent mock-data fallbacks, and inconsistencies in how evidence/timelines are represented between ingestion paths. These findings must be rechecked against the branch actually used for development.

Do not assume an ingestion route exists simply because an earlier PRD says it does. Verify the actual route files and call sites. If a function or route is missing, create it or adapt a verified implementation and update this spec as needed.

## 2.2 Inspect before editing

Inspect at minimum:

- `README.md`, `package.json`, `.env.example`, `.gitignore`, `.gitattributes`.
- `src/lib/api.ts`, `src/lib/mappers.ts`, `src/lib/ingest.ts`, correlation engine code, existing types, and all API route files.
- Supabase SQL schema, migration files, generated types, and RLS policies.
- Current pages and whether each reads mock data, Supabase, or both.
- Existing tests and npm scripts.
- `.env*` handling and Git history for potential credentials. Report secret **names and file/commit locations only**; never print secret values.

Run the installed package manager's install command consistent with the lockfile, then lint, tests, typecheck (if present), and build. Record exact exit codes and failures. Do not claim the application is working if these commands fail.

## 2.3 Target repository layout (adapt after inspection)

```text
incident-radar/
  src/
    app/
      api/
        ingest/route.ts
        demo/scenario/route.ts
        agent/start/route.ts
        agent/events/route.ts
        agent/runs/[id]/route.ts
        policy/decide/route.ts
        actions/execute/route.ts
        verify/route.ts
        runs/[id]/finalize/route.ts
        approvals/[id]/decision/route.ts
        control/route.ts
      lab/page.tsx
      runs/[id]/page.tsx
      approve/[id]/page.tsx
    lib/
      api.ts
      mappers.ts
      ingest.ts
      policy.ts
      evidence.ts
      state-machine.ts
      action-gateway.ts
      verifier.ts
      signing.ts
      recovery-receipt.ts
      workato-client.ts
    types/
  services/
    payment-demo/
      src/server.ts
      src/metrics.ts
      src/scenarios.ts
  supabase/
    migrations/
  scripts/
    fake-workato.ts
  tests/
    unit/
    integration/
    e2e/
  workato-assets/        # local Workato recipe project/sync files; follow wk config
  docs/
    baseline-report.md
    runbook.md
```

This is a proposed target layout, not a claim about files already present. Reuse existing modules where sound and avoid introducing a second data-access layer.

## 2.4 Core architectural decisions

1. The Next.js application owns canonical incident evidence, deterministic evidence grading, policy decisions, action authorization, run state, approval validation, recovery verdicts, audit records, metrics, and Recovery Receipts.
2. Workato owns orchestration order, invoking the Triage Genie, supported approval/notification flows, connector actions, waits/retries within defined bounds, and callbacks carrying `run_id` plus stable `step_key`.
3. The Genie returns a schema-validated assessment and an action **proposal**, never an authorization decision.
4. The action gateway accepts only named catalogue actions. The caller cannot provide an arbitrary URL, shell command, SQL statement, deployment ID, or target.
5. Prefer a separate, locally or publicly reachable Node.js `payment-demo` service whose health/metrics endpoints are read independently by the verifier. If time forces a database-backed simulation, label it explicitly as simulated and do not describe it as independent service telemetry.
6. The app controls the truth state. Workato callbacks report attempted workflow steps; they cannot unilaterally mark a run resolved.
7. The first version uses three bounded scenarios and one Triage Genie. Add further agents only if the existing flow is already reliable and a distinct role is justified.
8. Live, dry-run, simulation, and replay modes are visibly different. Live mode never silently falls back to mock data.
9. All external inputs are treated as untrusted, including event text that may contain prompt-injection instructions.
10. “Resolved” requires fresh, consecutive healthy telemetry samples; an HTTP 200, a Genie statement, or a completed Workato job is not enough.

---

# Part 3 — Product Requirements Document (PRD)

## 3.1 Product summary

**Name:** Incident Radar  
**Category:** Enterprise agentic workflow / IT & DevOps incident response  
**Primary user:** On-call engineer  
**Secondary users:** Incident commander, platform/policy owner, hackathon judge  
**Primary outcome:** Reduce time and coordination required to remediate an eligible incident while preserving human control, safety, and a verifiable audit trail.

## 3.2 Problem statement

Operational systems can emit many related alerts after one underlying failure. Engineers must manually correlate events, investigate a plausible cause, choose a remediation, coordinate across communication/deployment/ticketing tools, and verify that the service recovered. A system that only summarizes alerts or recommends a fix does not complete the process.

Incident Radar groups events into an incident, uses a Triage Genie to produce a structured evidence-based assessment, applies a deterministic policy, invokes Workato to orchestrate an authorized action, verifies actual service recovery, communicates the outcome, and records a Recovery Receipt.

## 3.3 Product promise

> Incident Radar resolves only eligible incidents whose recovery is verified by fresh telemetry. If evidence is insufficient, policy blocks the action, approval is rejected/expired, telemetry is unknown, or remediation fails, the system records the reason and follows the bounded escalation path.

## 3.4 Goals

- Demonstrate one complete Workato-orchestrated enterprise workflow.
- Preserve the existing UI and correlation foundation where validated.
- Resolve the happy-path controlled incident without human intervention.
- Request approval for an uncertain case and resume only after a valid decision.
- Handle failure of the primary remediation with at most one configured fallback.
- Ensure zero unauthorized modifying actions in the defined test suite.
- Make evidence, decision rules, execution steps, telemetry samples, and final outcome visible.
- Calculate performance metrics from stored run data, not hardcoded demo values.
- Provide a clearly labelled replay mode and a backup demonstration path.

## 3.5 Non-goals for the hackathon MVP

- Production-wide access to real workloads or unrestricted shell execution.
- Multiple tenants, billing, or complex user administration.
- Full monitoring ingestion from Datadog, New Relic, GitHub, PagerDuty, etc.
- Automatic incident merging and complex dependency graphs.
- Claims of self-training or learning unless a measurable, tested learning mechanism is built.
- MCP exposure of the app, broad multi-agent hierarchies, or many redundant Genies.
- Production-grade high availability or formal compliance certification.
- Any claim that a simulation demonstrates real-world production reliability.

## 3.6 User personas and needs

| Persona | Need | Incident Radar response |
|---|---|---|
| On-call engineer | Avoid manually correlating dozens of alerts; understand the proposed fix | Single incident, evidence links, policy reasons, action timeline |
| Incident commander | Know current state, owner/action, impact, and ETA | Live run console, escalation status, measured recovery |
| Policy owner | Control which actions can run automatically | Allow-list, policy rules/version, kill switch, dry-run, audit |
| Reviewer/judge | Verify the solution is truly agentic and safe | Live Workato job, visible handoffs, controlled failure scenarios, Recovery Receipt |

## 3.7 Required user journeys

### J1 — Autonomous recovery

A controlled bad deployment degrades the payment demo service. The event pipeline creates and persists an incident. Triage Genie returns a structured assessment with evidence IDs and a catalogue action. The application validates the assessment, computes evidence grade, and applies policy. If the action is eligible, Workato calls the action gateway. The gateway re-checks authorization, executes rollback, and records the result. Workato polls the verifier through a bounded loop. When three consecutive fresh healthy samples meet criteria, the app transitions the run to resolved and produces a Recovery Receipt. Workato sends a truthful Slack summary.

### J2 — Human approval

A scenario has insufficient/contradictory evidence. The policy returns ASK under a soft rule and creates an expiring approval bound to the exact action/run/policy version. The user sees evidence IDs, action, limitations, and expiry. If approved, the gateway re-evaluates policy and re-checks hard rules immediately before action. If rejected or expired, nothing modifies the demo service and the run escalates.

### J3 — Failed remediation and fallback

The scenario forces rollback to fail. The failed action is recorded. The runbook permits one feature-flag fallback. The system tries the fallback only if the gateway authorizes it, then re-verifies. If recovery succeeds, it resolves with a receipt showing the failed primary and successful fallback. If fallback fails or telemetry is unknown, the system escalates or fails explicitly; it never reports verified recovery.

### J4 — Kill switch and dry-run

When the kill switch is active, no modifying action executes regardless of Genie recommendation or earlier policy result. In dry-run, the request is recorded as simulated and the demo service is unchanged. The run page visibly displays the mode.

### J5 — Duplicate request/callback

A duplicate callback with the same `(run_id, step_key)` returns the existing step. A duplicate modifying action with the same action idempotency key returns the stored execution record and performs no second side effect.

### J6 — Unknown telemetry

Missing, stale, malformed, or unavailable metrics produce `unknown`, never `healthy`. Unknown prevents resolution and follows the specified failure/escalation policy.

## 3.8 Functional requirements

| ID | Requirement | Priority / acceptance evidence |
|---|---|---|
| FR-01 | Existing incidents/events read consistently from the canonical database path | P0; reloading a page shows persisted values |
| FR-02 | Accept and validate an incident/event bundle | P0; invalid payload rejected with structured error |
| FR-03 | Normalize event timestamps, IDs, relationships, and evidence into a single canonical model | P0; same result for all supported ingestion paths |
| FR-04 | Scenario lab creates a real controlled failure and generated events | P0; stored events and service metrics change |
| FR-05 | Create one idempotent agent run per scenario/run key | P0; repeated start returns the same run |
| FR-06 | Invoke a Workato webhook and retain its job identifier where available | P0; job visible on run page |
| FR-07 | Validate structured Triage Genie output and referenced evidence IDs | P0; invalid/missing IDs rejected or treated as invalid triage |
| FR-08 | Apply deterministic ACT/ASK/NOTIFY rules with stable rule IDs and policy version | P0; full policy matrix unit-tested |
| FR-09 | Keep the action gateway server-side and strictly allow-listed | P0; arbitrary URL/command/action is rejected |
| FR-10 | Re-check policy, current approval, kill switch, and dry-run immediately before action | P0; kill-switch flip after triage blocks execution |
| FR-11 | Enforce action idempotency under concurrent duplicate calls | P0; one side effect in concurrency test |
| FR-12 | Verify service recovery from independent fresh telemetry | P0; three consecutive healthy samples required |
| FR-13 | Distinguish recovered, not recovered, and unknown telemetry | P0; telemetry outage never resolves a run |
| FR-14 | Request, approve, reject, expire, and resume an ASK run | P0; no action while pending; all decisions recorded |
| FR-15 | Execute at most one approved fallback | P0; fallback loop is bounded and auditable |
| FR-16 | Record every run step idempotently | P0; duplicate callback produces one row |
| FR-17 | Generate Recovery Receipt from stored records only | P0; receipt fields match database rows |
| FR-18 | Display live run status and actor/action chronology | P0; updates within a short poll interval or realtime event |
| FR-19 | Display metrics computed from actual runs | P1; fixture tests verify calculations |
| FR-20 | Support explicit replay mode | P1; replay banner always visible and no live actions run |
| FR-21 | Support kill switch and dry-run controls with privileged access | P0; control changes are logged and unauthorized toggles fail |
| FR-22 | Provide an auditable Workato/recipe development workflow | P0; AIRO and `wk` access verified; recipe change path documented |

## 3.9 Non-functional requirements

- **Safety:** A modifying action must be denied when a hard rule fails. Only the gateway executes actions.
- **Reliability:** Bounded retries; no unbounded agent loops; idempotent callback and action handling.
- **Latency:** Policy evaluation should be a short deterministic server operation. Recovery latency is determined by the verifier window and should be reported honestly.
- **Freshness:** A health sample must be timestamped and within a strict freshness limit (initial target: 5 seconds at sample evaluation).
- **Auditability:** Record actor, action, run, policy/rule IDs, approval ID, status, timestamps, and concise input/output metadata. Avoid storing secrets or sensitive payloads.
- **Security:** Least-privilege Workato API client; environment-scoped tools; RLS; server-only service key; authenticated Workato callbacks; no secrets in Git/client bundles.
- **Usability:** The active mode and actual state are visible. Unknown and failed states are not rendered as green/healthy.
- **Testability:** Policy, state machine, verification, signing, idempotency, and metric calculations are unit-testable.
- **Portability:** Local fake-workato exists only for local testing/replay, never silently in live demo mode.

## 3.10 Proposed demonstration success metrics

These are targets to validate, not existing results:

| Metric | Target | Measurement rule |
|---|---|---|
| Happy-path verified recovery | 100% across at least 10 clean test runs before demo | Run ends resolved only after verifier passes |
| Unauthorized modifying actions | 0 | Count gateway tests/actions not authorized by current policy |
| Duplicate side effects | 0 | Concurrent duplicate-action test has one target mutation |
| False resolved states | 0 | Unknown/unhealthy telemetry never resolves a run |
| Approval safety | 100% of pending/rejected/expired approval tests perform no modification | Inspect action executions and service state |
| Run-step logging | 100% of expected steps linked to one run | Compare scenario execution to stored steps |
| Median recovery duration | Report measured median from repeated trials | Do not present an illustrative baseline as measured fact |
| Alert compression | Report only from actual event input and correlation output | Use measured counts; explain denominator |

## 3.11 Risks and mitigations

| Risk | Mitigation |
|---|---|
| AIRO MCP entitlement unavailable | Confirm access during setup; if unavailable, build recipes manually and continue with CLI where its APIs/permissions suffice |
| Workspace lacks an expected Genie/approval/connector feature | Verify before design freeze; use a supported approval page/HTTP path rather than assuming a feature exists |
| Recipe edited remotely and local CLI pushes stale asset | One editor per change; pull/diff/reconcile before switching tools |
| Workato webhook/callback fails | Persist dispatch step first; bounded retry; explicit failed/escalated run; keep local fake-workato for tests only |
| AI produces incorrect action | Schema validation, evidence-ID validation, deterministic policy, allow-list, gateway re-check |
| Duplicate action | Atomic idempotency reservation before side effect; concurrency tests |
| Service recovers more slowly than verifier window | Align simulator recovery time and verifier window; measure and test timing; avoid nested full verification loops |
| Dashboard hides backend failure | No silent mock fallback in LIVE mode; visible mode and errors |
| Scope creep | Protect P0 gates; defer optional integrations |
| Secrets appear in Git | Scan current tree/history; rotate exposed credentials; server-only env vars and least privilege |

## 3.12 Definition of done

The hackathon MVP is done only when:

1. A clean checkout can be configured using documented environment variables.
2. A scenario generates and persists actual event rows and creates one run.
3. A real Workato job invokes the Triage Genie and calls back to the application.
4. The application validates the result and computes policy independently.
5. A permitted action modifies the controlled demo service through the gateway.
6. The verifier receives fresh telemetry and only resolves after three consecutive healthy samples.
7. The low-evidence scenario pauses and handles approve/reject/expiry correctly.
8. The rollback-failure scenario performs one allowed fallback or honestly escalates.
9. Duplicate calls, dry-run, kill switch, and missing telemetry pass tests.
10. The run page and Recovery Receipt match persisted records.
11. All essential scenarios pass repeatedly after reset.
12. A backup recording exists, and the live/replay/simulation modes are labelled accurately.

---

# Part 4 — Technical Requirements Document (TRD)

## 4.1 Technology and ownership

| Layer | Technology / owner | Responsibility |
|---|---|---|
| Web app | Existing Next.js App Router / React / TypeScript / Tailwind | Dashboard, lab, run page, approval UI, API routes |
| Database | Supabase Postgres | Canonical incident/run/approval/action/sample records and RLS |
| Ingestion/correlation | Existing mapper and correlation code after validation | Normalize and group events into incidents |
| Policy and state | Pure TypeScript modules | Evidence grade, rule evaluation, state transitions |
| Orchestration | Workato recipes and Triage Genie | Work ordering, task delegation, Slack notification, callbacks |
| Demo target | Separate Node.js payment-demo service preferred | Deterministic fault injection, action execution, metrics endpoint |
| Dev tooling | AIRO MCP, `wk`, Recipe Linter, Recipe Visualizer, Developer Skills | Workato authoring, sync, inspection, validation |
| Test harness | Vitest/Jest as repo supports, integration scripts, `fake-workato.ts` | Unit tests, local test flow, deterministic scenarios |

## 4.2 Data flow

1. `/api/demo/scenario` chooses a named scenario from a fixed enum and resets the demo target to known state.
2. The scenario launcher causes the demo service to degrade and generates timestamped events with stable IDs and causal metadata.
3. The existing correlation logic processes the events, producing a normalized incident with event references and relationships.
4. The server persists the incident bundle and creates an `agent_run` with a unique idempotency key.
5. The app logs the dispatch step before calling the Workato trigger webhook.
6. Workato logs `workato.started`, passes canonical evidence and an action catalogue to the Triage Genie, and submits the structured output to `/api/policy/decide`.
7. The app validates schema and evidence IDs, computes evidence grade, evaluates policy, stores the decision/rule IDs/policy version, and returns ACT, ASK, or NOTIFY.
8. ACT: Workato calls the action gateway for the primary action, then polls the verifier according to its state response. If the primary failed or recovery did not pass, one fallback may be run if policy permits and it has not already run.
9. ASK: the run becomes `awaiting_approval`; the approval page shows the exact action/evidence/rules/expiry. On an authorized decision, the app records it and triggers a Workato resume flow. The gateway re-evaluates policy and approval before action.
10. NOTIFY or failed recovery: Workato sends a factual message and finalizes as escalated/failed; the app computes the actual final outcome.
11. The app builds the Recovery Receipt from persisted rows and computes dashboard KPIs from recorded run data.

## 4.3 State machine

Allowed primary transitions:

```text
created -> triaging -> policy_decided
policy_decided -> executing                    (decision ACT and action authorized)
policy_decided -> awaiting_approval             (decision ASK)
policy_decided -> escalated                     (decision NOTIFY / hard block)
awaiting_approval -> executing                  (approval valid and policy still permits)
awaiting_approval -> escalated                  (rejected or expired)
executing -> verifying
verifying -> resolved                           (only verifier verdict = recovered)
verifying -> executing                          (one allowed fallback, once)
verifying -> escalated                          (not recovered after fallback / policy escalation)
any non-terminal state -> failed                (unrecoverable internal error or unknown telemetry policy)
any permitted non-terminal state -> cancelled   (explicit authorized cancellation)
```

Every state change goes through a single `transitionRun()` function that checks allowed transitions. Do not let UI code or Workato payloads directly set arbitrary run status. Finalization is computed by the app; the callback can request an outcome but not dictate it.

## 4.4 Policy design

Use a pure, deterministic policy module with stable rule IDs and `POLICY_VERSION = 'demo-policy-v1'`. Evidence grade is computed from canonical events, not accepted from the Genie.

Suggested rule order:

- `R1_KILL_SWITCH`: kill switch on → NOTIFY / block all modifying actions.
- `R2_ACTION_NOT_ALLOWED`: action absent or outside catalogue → NOTIFY / block.
- `R3_TRIAGE_INVALID`: output malformed or citations reference nonexistent evidence → NOTIFY or ASK without executing; hard rule blocks the action.
- `R4_LOW_EVIDENCE_REVIEW`: evidence grade low → ASK (soft review rule).
- `R5_MEDIUM_EVIDENCE_REVIEW`: medium evidence → ASK for MVP.
- `R6_HIGH_EVIDENCE_REVERSIBLE`: high evidence plus an eligible reversible action → ACT, subject to gateway re-checks.
- `R7_ACTION_CONTEXT_MISMATCH`: chosen action does not fit the event context/runbook → ASK or NOTIFY; never blindly execute.

The precise rule table must be unit-tested and displayed in the UI. Hard rules cannot be overridden by human approval. For the MVP, an approval can satisfy only a soft ASK rule for the exact action and run, while all hard safety rules are checked again at execution.

**Evidence grade is not a calibrated probability.** A high/medium/low grade is a deterministic evidence category. Do not call it “94% probability of root cause” unless a calibrated statistical method has actually been developed and evaluated.

## 4.5 Evidence grading and Triage Genie contract

The app supplies the Genie with: incident ID/title/severity/services/time window, canonical evidence rows, allowed action catalogue, and limitations. The Genie must return structured output:

```json
{
  "assessment_status": "supported | uncertain | contradictory | insufficient_data",
  "candidate_cause": "string",
  "evidence_for": ["evidence-id"],
  "evidence_against": ["evidence-id"],
  "missing_evidence": ["string"],
  "recommended_action": "rollback_latest_deploy | disable_demo_feature_flag | restart_demo_service | none",
  "fallback_action": "catalogue action or none",
  "reasoning_summary": "under 80 words, tied to evidence IDs",
  "limitations": ["string"]
}
```

Validation requirements:

- Parse against a schema (e.g., Zod).
- Reject unknown action IDs, malformed output, and nonexistent evidence IDs.
- Do not trust any confidence number from the Genie for authorization.
- Treat event text as data, not instructions. Ignore prompt-like text embedded in logs.
- The deterministic policy computes the permitted decision from canonical data and rule table.

For the MVP, an evidence-grade function may be deliberately simple, but it must be transparent and tested. Example: a deployment event must precede the earliest symptom; symptoms must include metric/error/business-failure observations; contradictory deployment chronology lowers the grade. The test suite should include missing deploy, symptom-only, reversed timestamps, contradictory evidence, stale timestamps, duplicate events, and missing source data.

## 4.6 Recovery verification protocol

Do not implement a long blocking HTTP request that attempts the entire recovery window if the hosting platform's request-duration limits are uncertain. Use a polling protocol:

- Each `POST /api/verify` call retrieves one fresh metrics sample from the demo service.
- Validate its schema, source timestamp, and freshness (initial target ≤5 seconds).
- Save the sample with run ID and sequence/attempt number.
- A sample is healthy only if `error_rate < 0.02` and `p95_ms <= 180` for the current demo baseline. Make thresholds configurable and visible as demo policy.
- Increment the consecutive-healthy streak only on a fresh healthy sample; reset it on unhealthy or unknown.
- Return `recovered` only after three consecutive healthy samples. Return `not_recovered` if the bounded recovery deadline is exceeded with valid unhealthy telemetry. Return `unknown` when telemetry is missing/stale/unavailable.
- Workato waits about 2 seconds between polling calls and stops at the bounded deadline (initial target 30 seconds total), subject to the actual workspace's delay/wait behavior.
- Fallback is not executed merely because the first verification call says “not yet recovered.” It is considered only after the primary action failed or the configured recovery deadline is reached, followed by policy and gateway re-check.
- `unknown` never becomes resolved. Choose and document whether this ends in escalated or failed; this spec uses `failed` for inability to verify and `escalated` for a known lack of recovery after the allowed fallback.

Tune the demo service's recovery curve and the verification deadline together in tests. Do not repeatedly reset a recovering service before its recovery window can finish.

## 4.7 Demo service

Preferred implementation: a small, separate Node.js service with read-only health/metrics endpoints and a small authenticated action surface.

Read endpoints:

- `GET /health` → service status, version, observed timestamp.
- `GET /metrics` → `error_rate`, `p95_ms`, `version`, `observed_at`, telemetry status.

Scenario/action endpoints, restricted to requests from the app's action gateway:

- `POST /internal/scenario/reset`
- `POST /internal/deploy` (named scenario only; no arbitrary command/URL)
- `POST /internal/rollback`
- `POST /internal/feature-flag`
- `POST /internal/restart`

Use a deterministic simulator: `healthy` metrics are low, `degraded` metrics are high, and `recovering` metrics move toward healthy after a known elapsed period. Implement flags to force rollback failure or telemetry loss. Never expose these controls publicly without authentication. Only the action gateway can invoke modifying endpoints. If a separate service cannot be deployed during the hackathon, use the database-backed state simulator as an explicitly labelled fallback and disclose that verifier independence is limited.

## 4.8 Database model

Retain existing incidents/events/relationships tables after schema/type alignment. Add a migration for at least:

- `settings`: singleton row with `kill_switch`, `dry_run`, and updated metadata.
- `agent_runs`: incident FK (adapt type after schema inspection), scenario, status, mode, policy decision/version/rule IDs, triage JSON, outcome, unique idempotency key, Workato job ID, start/end times, receipt hash.
- `agent_steps`: run FK, stable `step_key`, actor, action, status, reason, limited summary JSON, timestamp, unique `(run_id, step_key)`.
- `action_executions`: run FK, action type, role (`primary`/`fallback`), unique idempotency key, status (`authorized`, `executing`, `succeeded`, `failed`, `blocked`, `simulated`), authorization snapshot, result, timestamps.
- `approvals`: run FK, exact action type, summary, evidence IDs, policy version, request/expiry/decision timestamps, decision and authenticated approver identity when available. Enforce single-use decisions.
- `recovery_samples`: run FK, sample sequence/time, error rate, p95 latency, health status (`healthy`, `unhealthy`, `unknown`), source.

Database requirements:

- Add foreign keys, indexes for common run/incident queries, check constraints, unique idempotency constraints, and a consistent timestamp strategy.
- Enable RLS for tables exposed to browser clients. Browser access should be read-only and limited to permitted data. Server-side service-role access stays server-only.
- All state-changing writes go through server routes with validation and authorization.
- Use atomic insert/claim semantics for action idempotency; do not implement it as only “check then insert.”
- Do not expose service keys to the browser. Scan built client bundles for them.
- Do not store complete secrets or unnecessary raw incident payloads in audit summaries.

## 4.9 API contracts

All routes validate inputs and use a consistent error envelope: `{ "error": { "code": "...", "message": "..." } }`. Exact existing paths must be verified during M0 and adapted if needed.

| Endpoint | Caller | Responsibility |
|---|---|---|
| `POST /api/ingest` | Scenario producer / authorized source | Validate, normalize, persist incident bundle; idempotent where possible |
| `POST /api/demo/scenario` | Lab UI | Accept only the fixed scenario enum, reset demo, generate events, create run, dispatch Workato |
| `POST /api/agent/start` | App | Idempotently create or return a run; persist dispatch step before webhook call |
| `POST /api/agent/events` | Workato | Idempotently append step by `(run_id, step_key)`; capture job ID |
| `GET /api/agent/runs/:id` | UI | Return run, steps, approval, executions, recovery samples, receipt if terminal |
| `POST /api/policy/decide` | Workato | Validate structured triage, compute grade and policy, persist rule IDs and policy version; create approval if ASK |
| `POST /api/actions/execute` | Workato | Server-enforced action gateway; accept only run ID and primary/fallback role, not arbitrary action targets |
| `POST /api/verify` | Workato | Record one fresh telemetry sample and return streak/verdict/deadline state |
| `POST /api/runs/:id/finalize` | Workato | Request finalization; app computes actual outcome and downgrades unverified `resolved` |
| `POST /api/approvals/:id/decision` | Approval UI / authorized workflow | Validate signed token/authenticated actor, atomically apply single-use decision, log and trigger resume |
| `POST /api/control` | Privileged lab UI | Change kill switch/dry-run only with authorization; log control change |

### Workato-facing authentication

For the MVP, use TLS and a high-entropy server-side secret configured as a Workato connection/environment secret, sent in a dedicated header and compared in constant time. Add per-run idempotency and replay-resistant action logic. If HMAC support is implemented, sign timestamp plus raw request body and reject stale timestamps; do not add signing complexity without an end-to-end test proving Workato can produce the exact signature reliably. Never accept a secret from the JSON body.

## 4.10 Action gateway contract

`POST /api/actions/execute` input is intentionally narrow:

```json
{ "run_id": "uuid", "role": "primary" }
```

or

```json
{ "run_id": "uuid", "role": "fallback" }
```

The server looks up the action that has already been selected by validated policy/runbook state. Callers cannot supply a URL, command, SQL, or arbitrary action ID.

Immediately before a modifying side effect, the gateway must:

1. Authenticate the Workato call.
2. Load the run and current state from the database.
3. Confirm the current transition permits execution.
4. Resolve the action from the server-side catalogue and confirm it is allow-listed.
5. Re-evaluate policy against current canonical evidence and current settings.
6. If an approval is required, verify it is approved, unexpired, single-use, and bound to this run/action/policy version.
7. Check kill switch.
8. Reserve the action idempotency key atomically; duplicates return stored status and never re-run side effects.
9. If dry-run is active, store `simulated` and do not mutate the service.
10. Execute only the fixed operation against payment-demo and persist result plus an authorization snapshot.
11. Record blocked/failed outcomes with reason; do not suppress an authorization failure.

The check order can be optimized only if the same safety properties remain true. If settings/policy/approval change during execution, the system must not rely on stale state.

## 4.11 Approval flow

- Approval record is created only for a soft ASK decision and includes run ID, exact action, evidence IDs, policy version, requested/expiry timestamps.
- Decision is single-use and expires (initial default: 10 minutes for demo).
- Prefer an authenticated approver identity via available workspace auth. If an expiring bearer link is used for hackathon simplicity, label it as a bearer link and do not claim verified identity unless it is actually verified.
- An HMAC-signed token may bind approval ID, action type, run ID and expiry. Store the signing secret server-side only.
- Apply the decision atomically only when decision is null and expiry has not passed.
- Approval cannot bypass hard policy rules (kill switch, action not in allow-list, invalid triage, failed mandatory checks).
- After approval, call the Workato resume webhook; the action gateway repeats all checks before execution.
- Reject/expiry produces no service mutation and must be visible in steps and receipt.

## 4.12 Workato recipe/Genie design

### Recipe A: `ir-orchestrator`

1. Trigger on the signed/safeguarded webhook from Incident Radar.
2. Log `workato.started` with `run_id`, stable `step_key`, and Workato job identifier.
3. Invoke one Triage Genie task with incident, evidence, action catalogue, and output schema.
4. POST structured output to `/api/policy/decide`.
5. Branch on server decision:
   - ACT → call `ir-remediate-verify`.
   - ASK → send approval message with action, evidence IDs, policy reason, expiry, and approval URL; log step and wait for separate resume workflow.
   - NOTIFY → send factual notification and request finalization as escalated.
6. On recipe exception: log failure, follow bounded retry policy for safe calls only, and ask the app to finalize; app computes the final outcome.

### Recipe B: `ir-remediate-verify` (callable)

1. Request primary action from gateway.
2. Log returned status and execution ID.
3. Poll `/api/verify` at the configured interval until recovered or the bounded deadline is reached.
4. If primary execution failed or recovery remains not recovered at deadline, and the run has an unconsumed permitted fallback, request the fallback once.
5. Continue verification for the fallback within its own bounded window.
6. Request finalization with the suggested outcome; the app independently validates/downgrades it.
7. Post a summary and link to the run page.

Do not trigger fallback merely because a fresh sample is not healthy yet. Keep the service recovery curve and verifier deadline aligned. Do not retry modifying calls blindly.

### Recipe C: `ir-resume`

1. Receive the approval event/webhook from the app.
2. Log approval ID/decision, never the secret token.
3. If approved, call `ir-remediate-verify`; otherwise notify and request escalated finalization.
4. The app gateway re-checks policy and approval regardless of the recipe branch.

### Triage Genie instructions

The Genie is an evidence-bound analyst, not a privileged executor. It may select only from the supplied catalogue, cite only supplied evidence IDs, list missing/conflicting evidence, and return schema-valid structured output. It must say when the evidence is insufficient. It cannot authorize/approve/execute, modify control settings, or claim that recovery occurred.

### Workato feature constraints

Verify actual availability of webhook triggers, HTTP calls, Slack connection, structured Genie outputs, callable recipes, wait/delay, job ID fields, and the chosen approval mechanism. Workato documentation describes limits involving Genie task assignment and Business Approvals; do not assume an Agent Studio Business Approval can be used inside a headless “assign task to Genie” flow. Keep approval as an explicit side branch/resume workflow using a supported mechanism in the workspace.

## 4.13 Recovery Receipt

Build the receipt only from stored rows. Include:

- Incident ID/title and incident time window.
- Evidence IDs and observed timestamps.
- Triage assessment, missing/conflicting evidence, limitations, and selected action.
- Evidence grade, policy version, and rule IDs.
- Approval request/decision/approver identity where actually verified, and expiry.
- Primary/fallback action records with status, result and authorization snapshot.
- Ordered recovery samples and thresholds used.
- Workato job ID(s), run start/end, measured duration, and final outcome.

Compute a SHA-256 hash over canonicalized receipt JSON as an integrity checksum. **A hash alone is not a tamper-proof audit ledger**; do not make that claim. Offer JSON download for review. Exclude secrets and unnecessary sensitive payloads.

## 4.14 UI requirements

- `/lab`: three scenario buttons, reset, kill switch/dry-run controls requiring authorization, visible LIVE/DRY_RUN/SIMULATION/REPLAY badge, and a clear `simulated workload` label.
- `/runs/[id]`: ordered feed showing actor, step, status, reason, timestamp, Workato job ID, approvals, action results, samples, final receipt.
- Incident detail: show evidence IDs/relationships, diagnosis limitations, policy result and current run.
- Overview: active incidents, pending approvals, verified resolutions, blocked actions, median measured recovery duration, and run count. Every KPI is computed from stored records.
- Error states: show integration/database errors explicitly; never hide them behind mock data in LIVE mode.
- REPLAY: visible banner; no outbound action is permitted in replay mode.

## 4.15 Test plan

### Unit tests

- Policy rule order, hard/soft rules, allow-list, kill switch, dry-run semantics.
- Evidence grade: missing deploy, deploy after symptoms, symptom-only, conflicting evidence, stale timestamps, duplicate event IDs.
- Triage schema and evidence/action reference validation.
- State-machine allowed and forbidden transitions.
- Verifier sample freshness, consecutive-healthy count, reset-on-unhealthy, `unknown` behavior.
- Approval token tamper/expiry/wrong action/wrong run/reuse.
- Finalization downgrade when no verifier pass exists.
- KPI calculations and receipt canonicalization.

### Integration tests

- Ingest duplicate bundle → idempotent incident result.
- Start duplicate run → same run ID.
- Duplicate callback → one step.
- Concurrent duplicate action request → one side effect.
- Kill switch switched after policy decision → action blocked.
- Dry-run → execution `simulated` and service unchanged.
- Low evidence → pending approval; pending/rejected/expired never mutate service; valid approval resumes after gateway re-check.
- Rollback failure → one fallback; resolve only after verifier passes; otherwise escalate/fail accurately.
- Telemetry down/stale → `unknown`, never resolved.
- LIVE database outage → visible error; no mock fallback.
- Event text containing instructions → does not change policy or action.
- Request with arbitrary URL/command/action → rejected or ignored; never executed.
- Browser bundle does not contain service key or Workato secret.

### Workato end-to-end tests

- Real trigger job starts from the application.
- Triage Genie returns schema-valid output referencing known evidence IDs.
- Policy branch is reflected in the run record.
- Workato job ID is persisted and visible.
- Callback and approval-resume workflow run with duplicate/timeout tests.
- Each scenario passes repeatedly from a reset environment.

## 4.16 Environment variables (names, not values)

Application:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY             # server only
WORKATO_TRIGGER_URL                  # development workspace webhook
WORKATO_SHARED_SECRET                # server-side, never client-side
APP_BASE_URL
PAYMENT_DEMO_BASE_URL
PAYMENT_DEMO_SHARED_SECRET
APPROVAL_SIGNING_SECRET
```

Optional signing setup if implemented:

```text
IR_HMAC_SECRET
```

The exact names may be adapted to the current repository after inspection. Keep `.env.local` ignored, maintain `.env.example` with placeholders only, and never paste values into AI prompts or commit them.

---

# Part 5 — Master build prompt for Cursor / Claude Code

Paste the following prompt at the root of the existing Incident Radar repository. It is intentionally strict: inspect first, then work milestone by milestone. Use AIRO MCP for Workato workspace work and `wk` for synchronized local assets. Do not generate the entire application in a single pass.

```text
ROLE
You are the senior full-stack, reliability, and Workato automation engineer for Incident Radar, an existing Next.js App Router / TypeScript / Tailwind / Supabase application being extended for Workato Hackathon Track 1: Orchestrator + Agents. Work in small, verifiable increments. Do not rewrite the application.

SINGLE SOURCE OF TRUTH
Use this Complete Build Blueprint's PRD and TRD as the intended specification. First inspect the actual checkout and reconcile differences. Never assume a referenced route, table, helper, secret, Workato feature, recipe, or Genie exists until verified. If an assumption is false, report it and propose the smallest safe adjustment.

PRODUCT
Incident Radar correlates operational events into an incident, validates the evidence, computes a deterministic policy result, coordinates an authorized recovery through Workato, verifies recovery from fresh telemetry, communicates the result, and stores a Recovery Receipt.
Lifecycle: Observe -> Correlate -> Investigate -> Decide -> Authorize -> Act -> Verify -> Communicate -> Audit.
A run is RESOLVED only after three consecutive fresh healthy telemetry samples. An LLM statement, completed Workato job, or HTTP 200 is never sufficient proof.

TOOLING CONTRACT
- Use AIRO MCP to inspect the actual Workato workspace and, after a read-only audit, help create/edit supported Workato recipes and Genies.
- Use `wk` to synchronize Workato assets locally, check status/diffs, run supported lint/plugins, and push only reviewed changes to the development workspace.
- Before a Workato edit, state whether it will be authored remotely through AIRO MCP or locally through files/CLI. Do not edit the same asset through both paths before synchronizing.
- If AIRO MCP is unavailable or a feature/permission is absent, report the exact limitation. Do not pretend to have workspace access. Continue the application work with a local fake-workato only for tests, never silently as a LIVE demo substitute.
- Read Workato Developer Skills relevant to recipe fundamentals and the HTTP/Slack connectors before generating recipes. For Cursor, use the available local clone/reference because plugin availability may vary.
- Validate recipe structure with the installed Recipe Linter where supported; inspect flows with Recipe Visualizer. Lint success is not a runtime proof.

FIRST ACTION: BASELINE AUDIT ONLY
Read README, package.json, lockfile, .env.example, .gitignore, all current API routes, src/lib/api.ts, mappers.ts, ingest.ts, correlation engine, types, Supabase SQL/migrations/RLS, tests, and relevant pages. Run install, lint, tests, typecheck if present, and build. Report commands and exact results. Trace mock vs Supabase use. Scan for committed secrets but print secret names/locations only, never values. Compare schema and TypeScript types. List missing routes and external assumptions. Do not implement the whole project yet.

OWNERSHIP
The application owns canonical evidence, evidence grading, policy decisions, action authorization, approval validation, state machine, verifier, database audit, metrics and receipt. Workato owns orchestration order, a Triage Genie task, Slack communication, waits/retries within bounds, and callbacks. The Genie proposes only; it cannot authorize, approve, execute, flip controls, or declare recovery.

ACTION CATALOGUE: ONLY
- rollback_latest_deploy
- disable_demo_feature_flag
- restart_demo_service
Callers may not supply arbitrary URL, command, SQL, deployment target or arbitrary action ID. Resolve the action from server-side run/policy state.

HARD SAFETY RULES
1. Every modifying action goes through a server-only gateway that reads current state from the database immediately before execution.
2. Authenticate Workato-facing calls using a high-entropy server-side secret over TLS; validate input schemas and use constant-time comparison. Use HMAC timestamp/body signing if implemented and tested end to end. Never accept a secret in the JSON body.
3. Re-check current run state, current policy, allow-list, exact action approval if required, kill switch, dry-run, and idempotency immediately before side effects.
4. Reserve action execution idempotency atomically before the side effect. Concurrent duplicate calls must not execute twice.
5. Approval must be single-use, expiring, and bound to exact run/action/policy version. Hard rules cannot be overridden by approval. Re-evaluate them after approval.
6. Missing/stale/unavailable telemetry is UNKNOWN, never HEALTHY. Only three consecutive fresh healthy samples can resolve a run.
7. One fallback at most. No unbounded retry or agent loop.
8. LIVE mode never silently falls back to mock data. Modes LIVE, DRY_RUN, SIMULATION and REPLAY must be visible. REPLAY never performs actions.
9. Only the application computes final status. A Workato request to finalize as resolved without a passing verifier is downgraded and logged.
10. All dashboard KPIs come from persisted rows. Never fabricate timestamps, evidence, metrics, action results, or savings.
11. Secrets stay in environment/secret storage; service-role key is server-only. Never display or commit secrets.
12. Strict TypeScript, no `any` unless an existing limitation is justified and documented. Validate all external inputs using Zod or equivalent. Use a consistent error envelope.
13. Do not add tickets, PagerDuty, incident merging, MCP exposure for Incident Radar, multi-tenant auth, or learning claims unless the P0 workflow is complete and an explicit scope decision is recorded.

EXPECTED APPLICATION MODEL
Retain existing incident/event tables after checking their real types. Add migrations for settings, agent_runs, agent_steps, action_executions, approvals and recovery_samples; include constraints/indexes/RLS. Add the state machine, deterministic policy module, evidence grader, triage validator, action gateway, verifier, receipt builder and routes described in the TRD. Prefer a separate Node.js payment-demo service with independently queried /health and /metrics endpoints; if not feasible, clearly label the DB-backed simulator and disclose that verification is not independent.

WORKATO RECIPES
A. ir-orchestrator: webhook trigger -> log workato.started and job ID -> call Triage Genie with canonical incident/evidence/catalogue -> post structured triage to policy API -> branch ACT / ASK / NOTIFY. ACT calls remediation/verification recipe; ASK posts exact action/evidence/reasons/expiry and ends awaiting a separate resume event; NOTIFY sends factual notification and requests escalated finalization. Bounded retries; no blind retry of modifying calls.
B. ir-remediate-verify: gateway primary action -> log result -> poll one-sample verifier about every 2 seconds within a bounded recovery deadline -> if primary failed or deadline elapsed without recovery, evaluate and execute at most one allowed fallback -> verify again -> request finalization -> post truthful outcome and run link.
C. ir-resume: receive the approval decision from the app; if approved, call the same remediation/verification flow; otherwise notify and request escalation. The app gateway re-checks every hard rule regardless of recipe logic.
Verify workspace-specific trigger, connector, structured-output, wait/delay, callable-recipe, and approval capabilities before relying on them.

DEVELOPMENT METHOD
For each milestone:
1. State the goal, files expected to change, assumptions, and acceptance tests.
2. Make the smallest change that satisfies this milestone only.
3. Add tests with the implementation.
4. Run typecheck, lint, tests and build as available; fix regressions.
5. Report exact commands/results, manual verification, files changed, limitations, and whether the gate passed.
6. Stop if the gate fails. Do not skip ahead because of time pressure.

MILESTONE ORDER
M0 Baseline audit and mode/data correctness.
M1 Stable canonical ingestion and data model/RLS.
M2 AIRO MCP + `wk` setup; read-only workspace audit; verify connectors; establish a real Workato smoke test (trigger, callback, job ID).
M3 Run tables, step callbacks, state machine, scenario lab, run page, deterministic policy, evidence grade, fake-workato tests.
M4 Real Triage Genie and policy branch through the actual Workato orchestrator.
M5 Action gateway, idempotency, demo service, and one real authorized rollback.
M6 Bounded recovery verification and Recovery Receipt.
M7 Approval request/decision/resume with gateway re-checks.
M8 Failed rollback, one fallback, kill switch, dry-run, duplicate callback and telemetry-loss tests.
M9 Impact panel computed from real run rows and explicit replay mode.
M10 Fresh-checkout hardening and repeated end-to-end scenarios.

INITIAL ACCEPTANCE PRIORITY
Before optional UI polish, prove a complete real path: scenario -> persisted incident -> run -> real Workato job -> Triage Genie structured result -> policy decision -> gateway action -> fresh telemetry verification -> accurate final outcome and receipt. Then prove ASK and failure/fallback scenarios.

AFTER EACH MILESTONE REPORT
1. Files changed.
2. Behavior implemented.
3. Commands executed with pass/fail and exact failures.
4. Tests added and results.
5. Manual verification steps.
6. External Workato/Supabase assumptions and unresolved issues.
7. Gate: PASS or FAIL, with evidence.

Start now with M0 only. Do not start M1 until the baseline report and gate are complete.
```

---

# Part 6 — Step-by-step build plan and gates

The order below is more important than the hour labels. Time depends on access, integration setup, and bugs in the actual checkout. Do not promise a 12-hour build before the baseline and Workato smoke test reveal the real workload.

## M0 — Baseline audit and toolchain gate

**Tasks**
- Connect AIRO MCP in read-only mode and verify the correct workspace/environment.
- Install/authenticate `wk`; verify permissions and project mapping.
- Install Recipe Linter and Recipe Visualizer where available; make Developer Skills accessible to the coding assistant.
- Inspect application routes, data access, schema, RLS, tests, secrets, and mock fallbacks.
- Run install/lint/test/typecheck/build and write `docs/baseline-report.md`.

**Gate:** Tool access is verified; actual repo state is known; no secret values are printed; build/test baseline is documented; missing platform features are listed.

## M1 — Canonical data path and LIVE-mode integrity

**Tasks**
- Align the incident mapper with actual database columns/types.
- Consolidate ingestion through one canonical validation/normalization/persistence path.
- Restore timeline from stored events/relationships.
- Remove silent mock fallback from LIVE mode; preserve explicit simulation/replay.
- Add/verify RLS and server-only privileged writes.

**Gate:** New and persisted incidents render after reload; all supported ingestion paths produce the same canonical representation; DB failure is visible in LIVE mode.

## M2 — Workato smoke test before deep app work

**Tasks**
- Confirm HTTP/webhook and Slack connections, Genie structured output, recipe invocation, wait/delay, callbacks, and approval options.
- Use AIRO MCP to inspect current assets, then create the smallest trigger recipe in the development environment.
- Recipe logs a Workato job ID, calls one application callback, and posts one Slack smoke-test message.
- Pull/synchronize assets with `wk`, inspect diff, lint if supported, visualize, and commit local files.

**Gate:** One real Workato job starts from a controlled app request, returns a callback, and has a visible job ID. If this gate fails, stop and fix connectivity/permissions before building remediation.

## M3 — Run model and local test harness

**Tasks**
- Add migrations for settings, agent_runs, agent_steps, action_executions, approvals, recovery_samples.
- Implement run state machine and idempotent callback storage.
- Add scenario enum, scenario lab, run page, deterministic policy module, evidence grader, triage schema validator.
- Add `scripts/fake-workato.ts` strictly for local tests, never as a hidden live fallback.

**Gate:** A local test creates an incident and run, fake-workato reaches policy decision, and run page displays persisted steps/rule IDs. Unit tests pass.

## M4 — Real Triage Genie and policy branch

**Tasks**
- Configure one Triage Genie with evidence-only, catalogue-only instructions and structured output.
- Build `ir-orchestrator`: trigger, log, Genie task, policy call, ACT/ASK/NOTIFY branch.
- Validate all Genie output server-side; store policy version and rule IDs.
- Save/pull/diff/lint/inspect recipe assets through the chosen workflow.

**Gate:** A real Workato run calls the real Genie, the application validates the output, and the policy branch appears in persisted run data.

## M5 — Action gateway and payment-demo

**Tasks**
- Build the separate Node.js payment-demo service (preferred) with health/metrics/deploy/rollback/feature-flag/restart.
- Keep modifying routes restricted to gateway calls.
- Implement atomic idempotency reservation, server-side allow-list resolution, current policy re-check, kill switch and dry-run check, and action snapshots.
- Connect Workato remediation recipe to the gateway.

**Gate:** Eligible happy-path run executes one rollback; duplicate/concurrent calls cause one mutation; arbitrary URLs/commands are rejected; dry-run makes no change.

## M6 — Verifier and Recovery Receipt

**Tasks**
- Implement one-sample-per-call verification, freshness checks, consecutive healthy streak, deadline, and `recovered/not_recovered/unknown`.
- Align recovery curve and verification timeout through tests.
- Finalization computes actual outcome in the app.
- Receipt is built from stored rows and includes a canonical JSON hash plus JSON download.

**Gate:** Happy path reaches RESOLVED only after three consecutive fresh healthy samples. Unhealthy/unknown cases never resolve. Receipt matches stored rows.

## M7 — Approval and resume

**Tasks**
- Create approval for soft ASK decisions with exact run/action/evidence/rules/expiry.
- Configure the verified approval mechanism supported by the workspace.
- Implement authenticated/signed decision endpoint, atomic single-use decision, audit step, resume webhook, and gateway re-check.

**Gate:** Pending/rejected/expired approval never modifies the service. Valid approval can resume only the exact action and only while hard rules still pass.

## M8 — Failure, fallback, kill switch, and dry-run

**Tasks**
- Add rollback-fails scenario; record failure; attempt no more than one policy-permitted fallback.
- Re-verify after fallback.
- Add privileged kill-switch/dry-run controls and record changes.
- Add duplicate callback, concurrent action, telemetry-down, wrong-secret, and prompt-injection tests.

**Gate:** Primary failure results in verified fallback recovery or an accurate escalation/failure. Kill switch blocks an action even if activated after the first policy decision.

## M9 — Metrics, replay, and user experience

**Tasks**
- Add overview metrics calculated from actual run records.
- Add LIVE/DRY_RUN/SIMULATION/REPLAY mode labels.
- Add a Recovery Receipt card and run timeline.
- Replay stored receipt data without any action side effects.

**Gate:** KPI fixture tests pass; replay is unmistakably labelled; no hardcoded metrics remain in the live dashboard.

## M10 — Hardening and demonstration rehearsal

**Tasks**
- Fresh clone with only documented env variables.
- Run all unit/integration/security tests, lint, typecheck, build, and Workato smoke test.
- Run all three scenarios repeatedly from a reset environment.
- Verify no secrets appear in Git/client bundle/logs.
- Record a backup demo, inspect every on-screen claim, and rehearse timing.

**Gate:** All P0 checks pass; no false RESOLVED state appears; backup recording exists; remaining limitations are disclosed.

---

# Part 7 — Three required scenarios and demo script

## Scenario A: Autonomous recovery

**Initial state:** payment-demo healthy; scenario injects a bad deployment and metrics degrade.  
**Expected:** events persist, incident correlates, Genie assesses evidence, policy returns ACT, gateway authorizes rollback, service metrics recover, verifier observes three consecutive healthy samples, app finalizes resolved, receipt appears, Slack communicates the verified outcome.

## Scenario B: Low evidence / approval

**Initial state:** scenario omits or contradicts the deployment evidence.  
**Expected:** triage explicitly states uncertainty, policy returns ASK, run waits for approval, no action happens while pending. Rejection/expiry escalates without mutation; approved action proceeds only if the gateway re-check passes and recovery is verified.

## Scenario C: Primary remediation fails

**Initial state:** controlled flag forces rollback failure.  
**Expected:** failed action stored; one fallback selected only if policy permits; fallback executed through gateway; verifier runs again; recovery ends resolved only if healthy samples pass; otherwise escalate/fail with complete action history.

## Four-minute presentation plan

| Time | Demonstration | What to say |
|---|---|---|
| 0:00–0:25 | Show incident noise and the service degradation | “One failure creates many symptoms; the challenge is to coordinate the response and prove recovery.” |
| 0:25–1:20 | Run autonomous recovery live | Show evidence IDs, Workato job, policy rule IDs, action, metrics and the final receipt |
| 1:20–2:05 | Run low-evidence scenario | Show why the policy asks and prove the service is unchanged while approval is pending |
| 2:05–2:55 | Run rollback-failure scenario | Show primary failure, one fallback, and verified recovery or honest escalation |
| 2:55–3:30 | Open Recovery Receipt and impact panel | Show measured timing and actual stored samples, not invented metrics |
| 3:30–4:00 | Explain safety and boundaries | Distinguish simulated workload from real Workato orchestration, authorization gateway, audit, and verifier |

Keep a backup recording ready. If the live integration fails, label the presentation REPLAY. Never pretend a replay is live.

---

# Part 8 — Proposed 100-point self-evaluation rubric

This is an internal preparation rubric, not an official Workato scoring rubric. Adjust if the event organizers publish criteria.

| Criterion | Points | Evidence needed to earn full marks |
|---|---:|---|
| Problem relevance and business process clarity | 15 | Clear DevOps incident process, user, measurable pain and bounded scope |
| End-to-end workflow completion | 20 | Real Workato run links event intake through action, verification, and communication |
| Meaningful agent use | 15 | Triage Genie handles evidence context and returns structured, validated assessment; Workato genuinely orchestrates |
| Decisions and exception handling | 15 | ACT/ASK/NOTIFY, approval, fallback, escalation all demonstrated |
| Safety and security | 15 | Server-enforced gateway, allow-list, least privilege, current-policy recheck, idempotency, kill switch, RLS, secret hygiene |
| Evidence and recovery verification | 10 | Independent telemetry, three fresh consecutive healthy samples, no false resolved states |
| Measurable impact and auditability | 5 | KPIs computed from runs; receipt links decision/action to observed recovery |
| Demo clarity and resilience | 5 | Repeatable scenarios, honest mode labels, backup recording, concise story |
| **Total** | **100** | Every score supported by a test or live demonstration |

Do not award yourself points for future roadmap features. A requirement earns credit only when it is demonstrated and tested.

---

# Part 9 — Pre-demo checklist

## Tooling
- [ ] AIRO MCP connected to the correct Workato workspace/environment.
- [ ] AIRO permissions and available connectors/features documented.
- [ ] `wk auth status` succeeds for the intended development environment.
- [ ] Recipe Linter and Visualizer installed where available.
- [ ] Developer Skills reference available to the coding assistant.
- [ ] Local/remote recipe changes reconciled; no stale push risk.

## App and data
- [ ] Fresh checkout installs and builds.
- [ ] RLS verified and service-role key server-only.
- [ ] LIVE mode never silently returns mock data.
- [ ] Ingestion paths use the same canonical evidence model.
- [ ] Timeline reconstructs from persisted events/relationships.
- [ ] Action endpoint rejects arbitrary targets and action IDs.
- [ ] Approval state and kill switch are checked immediately before action.
- [ ] Concurrency/idempotency tests pass.
- [ ] Missing telemetry returns unknown.
- [ ] RESOLVED requires three consecutive fresh healthy samples.

## Workato
- [ ] Real trigger job starts.
- [ ] Triage Genie structured result passes app validation.
- [ ] Workato job ID is visible in run record.
- [ ] Callback is idempotent.
- [ ] Approval branch uses a feature confirmed in the workspace.
- [ ] Recipe lint/diff review done; tested assets are synchronized.

## Demo
- [ ] Autonomous recovery passes repeatedly.
- [ ] Low-evidence approval path passes approve, reject and expiry tests.
- [ ] Rollback failure leads to one fallback or accurate escalation.
- [ ] Kill switch blocks a modifying action.
- [ ] Dry-run causes no service mutation.
- [ ] Recovery Receipt matches database rows.
- [ ] All metrics are actual measurements or explicitly labelled illustrative.
- [ ] Replay mode is visibly labelled.
- [ ] Backup recording is ready.

---

# Part 10 — Official references and verification notes

The following were checked while preparing this plan on 10 October 2026. Use the live pages for changes in commands, permissions, and feature availability.

1. **Workato AIRO MCP server:** https://docs.workato.com/en/airo/mcp.html — AIRO capabilities, supported clients, OAuth/API-token setup, data-center URLs, workspace/environment scope, and permissions.
2. **Workato `wk` CLI:** https://github.com/workato-devs/wk — Windows Scoop install, CLI authentication, project initialization, pull/status/diff/push, regions, and CLI limitations.
3. **Workato Labs toolkit:** https://github.com/workato-devs/labs — Recipe Linter, Recipe Visualizer, and supported local development workflow.
4. **Workato Developer Skills:** https://github.com/workato-devs/recipe-skills — connector-specific authoring knowledge and plugin instructions; check the current Cursor plugin status before assuming native plugin install is supported.
5. **Incident Radar repository:** https://github.com/Yashwanth-585/incident-radar — current code and README must be re-inspected at M0 because branches and implementations can change.

**Final engineering principle:** Do not optimize for the number of agents, recipes, or UI widgets. Optimize for one trustworthy chain: evidence → policy → authorized action → independently verified recovery → accurate audit record. That chain, demonstrated honestly, is the strongest version of Incident Radar for this track.
