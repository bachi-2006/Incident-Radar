import test from "node:test";
import assert from "node:assert/strict";
import { scrubPII } from "./index";

test("scrubPII redacts emails, credit card numbers, JWT tokens, and query strings", () => {
  const input = "Error for john.doe@example.com with token Bearer secret123 and card 4532015698432105 on /api/user?token=xyz";
  const output = scrubPII(input);

  assert.equal(output.includes("john.doe@example.com"), false);
  assert.equal(output.includes("[REDACTED_EMAIL]"), true);
  assert.equal(output.includes("4532015698432105"), false);
  assert.equal(output.includes("[REDACTED_NUMBER]"), true);
  assert.equal(output.includes("Bearer secret123"), false);
  assert.equal(output.includes("Bearer [REDACTED_TOKEN]"), true);
  assert.equal(output.includes("?token=xyz"), false);
});
