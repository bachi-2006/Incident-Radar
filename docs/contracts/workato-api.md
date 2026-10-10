# Workato <-> Incident Radar API Contract

This document is the authoritative engineering contract between the Incident Radar web application and Workato recipes (`Kaboom!`).
Both lanes must adhere to these exact endpoints, request headers, payload structures, and response shapes.

---

## 1. Authentication & Base Headers

All requests from Workato to the Incident Radar API must include the following header:

```http
X-IR-Secret: <IR_SHARED_SECRET>
```

Alternatively, `Authorization: Bearer <IR_SHARED_SECRET>` is supported.

---

## 2. Core Workato-Facing Endpoints

### 2.1 Agent Event Logging (`POST /api/agent/events`)
Logs orchestrator lifecycle events and execution steps for auditing.

- **Request Body:**
  ```json
  {
    "run_id": "run_act_1728550000",
    "project_id": "proj_demo",
    "incident_id": "inc_payment_spike_1728550000",
    "step_key": "orchestrator_started",
    "actor": "workato:ir-orchestrator",
    "status": "completed",
    "detail": {}
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "run_id": "run_act_1728550000",
    "step_key": "orchestrator_started",
    "logged_at": "2026-10-10T19:50:00.000Z"
  }
  ```

---

### 2.2 Policy Evaluation (`POST /api/policy/decide`)
Evaluates operational policy based on triage evidence and recommended action.

- **Request Body:**
  ```json
  {
    "run_id": "run_act_1728550000",
    "project_id": "proj_demo",
    "assessment_status": "supported",
    "candidate_cause": "Recent bad canary deployment causing payment gateway latency spikes",
    "recommended_action": "rollback_latest_deploy",
    "fallback_action": "disable_demo_feature_flag",
    "top_suspect": {
      "sha": "a1b2c3d4",
      "score": 85,
      "deployed_at": "2026-10-10T19:00:00.000Z"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "run_id": "run_act_1728550000",
    "decision": "ACT",
    "action": "rollback_latest_deploy",
    "fallback_action": "disable_demo_feature_flag",
    "rule_id": "R6_HIGH_EVIDENCE_REVERSIBLE",
    "policy_version": "v2-policy",
    "reason": "High confidence causal link backed by chronological telemetry; authorized catalogue action.",
    "slack_text": "🚨 *Incident Radar*: Assessment supported...",
    "timestamp": "2026-10-10T19:50:00.000Z"
  }
  ```

---

### 2.3 Action Execution (`POST /api/actions/execute`)
Executes an authorized remediation action.

- **Request Body:**
  ```json
  {
    "run_id": "run_act_1728550000",
    "project_id": "proj_demo",
    "role": "primary",
    "action": "rollback_latest_deploy",
    "target_sha": "a1b2c3d4"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "run_id": "run_act_1728550000",
    "role": "primary",
    "action": "rollback_latest_deploy",
    "status": "succeeded",
    "execution_id": "exec_1728550000_abc12",
    "executed_at": "2026-10-10T19:50:00.000Z",
    "details": {
      "target": "payment-service",
      "previous_version": "v2.4.1",
      "target_version": "v2.4.0"
    }
  }
  ```

---

### 2.4 Verification (`POST /api/verify`)
Polls fresh telemetry samples to verify recovery.

- **Request Body:**
  ```json
  {
    "run_id": "run_act_1728550000",
    "project_id": "proj_demo"
  }
  ```
- **Response (200 OK - Recovered):**
  ```json
  {
    "run_id": "run_act_1728550000",
    "verdict": "recovered",
    "consecutive_healthy": 3,
    "error_rate": 0.003,
    "p95_ms": 92,
    "status": "healthy",
    "samples": [
      { "error_rate": 0.004, "p95_ms": 95, "healthy": true },
      { "error_rate": 0.003, "p95_ms": 92, "healthy": true },
      { "error_rate": 0.002, "p95_ms": 89, "healthy": true }
    ],
    "verified_at": "2026-10-10T19:50:00.000Z"
  }
  ```

---

### 2.5 Run Finalization (`POST /api/runs/[id]/finalize`)
Finalizes the run and generates a SHA-256 Recovery Receipt.

- **Request Body:**
  ```json
  {
    "project_id": "proj_demo",
    "outcome": "resolved",
    "target_service": "payment-service",
    "error_rate": "0.3%",
    "p95_latency": "92ms"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "run_id": "run_act_1728550000",
    "outcome": "resolved",
    "receipt_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "slack_text": "✅ *Incident Radar — Incident Remediated & Verified*...",
    "finalized_at": "2026-10-10T19:50:00.000Z"
  }
  ```

---

### 2.6 Run Resume / Approval (`POST /api/runs/[id]/resume`)
Submits human approval or rejection for an `ASK` scenario run.

- **Request Body:**
  ```json
  {
    "decision": "approve",
    "token": "ey..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "run_id": "run_ask_1728550000",
    "decision": "approve",
    "status": "approved",
    "resumed_at": "2026-10-10T19:50:00.000Z"
  }
  ```
