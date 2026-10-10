import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_ACTIONS,
  SimulationActionAdapter,
  executeActionWithAdapter,
} from "./action-adapters";

test("ALLOWED_ACTIONS contains standard catalogue actions", () => {
  assert.ok(ALLOWED_ACTIONS.includes("rollback_latest_deploy"));
  assert.ok(ALLOWED_ACTIONS.includes("disable_demo_feature_flag"));
  assert.ok(ALLOWED_ACTIONS.includes("restart_demo_service"));
});

test("executeActionWithAdapter rejects actions not in allowed catalogue", async () => {
  await assert.rejects(
    async () => {
      await executeActionWithAdapter({
        runId: "run_test_unauth",
        action: "drop_database_all",
        idempotencyKey: "test-unauth-action",
        mode: "SIMULATION",
      });
    },
    {
      message: /is not in the allowed remediation catalogue/,
    }
  );
});

test("SimulationActionAdapter models structured outputs for rollback", async () => {
  const adapter = new SimulationActionAdapter();
  const res = await adapter.execute({
    runId: "run_sim_rollback_123",
    action: "rollback_latest_deploy",
    targetService: "checkout-service",
    idempotencyKey: "key-rollback-123",
    mode: "SIMULATION",
  });

  assert.equal(res.status, "succeeded");
  assert.equal(res.action, "rollback_latest_deploy");
  assert.equal(res.mode, "SIMULATION");
  assert.equal(res.output.service, "checkout-service");
  assert.ok(res.output.target_version);
  assert.ok(res.output.containers_restarted > 0);
});

test("executeActionWithAdapter enforces idempotency protection", async () => {
  const key = `idempotency-test-${Date.now()}`;
  const first = await executeActionWithAdapter({
    runId: "run_idem_1",
    action: "restart_demo_service",
    targetService: "auth-gateway",
    idempotencyKey: key,
    mode: "SIMULATION",
  });
  assert.equal(first.status, "succeeded");

  // Re-executing with the exact same key returns skipped
  const second = await executeActionWithAdapter({
    runId: "run_idem_1",
    action: "restart_demo_service",
    targetService: "auth-gateway",
    idempotencyKey: key,
    mode: "SIMULATION",
  });
  assert.equal(second.status, "skipped");
  assert.ok(second.output.idempotency_note);
});
