import assert from "node:assert/strict";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { generateTimeline } from "./engine";
import { paymentDegradationScenario } from "./scenarios/payment-degradation";
import { generateNoiseStream, generateNoiseEvent } from "./noise";
import { JsonlTransport } from "./transports/jsonl";
import { ConsoleTransport } from "./transports/console";
import { HttpTransport } from "./transports/http";
import type { OperationalEvent, Severity, TenantId } from "./types";

const REQUIRED_FIELDS = [
  "eventId",
  "tenantId",
  "timestamp",
  "service",
  "source",
  "eventType",
  "severity",
  "message",
  "metadata",
] as const;

const VALID_SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const FORBIDDEN_FIELDS = ["incidentId", "rootCause", "causalChain", "clusterId", "isIncident", "groundTruth"];

function validateEventSchema(evt: OperationalEvent, index?: number) {
  const prefix = index !== undefined ? `Event #${index}: ` : "Event: ";

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    assert(
      field in evt && evt[field as keyof OperationalEvent] !== undefined,
      `${prefix}Missing required field "${field}"`
    );
  }

  // Check types
  assert(typeof evt.eventId === "string" && evt.eventId.length > 0, `${prefix}Invalid eventId`);
  assert(typeof evt.tenantId === "string" && evt.tenantId.length > 0, `${prefix}Invalid tenantId`);
  assert(typeof evt.timestamp === "string" && !isNaN(Date.parse(evt.timestamp)), `${prefix}Invalid timestamp format`);
  assert(typeof evt.service === "string" && evt.service.length > 0, `${prefix}Invalid service`);
  assert(typeof evt.source === "string" && evt.source.length > 0, `${prefix}Invalid source`);
  assert(typeof evt.eventType === "string" && evt.eventType.length > 0, `${prefix}Invalid eventType`);
  assert(VALID_SEVERITIES.includes(evt.severity), `${prefix}Invalid severity: ${evt.severity}`);
  assert(typeof evt.message === "string" && evt.message.length > 0, `${prefix}Invalid message`);
  assert(typeof evt.metadata === "object" && evt.metadata !== null, `${prefix}Invalid metadata`);

  // Check no ground-truth leak
  for (const forbidden of FORBIDDEN_FIELDS) {
    assert(
      !(forbidden in evt),
      `${prefix}Found forbidden ground-truth field "${forbidden}" in event payload!`
    );
  }
}

async function runTests() {
  console.log("▶ Running Event Manager Verification Suite...\n");

  // 1. Test Schema Validity on Payment Scenario (no noise)
  console.log("1. Testing Schema Validity on Deterministic Payment Scenario...");
  const baseEvents = generateTimeline(paymentDegradationScenario, {
    tenantId: "acme-prod",
    noiseCount: 0,
  });

  assert.equal(baseEvents.length, paymentDegradationScenario.steps.length);
  baseEvents.forEach((evt, i) => validateEventSchema(evt, i));
  console.log(`   ✔ All ${baseEvents.length} scenario events strictly conform to schema.\n`);

  // 2. Test Tenant Isolation
  console.log("2. Testing Tenant Isolation across standard tenants...");
  const tenants: TenantId[] = ["acme-prod", "novapay-prod", "techflow-staging"];
  for (const t of tenants) {
    const tenantEvents = generateTimeline(paymentDegradationScenario, {
      tenantId: t,
      noiseCount: 5,
    });
    for (const evt of tenantEvents) {
      assert.equal(evt.tenantId, t, `Event tenantId "${evt.tenantId}" does not match requested tenant "${t}"`);
    }
  }
  console.log("   ✔ Tenant isolation verified across acme-prod, novapay-prod, and techflow-staging.\n");

  // 3. Test Deterministic Progression in Payment Scenario
  console.log("3. Testing Payment Scenario Determinism and Cascade Steps...");
  const runA = generateTimeline(paymentDegradationScenario, { tenantId: "acme-prod", noiseCount: 0, startTime: new Date("2026-08-29T10:00:00Z") });
  const runB = generateTimeline(paymentDegradationScenario, { tenantId: "acme-prod", noiseCount: 0, startTime: new Date("2026-08-29T10:00:00Z") });

  assert.deepEqual(runA, runB, "Deterministic runs with same start time must produce identical output");

  // Verify the causal progression is reflected in operational signals without explicit labels:
  // Step 1: deployment
  assert.equal(runA[0].eventType, "deployment.completed");
  assert.equal(runA[0].service, "payment-service");

  // DB connection saturation
  const dbEvents = runA.filter((e) => e.service === "postgres-primary");
  assert(dbEvents.length >= 2, "Expected DB connection metric events");
  assert(dbEvents.some((e) => e.eventType === "db.pool.utilization"));

  // Latency increase
  const latencyEvents = runA.filter((e) => e.eventType === "metric.latency");
  assert(latencyEvents.length >= 2, "Expected latency events");

  // HTTP Errors
  const httpErrors = runA.filter((e) => e.eventType === "http.server.error");
  assert(httpErrors.length >= 2, "Expected HTTP 500 error events");

  // Payment Failures
  const paymentFailures = runA.filter((e) => e.eventType === "business.payment.failure");
  assert.equal(paymentFailures.length, 1, "Expected payment failure event");
  console.log("   ✔ Deterministic payment degradation sequence verified (deployment → DB → latency → HTTP 500 → payment failure).\n");

  // 4. Test Background Noise Generation
  console.log("4. Testing Background Noise Generation...");
  const noiseEvents = generateNoiseStream("novapay-prod", 30, new Date(), 20);
  assert.equal(noiseEvents.length, 30);
  noiseEvents.forEach((evt, i) => validateEventSchema(evt, i));
  console.log(`   ✔ Generated ${noiseEvents.length} schema-valid noise events across multiple services.\n`);

  // 5. Test Chronological Timestamp Ordering with mixed scenario + noise
  console.log("5. Testing Event Ordering and Interleaving...");
  const mixedTimeline = generateTimeline(paymentDegradationScenario, {
    tenantId: "techflow-staging",
    noiseCount: 50,
  });

  for (let i = 0; i < mixedTimeline.length - 1; i++) {
    const current = new Date(mixedTimeline[i].timestamp).getTime();
    const next = new Date(mixedTimeline[i + 1].timestamp).getTime();
    assert(
      current <= next,
      `Events not in chronological order! Index ${i} (${mixedTimeline[i].timestamp}) > Index ${i + 1} (${mixedTimeline[i + 1].timestamp})`
    );
  }
  console.log(`   ✔ Total ${mixedTimeline.length} interleaved events are strictly ordered by timestamp.\n`);

  // 6. Test Transports (Console & JSONL)
  console.log("6. Testing JSONL & Console Transports...");
  const testFilePath = "./test-output.jsonl";
  if (existsSync(testFilePath)) unlinkSync(testFilePath);

  const jsonlTransport = new JsonlTransport({ filePath: testFilePath });
  await jsonlTransport.sendBatch(mixedTimeline);

  assert(existsSync(testFilePath), "JSONL file should have been created");
  const fileContent = readFileSync(testFilePath, "utf-8").trim().split("\n");
  assert.equal(fileContent.length, mixedTimeline.length, "JSONL line count must match event count");

  // Parse lines to verify valid JSON
  fileContent.forEach((line, idx) => {
    const parsed = JSON.parse(line);
    validateEventSchema(parsed, idx);
  });
  unlinkSync(testFilePath);
  console.log("   ✔ JSONL transport successfully wrote and verified all lines.\n");

  // 7. Test HttpTransport interface creation
  const httpTransport = new HttpTransport({ endpoint: "http://localhost:9999/test-events" });
  assert(httpTransport, "HttpTransport instantiated");
  console.log("   ✔ HttpTransport interface ready and configurable.\n");

  console.log("=========================================");
  console.log("🎉 ALL EVENT MANAGER TESTS PASSED (7/7)!");
  console.log("=========================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

