import test from "node:test";
import assert from "node:assert/strict";
import { generateRecoveryReceipt } from "./receipt";
import { setActiveRun, recordRecoverySample, updateRunState } from "./run-state";

test("generateRecoveryReceipt generates cryptographic receipt with empirical samples and SHA-256", async () => {
  const runId = `run_receipt_test_${Date.now()}`;
  await setActiveRun(runId, "inc_pay_99", "act", "proj_demo", "SIMULATION");

  // Record 3 consecutive healthy empirical samples
  await recordRecoverySample(runId, {
    sample_id: "smp_1",
    timestamp: "2026-10-11T04:00:00.000Z",
    error_rate: 0.006,
    p95_latency: 88,
    is_healthy: true,
    source: "telemetry",
  });

  await recordRecoverySample(runId, {
    sample_id: "smp_2",
    timestamp: "2026-10-11T04:00:10.000Z",
    error_rate: 0.004,
    p95_latency: 75,
    is_healthy: true,
    source: "telemetry",
  });

  await recordRecoverySample(runId, {
    sample_id: "smp_3",
    timestamp: "2026-10-11T04:00:20.000Z",
    error_rate: 0.002,
    p95_latency: 64,
    is_healthy: true,
    source: "telemetry",
  });

  await updateRunState(runId, {
    status: "resolved",
    action_executed: "rollback_latest_deploy",
    target_service: "payment-gateway",
  });

  const { receipt, hash } = await generateRecoveryReceipt(runId);

  assert.ok(hash);
  assert.equal(hash.length, 64); // SHA-256 is 64 hex characters
  assert.equal(receipt.run_metadata.id, runId);
  assert.equal(receipt.run_metadata.mode, "SIMULATION");
  assert.equal(receipt.run_metadata.action_executed, "rollback_latest_deploy");
  assert.equal(receipt.sla_compliance.consecutive_healthy_samples, 3);
  assert.equal(receipt.sla_compliance.observed_error_rate, "0.20%");
  assert.equal(receipt.sla_compliance.observed_p95_latency, "64ms");
  assert.equal(receipt.verification_evidence.length, 3);
  assert.equal(receipt.final_outcome, "resolved");
});
