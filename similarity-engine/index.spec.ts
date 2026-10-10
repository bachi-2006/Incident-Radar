import test from "node:test";
import assert from "node:assert/strict";
import { computeCommitSimilarity, rankSuspectCommits, IncidentSignature, CommitData } from "./index";

test("computeCommitSimilarity ranks culprit commit with matching path and symbol high", () => {
  const sig: IncidentSignature = {
    files: ["src/components/CheckoutButton.tsx", "src/app/api/checkout/route.ts"],
    symbols: ["processPayment"],
    text: "NullPointerException in processPayment at CheckoutController.java:42",
    services: ["payment-service"],
    start: new Date(),
  };

  const culpritCommit: CommitData = {
    sha: "v2.4.1-culprit",
    author_login: "rahul-backend",
    message: "refactor: update processPayment checkout controller flow",
    committed_at: new Date(Date.now() - 10 * 60 * 1000), // 10m ago
    files: ["src/app/api/checkout/route.ts", "src/components/CheckoutButton.tsx"],
    symbols: ["processPayment"],
  };

  const innocentCommit: CommitData = {
    sha: "v2.4.0-innocent",
    author_login: "priya-frontend",
    message: "docs: update contributor guidelines",
    committed_at: new Date(Date.now() - 120 * 60 * 1000), // 2h ago
    files: ["docs/README.md"],
    symbols: [],
  };

  const ranked = rankSuspectCommits(sig, [innocentCommit, culpritCommit]);

  assert.equal(ranked[0].sha, "v2.4.1-culprit");
  assert.equal(ranked[0].rank, 1);
  assert.ok(ranked[0].score >= 70);
});
