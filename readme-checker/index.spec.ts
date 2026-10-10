import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { checkStructural, computeVerdictAndScore } from "./index";

test("checkStructural fails on current README lacking Problem/Solution headings", () => {
  const currentReadmePath = path.join(process.cwd(), "README.md");
  const readmeText = fs.readFileSync(currentReadmePath, "utf-8");

  const result = checkStructural(readmeText);
  assert.equal(result.exists, true);
  assert.equal(result.problem_heading, false);
  assert.equal(result.solution_heading, false);

  const evaluated = computeVerdictAndScore(result);
  assert.equal(evaluated.verdict, "fail");
  assert.ok(evaluated.score < 80);
});

test("checkStructural passes on compliant README with Problem and Solution sections", () => {
  const compliantReadme = `
# Incident Radar

## Problem Statement
Engineering teams operating complex enterprise microservice architectures face significant challenges when cascading operational failures occur in production environments.
Traditional monitoring tools produce hundreds of noisy alerts without contextual correlation, making it difficult for on-call responders to identify the true root cause quickly.
Without clear expertise-based ownership and automated triage, operational incidents result in prolonged service downtime, customer impact, and severe business degradation.

## Solution
Incident Radar provides an automated agentic workflow powered by Workato to correlate operational signals, perform intelligent triage, and execute verified safe remediations.
It ingests telemetry from application logs, browser SDKs, and GitHub CI/CD webhooks, evaluating policy before executing catalogue actions.
Every remediation is verified against 3 consecutive fresh telemetry samples before issuing a cryptographically signed Recovery Receipt.
`;

  const result = checkStructural(compliantReadme);
  assert.equal(result.exists, true);
  assert.equal(result.problem_heading, true);
  assert.equal(result.solution_heading, true);
  assert.ok(result.problem_words >= 50);
  assert.ok(result.solution_words >= 50);
  assert.equal(result.order_ok, true);

  const evaluated = computeVerdictAndScore(result);
  assert.equal(evaluated.verdict, "pass");
  assert.equal(evaluated.score, 100);
});
