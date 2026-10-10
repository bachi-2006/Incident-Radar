import test from "node:test";
import assert from "node:assert/strict";
import { mapAgentOutputToIncident, normalizeEventType, normalizeSeverity } from "./mappers";

test("normalizeSeverity maps agent values to canonical UI severities", () => {
  assert.equal(normalizeSeverity("CRITICAL"), "critical");
  assert.equal(normalizeSeverity("WARNING"), "medium");
  assert.equal(normalizeSeverity("INFO"), "info");
  assert.equal(normalizeSeverity("high"), "high");
});

test("normalizeEventType canonicalizes dotted ingestion strings", () => {
  assert.equal(normalizeEventType("deployment.completed"), "deployment");
  assert.equal(normalizeEventType("business_failure"), "business_failure");
  assert.equal(normalizeEventType("metric.usage"), "metric");
});

test("mapAgentOutputToIncident unwraps the bundle and builds timeline from relationships", () => {
  const payload = {
    incident_id: "INC-201",
    incident_title: "Checkout latency spike",
    time_window: { start: "2026-08-29T09:00:00Z", end: "2026-08-29T09:10:00Z" },
    affected_services: ["checkout-api", "payment-api"],
    event_count: 3,
    correlation_score: 0.94,
    correlation_reasons: ["temporal_proximity", "service_overlap"],
    severity: "CRITICAL",
    status: "active",
    service: "checkout-api",
    events: [
      { event_id: "evt-1", service: "checkout-api", event_type: "business_failure", severity: "CRITICAL", source: "Application Logs", incidentId: "INC-201", message: "Payment failures started" },
      { event_id: "evt-2", service: "payment-api", event_type: "metric", severity: "WARNING", source: "Datadog", incidentId: "INC-201", message: "Latency rose" },
      { event_id: "evt-3", service: "checkout-api", event_type: "deployment", severity: "INFO", source: "GitHub", incidentId: "INC-201", message: "Release pushed" },
    ],
    relationships: [
      { from: "evt-3", to: "evt-2", type: "PRECEDES" },
      { from: "evt-2", to: "evt-1", type: "PRECEDES" },
    ],
  };

  const mapped = mapAgentOutputToIncident(payload as any);

  assert.equal(mapped.id, "INC-201");
  assert.equal(mapped.title, "Checkout latency spike");
  assert.equal(mapped.confidence, 94);
  assert.equal(mapped.severity, "critical");
  assert.equal(mapped.affectedServices.length, 2);
  assert.equal(mapped.evidence.length, 2);
  assert.equal(mapped.timeline.length, 3);
  assert.equal(mapped.timeline[0].title, "Release pushed");
});
