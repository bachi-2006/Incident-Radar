import test from "node:test";
import assert from "node:assert/strict";
import { isRoleAtLeast, checkProjectPermission } from "./rbac";

test("isRoleAtLeast correctly compares project roles", () => {
  assert.equal(isRoleAtLeast("maintainer", "responder"), true);
  assert.equal(isRoleAtLeast("responder", "responder"), true);
  assert.equal(isRoleAtLeast("viewer", "responder"), false);
  assert.equal(isRoleAtLeast("admin", "maintainer"), true);
});

test("checkProjectPermission handles default fallback", async () => {
  const res = await checkProjectPermission({
    requiredRole: "responder",
  });
  assert.equal(res.allowed, true);
});
