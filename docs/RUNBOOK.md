# Incident Radar v2 — End-to-End Demo Runbook

This document provides step-by-step instructions to execute the 8 end-to-end hackathon scenarios for Incident Radar v2.

---

## 1. Setup & Environment Verification

Make sure `.env.local` contains:
```ini
DEMO_MODE=true
APP_BASE_URL=https://incident-radar.onrender.com
WORKATO_SHARED_SECRET=83ea2f004e0a8204c943192a99b1116e252b3360dadb7d337f4282a0d530741d
APPROVAL_SIGNING_SECRET=12ed97e9fc175a0608e08d8bafae0d08a040e4112880d0f5ad69064731f9e900
SLA_TIME_SCALE=60  # 1 hour SLA passes in 1 minute
```

Run seed script:
```powershell
npx tsx scripts/seed-team.ts
```

---

## 2. Hackathon Scenario Rehearsal Script

| # | Scenario Name | Trigger Command / Action | Expected Path |
|---|---|---|---|
| **1** | **Bad Deploy (ACT)** | Trigger scenario `act` from UI or `POST /api/orchestrator/trigger` with `{ "scenario": "act" }` | Classified **Backend** → assigned to Rahul (Backend Specialist, score ≥ 75) → Genie: supported, top suspect v2.4.1 score ≥ 70 → ACT → rollback → 3 healthy probes → receipt generated |
| **2** | **Memory Leak (ASK + RBAC)** | Trigger scenario `ask` with `{ "scenario": "ask" }` | Classified **System Architecture** → assigned to Alex (Architect) → Genie: uncertain → ASK with `required_role = maintainer` → `/approve/<runId>` link → Approve → restart → receipt |
| **3** | **Silent Checkout Error** | Open browser to `/demo/broken-checkout` and click button 10 times | Browser SDK captures dead_click & soft_error → collector spike detector → incident → classified **Frontend** → assigned to Priya |
| **4** | **Reminders & Escalation** | Trigger scenario 3 and do not acknowledge | `ack_1` DM → `ack_escalate` to project lead with "Reassign to next best" → reassign → new DM |
| **5** | **Out of Office Fallback** | Set Priya `out_of_office = true`, repeat scenario 3 | Next best person picked; DM explicitly lists reason |
| **6** | **README Compliance Check** | Open `/readme` page or `POST /api/readme/checks` | **Fail** (missing Problem/Solution headings) → lead DM'd with change requests → fix pushed → **Pass** ✅ |
| **7** | **CI Failure on Main** | Trigger `POST /api/github/webhook` with `workflow_run` failure | `ir-github-events` → incident → classified **DevOps** → assigned → NOTIFY |
| **8** | **Contradictory Telemetry** | Trigger scenario `notify` | Triage ambiguous → NOTIFY → escalation DM to responder |

---

## 3. Recommended 5-Minute Live Demo Flow

1. **Silent Error Capture (Scenario 3 & 4):** Show browser SDK capturing dead clicks on `/demo/broken-checkout`, triggering smart assignment to Priya.
2. **README Compliance (Scenario 6):** Show current README failing compliance on `/readme`, display change requests, push fix, show "README approved ✅".
3. **Autonomous Safe Recovery (Scenario 1):** Trigger payment degradation, show top suspect commit v2.4.1 (score 85), autonomous ACT rollback, and 3-sample Recovery Receipt.
4. **Dashboard & Audit Trail:** Display `/readme` compliance badge and audit trail logs.
