import test from "node:test";
import assert from "node:assert/strict";
import { generateApprovalToken, verifyApprovalToken, hashToken } from "./approval-token";

test("generateApprovalToken produces verifiable signed token", () => {
  const token = generateApprovalToken("run_ask_123");
  assert.ok(token);
  assert.ok(token.includes("."));

  const verified = verifyApprovalToken(token, "run_ask_123");
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.runId, "run_ask_123");
  assert.ok(verified.tokenHash);
});

test("verifyApprovalToken detects runId mismatch", () => {
  const token = generateApprovalToken("run_ask_123");
  const verified = verifyApprovalToken(token, "run_other_456");
  assert.equal(verified.valid, false);
  assert.equal(verified.reason, "Token run ID mismatch");
});

test("verifyApprovalToken detects expired token", () => {
  const token = generateApprovalToken("run_ask_123", -1000); // already expired
  const verified = verifyApprovalToken(token, "run_ask_123");
  assert.equal(verified.valid, false);
  assert.equal(verified.reason, "Approval token expired");
});

test("verifyApprovalToken rejects tampered token signature", () => {
  const token = generateApprovalToken("run_ask_123");
  const tamperedToken = token.slice(0, -4) + "0000";
  const verified = verifyApprovalToken(tamperedToken, "run_ask_123");
  assert.equal(verified.valid, false);
  assert.equal(verified.reason, "Invalid token signature");
});

test("hashToken returns deterministic SHA-256 hash", () => {
  const token = "sample.token";
  const h1 = hashToken(token);
  const h2 = hashToken(token);
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
});
