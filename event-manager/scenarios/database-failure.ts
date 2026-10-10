import type { IncidentScenario } from "../types";

export const databaseFailureScenario: IncidentScenario = {
  id: "database-failure",
  name: "Database Failure",
  description: "Primary database saturation cascades into API timeouts and checkout failures.",
  durationSeconds: 360,
  steps: [
    { offsetSeconds: 0, service: "postgres-primary", source: "aws", eventType: "db.cpu.saturation", severity: "high", message: "RDS CPU utilization climbed to 89%", metadata: { cpuUtilization: 0.89, metric: "cpu", value: 89 } },
    { offsetSeconds: 60, service: "postgres-primary", source: "postgresql", eventType: "db.query.latency", severity: "high", message: "Average query latency exceeded 420ms", metadata: { metric: "latency", value: 420, blockedQueries: 17 } },
    { offsetSeconds: 115, service: "api-gateway", source: "datadog", eventType: "metric.timeout", severity: "high", message: "Upstream timeout rate rising against checkout-service", metadata: { timeoutRate: 0.14 } },
    { offsetSeconds: 165, service: "checkout-service", source: "application-logs", eventType: "http.server.error", severity: "critical", message: "Checkout request timeout threshold exceeded", metadata: { statusCode: 504, timeoutMs: 5000 } },
    { offsetSeconds: 230, service: "checkout-service", source: "payments", eventType: "business.payment.failure", severity: "critical", message: "Checkout abandonment spiked during database timeout window", metadata: { abandonmentRate: 0.31 } },
  ],
};

