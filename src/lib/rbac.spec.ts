import test from "node:test";
import assert from "node:assert/strict";
import { isRoleAtLeast, checkProjectPermission } from "./rbac";

test("isRoleAtLeast correctly compares project roles", () => {
  assert.equal(isRoleAtLeast("maintainer", "responder"), true);
  assert.equal(isRoleAtLeast("responder", "responder"), true);
  assert.equal(isRoleAtLeast("viewer", "responder"), false);
  assert.equal(isRoleAtLeast("admin", "maintainer"), true);
});

test("checkProjectPermission fails closed when user identification is missing", async () => {
  const res = await checkProjectPermission({
    requiredRole: "responder",
  });
  assert.equal(res.allowed, false);
  assert.ok(res.reason?.includes("Missing user identification"));
});

test("checkProjectPermission authorizes canonical roster members with appropriate roles", async () => {
  // Rohith D is admin
  const adminRes = await checkProjectPermission({
    slackUserId: "U0C846MT30D",
    requiredRole: "admin",
  });
  assert.equal(adminRes.allowed, true);
  assert.equal(adminRes.role, "admin");

  // Dachepally is maintainer, satisfying responder
  const maintainerRes = await checkProjectPermission({
    slackUserId: "U0C7TNSNS5D",
    requiredRole: "responder",
  });
  assert.equal(maintainerRes.allowed, true);
  assert.equal(maintainerRes.role, "maintainer");
});

test("checkProjectPermission fails closed for unknown user or insufficient role", async () => {
  const unknownRes = await checkProjectPermission({
    slackUserId: "U_UNKNOWN_ATTACKER",
    requiredRole: "responder",
  });
  assert.equal(unknownRes.allowed, false);

  // Dachepally (maintainer) is not an admin
  const insufficientRes = await checkProjectPermission({
    slackUserId: "U0C7TNSNS5D",
    requiredRole: "admin",
  });
  assert.equal(insufficientRes.allowed, false);
});
