# Incident Radar

> **Safe, Workato-Orchestrated Autonomous Incident Recovery**  
> *Workato Hackathon — Track 1: Orchestrator + Agents (Enterprise Agentic Workflows)*

[![Live App](https://img.shields.io/badge/Live_App-incident--radar.onrender.com-blue?style=for-the-badge&logo=render)](https://incident-radar.onrender.com)
[![Workato](https://img.shields.io/badge/Orchestrator-Workato_Platform-purple?style=for-the-badge&logo=workato)](https://app.workato.com)
[![Slack Integration](https://img.shields.io/badge/Alerts-Slack_#all--incident--radar-4A154B?style=for-the-badge&logo=slack)](https://incidentradar.slack.com)
[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js_15_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## 🚀 Executive Summary

When critical production services experience outages, monitoring platforms flood on-call engineers with dozens of confusing alerts. Responders scramble through disparate logs, manually hypothesize causes, and risk executing untested fixes under extreme stress.

**Incident Radar** converts chaotic operational telemetry into a deterministic, safeguarded incident recovery workflow. Powered by **Workato's Agentic Platform**, Incident Radar:
1. **Correlates** raw operational noise into structured incidents.
2. **Investigates** root causes using a **Workato Triage Genie** (Claude 3.5 Sonnet) that analyzes chronological logs and metrics.
3. **Enforces Deterministic Guardrails** via a server-side Policy Engine that classifies actions into **`ACT`** (Autonomous Remediation), **`ASK`** (Human Approval Required), or **`NOTIFY`** (Escalation).
4. **Executes Permitted Actions** through a guarded Action Gateway with strict allow-listing and idempotency.
5. **Verifies Telemetry Objectively** requiring **3 consecutive healthy telemetry samples** before declaring an incident resolved.
6. **Produces a Tamper-Evident SHA-256 Recovery Receipt** for audit compliance and sends real-time formatted updates to **Slack** (`#all-incident-radar`).

---

## 🏛 Architecture Overview

```
                                      INCIDENT RADAR PLATFORM
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                         │
│  [ Production Web Service ] ────► [ Correlation Engine ] ────► [ Incident Ingestion ]                  │
│                                                                           │                             │
│                                                                           │ (Secure Webhook)            │
│                                                                           ▼                             │
│                                                              [ Workato ir-orchestrator ]                │
│                                                                           │                             │
│                                    ┌──────────────────────────────────────┼───────────────────────┐     │
│                                    │                                      │                       │     │
│                                    ▼                                      ▼                       ▼     │
│                       [ Workato Triage Genie ]                 [ POST /api/agent/events ]   [ Slack ]   │
│                       (Claude 3.5 Sonnet Agent)                       (Step Logger)        (Live Alerts)│
│                                    │                                                                    │
│                                    ▼                                                                    │
│                        [ Structured Assessment ]                                                        │
│                                    │                                                                    │
│                                    ▼                                                                    │
│                         [ POST /api/policy/decide ]                                                     │
│                                    │                                                                    │
│                  ┌─────────────────┼─────────────────────────┐                                          │
│                  │                                           │                                          │
│             [ ACT Path ]                                [ ASK Path ]                              [ NOTIFY ]    │
│                  │                                           │                                          │
│                  ▼                                           ▼                                          │
│      [ ir-remediate-verify ]                    [ Slack Approval Request ]                       [ Escalate ]   │
│                  │                              (Requires Human Sign-Off)                               │
│                  ├─► [ POST /api/actions/execute ]                   │                                          │
│                  │   (Rollback / Feature Flag)                       ▼                                          │
│                  ├─► [ POST /api/verify ]                   [ POST /api/runs/:id/resume ]                       │
│                  │   (Sample 3 Healthy Windows)                      │                                          │
│                  ├─► [ POST /api/runs/:id/finalize ]                 └──────────┐                               │
│                  │   (SHA-256 Recovery Receipt)                                 ▼                               │
│                  └─► [ Post to Slack Channel ] ◄────────────────────────────────┘                               │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Core Philosophy: Safe, Verifiable Autonomy

Incident Radar follows strict production safety principles:
- **Never claim recovery without fresh telemetry**: An LLM cannot "declare" an incident resolved. An incident is only closed after fresh metric polling observes 3 consecutive healthy samples.
- **LLMs never execute code directly**: The Triage Genie is an evidence-bound investigator. It proposes hypotheses from an allow-listed action catalogue; execution is strictly delegated to the deterministic server-side Action Gateway.
- **Zero blind retries on state mutations**: Modifying actions (rollbacks, restarts, flags) are strictly non-idempotent and never blindly retried on failures.
- **Tamper-evident auditability**: Every run produces an immutable, canonicalized JSON receipt hashed with SHA-256 for auditing and compliance.

---

## ⚡ The Three Core Scenarios

Incident Radar proves intelligent decision-making by demonstrating three distinct operational paths:

### 1. Autonomous Remediation (`ACT`)
* **Trigger:** High error rate (42.5%) coinciding with deployment `v2.4.1`, with a `NullPointerException` in `CheckoutController.processPayment`. Database and network are healthy.
* **Genie Assessment:** High confidence (`supported`); causal link backed by chronological telemetry.
* **Policy Decision:** `ACT` (Rule `R6_HIGH_EVIDENCE_REVERSIBLE`).
* **Execution:** Workato invokes `ir-remediate-verify`, executes `rollback_latest_deploy`, samples telemetry until healthy, generates the Recovery Receipt, and posts the green verification card to Slack.

### 2. Human-in-the-Loop Sign-Off (`ASK`)
* **Trigger:** Gradual memory leak across cluster over 48 hours without any recent deployments. Multiple microservices returning intermittent 504s.
* **Genie Assessment:** `uncertain` root cause; high blast radius.
* **Policy Decision:** `ASK` (Rule `R4_LOW_EVIDENCE_REVIEW`).
* **Execution:** Automated remediation is paused. Workato posts an approval card to `#all-incident-radar` with the proposed fix (`restart_demo_service`) and direct approval link. Responders review and sign off, triggering the `ir-resume` webhook to complete remediation.

### 3. Safety Guardrail & Escalation (`NOTIFY`)
* **Trigger:** Contradictory signals (e.g., CPU 99% but 0 IO latency; auth failures with zero external traffic).
* **Genie Assessment:** `contradictory` or `insufficient_data`.
* **Policy Decision:** `NOTIFY` (Rule `R7_ACTION_CONTEXT_MISMATCH`).
* **Execution:** Workato refuses to mutate the service. An escalation alert is dispatched to Slack paging the on-call engineer for human investigation.

---

## 🌐 Live Deployments & Assets

| Asset | Provider / Location | URL / Reference |
|---|---|---|
| **Web Service** | Render (Production) | [incident-radar.onrender.com](https://incident-radar.onrender.com) |
| **Source Code** | GitHub | [github.com/bachi-2006/Incident-Radar](https://github.com/bachi-2006/Incident-Radar) |
| **Slack Workspace** | Slack (`#all-incident-radar`) | [incidentradar.slack.com](https://incidentradar.slack.com) (Channel `C0C88MA3JAE`) |
| **Workato Project** | Workato Platform (`Kaboom!`) | Project ID: `18200516` • Folder ID: `35715801` |
| **`ir-orchestrator`** | Workato Recipe | [Recipe 82959206](https://app.workato.com/recipes/82959206) |
| **`ir-remediate-verify`** | Workato Recipe Function | [Recipe 82959173](https://app.workato.com/recipes/82959173) |
| **`ir-resume`** | Workato Webhook Recipe | [Recipe 82959207](https://app.workato.com/recipes/82959207) |
| **Triage Analyst Genie** | Workato Agent Studio | [Genie gin-AbsmKTXo-wH6Er3-CD](https://app.workato.com/genies/gin-AbsmKTXo-wH6Er3-CD/overview) |
| **Triage Analyst Skill** | Workato Skill | [Skill 82959203](https://app.workato.com/recipes/82959203) |
| **HTTP Connection** | Workato REST Connection | `Incident Radar API` (ID: `22283611`) |
| **Slack Connection** | Workato Slack Connection | `Incident Radar Slack` (ID: `22283619`) |

---

## 🔌 API Gateway Specifications

All Workato-to-Application endpoints require authentication via the `X-IR-Secret` header:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/agent/events` | `POST` | Step callback logging (e.g., `orchestrator_start`, `awaiting_approval`, `primary_failed`). |
| `/api/policy/decide` | `POST` | Deterministic policy evaluation based on Genie structured output. Returns `ACT`, `ASK`, or `NOTIFY`. |
| `/api/actions/execute` | `POST` | Guarded Action Gateway. Executes allow-listed actions (`rollback_latest_deploy`, `disable_demo_feature_flag`, `restart_demo_service`). |
| `/api/verify` | `POST` | Independent telemetry verification. Simulates recovery curve and requires 3 consecutive healthy samples. |
| `/api/runs/[id]/finalize` | `POST` | Computes final outcome, generates cryptographic SHA-256 receipt, and formats Slack text. |
| `/api/runs/[id]/resume` | `POST` | Human approval callback endpoint triggering Workato `ir-resume` webhook. |
| `/api/simulation` | `POST` | Triggers synthetic incident scenarios for demo and testing. |

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 20+
- npm 10+
- Git

### 1. Clone & Install
```bash
git clone https://github.com/bachi-2006/Incident-Radar.git
cd Incident-Radar
npm install --legacy-peer-deps
```

### 2. Configure Environment
Create `.env.local` using `.env.example`:
```bash
cp .env.example .env.local
```

Populate the required secrets:
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
WORKATO_SHARED_SECRET=your-shared-secret-key
WORKATO_ORCHESTRATOR_WEBHOOK_URL=https://webhooks.workato.com/webhooks/rest/your-hash/ir-orchestrator
DEMO_SERVICE_SECRET=your-demo-service-secret
APPROVAL_SIGNING_SECRET=your-approval-signing-secret
CONTROL_PASSCODE=your-control-passcode
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.

---

## 🏆 Hackathon Submission Highlights

1. **True Agentic Orchestration**: Not a standalone chatbot. Workato acts as the central brain orchestrating LLM analysis, REST API calls, conditional branching, retry monitoring, and team collaboration.
2. **Deep Workato Platform Usage**: Uses Workato Agent Studio Genies, Workato Skills, Webhook triggers, Callable Recipe Functions, Variables, Cloud REST connectors, and Slack actions.
3. **Enterprise Reliability**: Incorporates rate limiting, bounded verification loops, idempotency keys, and zero blind retries on state-mutating actions.
4. **End-to-End Proof**: From initial alert ingestion to fresh telemetry verification, judges can view the live execution trace, the cryptographic receipt, and the real-time Slack announcement.
