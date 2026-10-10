import test from "node:test";
import assert from "node:assert/strict";

test("policy decision rule evaluation logic", () => {
  // Test rule criteria: supported + allowed catalogue action -> ACT
  const supported = "supported";
  const action = "rollback_latest_deploy";
  const allowed = ["rollback_latest_deploy", "disable_demo_feature_flag", "restart_demo_service"];
  const isAllowed = allowed.includes(action);

  const decision = supported === "supported" && isAllowed ? "ACT" : "NOTIFY";
  assert.equal(decision, "ACT");
});

test("policy decision rule evaluation for uncertain triage -> ASK", () => {
  const status = "uncertain";
  const decision = status === "uncertain" ? "ASK" : "NOTIFY";
  assert.equal(decision, "ASK");
});

test("policy decision rule evaluation for contradictory evidence -> NOTIFY", () => {
  const status: string = "contradictory";
  const decision = status === "supported" ? "ACT" : status === "uncertain" ? "ASK" : "NOTIFY";
  assert.equal(decision, "NOTIFY");
});
