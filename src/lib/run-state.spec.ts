import test from "node:test";
import assert from "node:assert/strict";
import { setActiveRun, getRunById, updateRunState, incrementRunPollCount, recordAuditLog, getInMemoryAuditLogs } from "./run-state";

test("setActiveRun creates and retrieves run record", async () => {
  const runId = `test_run_${Date.now()}`;
  const run = await setActiveRun(runId, "inc_123", "act");
  assert.equal(run.id, runId);
  assert.equal(run.incident_id, "inc_123");
  assert.equal(run.scenario, "act");

  const fetched = await getRunById(runId);
  assert.equal(fetched?.id, runId);
});

test("updateRunState updates run fields", async () => {
  const runId = `test_run_${Date.now()}`;
  await setActiveRun(runId, "inc_123", "ask");
  const updated = await updateRunState(runId, { status: "awaiting_approval", decision: "ASK" });

  assert.equal(updated?.status, "awaiting_approval");
  assert.equal(updated?.decision, "ASK");
});

test("incrementRunPollCount increments count", async () => {
  const runId = `test_run_${Date.now()}`;
  await setActiveRun(runId);
  const c1 = await incrementRunPollCount(runId);
  const c2 = await incrementRunPollCount(runId);

  assert.equal(c1, 1);
  assert.equal(c2, 2);
});

test("recordAuditLog appends to audit log", async () => {
  await recordAuditLog({
    actor: "system",
    action: "test_action",
    target: "run_123",
    detail: { key: "value" },
  });

  const logs = getInMemoryAuditLogs();
  assert.ok(logs.some((l) => l.action === "test_action" && l.target === "run_123"));
});
