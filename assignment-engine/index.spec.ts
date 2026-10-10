import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRuleScores,
  combineCategoryScores,
  computeCandidateFit,
  computeAssignmentConfidence,
  getDecisionTier,
  calculateSlaDeadlines,
  MemberProfile,
} from "./index";

test("computeRuleScores classifies frontend evidence", () => {
  const evidence = {
    files: ["src/components/CheckoutButton.tsx"],
    silent_kinds: ["dead_click"],
  };
  const scores = computeRuleScores(evidence);
  assert.ok(scores.frontend > scores.backend);
});

test("computeRuleScores classifies backend exception evidence", () => {
  const evidence = {
    messages: ["NullPointerException in processPayment at CheckoutController.java:42"],
    files: ["src/app/api/checkout/route.ts"],
  };
  const scores = computeRuleScores(evidence);
  assert.ok(scores.backend > scores.frontend);
});

test("combineCategoryScores detects top category and secondary mixed issue", () => {
  const rule = {
    system_architecture: 0.1,
    frontend: 0.45,
    backend: 0.35,
    database: 0.05,
    devops: 0.02,
    security: 0.03,
  };
  const combined = combineCategoryScores(rule);
  assert.equal(combined.topCategory, "frontend");
  assert.equal(combined.secondaryCategory, "backend"); // diff 0.1 < 0.15
});

test("computeCandidateFit respects Out of Office filter", () => {
  const member: MemberProfile = {
    id: "m1",
    github_login: "user1",
    display_name: "User One",
    role: "responder",
    out_of_office: true,
    expertise: { frontend: 5 },
  };
  const fit = computeCandidateFit(member, "frontend");
  assert.equal(fit.fit, 0);
});

test("computeAssignmentConfidence and decisionTier", () => {
  const conf = computeAssignmentConfidence(0.85, 0.9);
  assert.ok(conf >= 75);
  assert.equal(getDecisionTier(conf), "auto");

  assert.equal(getDecisionTier(60), "confirm");
  assert.equal(getDecisionTier(40), "pick");
});

test("calculateSlaDeadlines scales with demo multiplier", () => {
  const d1 = calculateSlaDeadlines("critical", 1);
  const d60 = calculateSlaDeadlines("critical", 60);

  const diffAck1 = d1.ackDueAt.getTime() - Date.now();
  const diffAck60 = d60.ackDueAt.getTime() - Date.now();

  assert.ok(diffAck60 < diffAck1);
});
