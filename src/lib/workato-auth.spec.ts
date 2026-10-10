import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkatoAuth } from "./workato-auth";

test("validateWorkatoAuth rejects request without secret header", () => {
  const req = new Request("https://incident-radar.onrender.com/api/actions/execute", {
    method: "POST",
  });
  const res = validateWorkatoAuth(req);
  assert.equal(res.authorized, false);
  assert.equal(res.status, 401);
});

test("validateWorkatoAuth rejects request with invalid secret header", () => {
  const req = new Request("https://incident-radar.onrender.com/api/actions/execute", {
    method: "POST",
    headers: {
      "X-IR-Secret": "invalid-secret-key-12345",
    },
  });
  const res = validateWorkatoAuth(req);
  assert.equal(res.authorized, false);
  assert.equal(res.status, 401);
});

test("validateWorkatoAuth authorizes request with valid X-IR-Secret header", () => {
  const validSecret =
    process.env.WORKATO_SHARED_SECRET ||
    "83ea2f004e0a8204c943192a99b1116e252b3360dadb7d337f4282a0d530741d";
  const req = new Request("https://incident-radar.onrender.com/api/actions/execute", {
    method: "POST",
    headers: {
      "X-IR-Secret": validSecret,
    },
  });
  const res = validateWorkatoAuth(req);
  assert.equal(res.authorized, true);
});

test("validateWorkatoAuth authorizes request with valid Bearer token", () => {
  const validSecret =
    process.env.WORKATO_SHARED_SECRET ||
    "83ea2f004e0a8204c943192a99b1116e252b3360dadb7d337f4282a0d530741d";
  const req = new Request("https://incident-radar.onrender.com/api/actions/execute", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${validSecret}`,
    },
  });
  const res = validateWorkatoAuth(req);
  assert.equal(res.authorized, true);
});
