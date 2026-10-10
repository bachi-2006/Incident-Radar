import type { IncidentScenario } from "../types";

export const paymentDegradationScenario: IncidentScenario = {
  id: "payment-degradation",
  name: "Payment Service Degradation",
  description: "Deployment causes pool pressure, latency growth, HTTP 500s, and payment failures.",
  durationSeconds: 420,
  steps: [
    { offsetSeconds: 0, service: "payment-service", source: "deployment", eventType: "deployment.completed", severity: "info", message: "Deployment v42 completed successfully", metadata: { version: "v42", environment: "production" } },
    { offsetSeconds: 75, service: "postgres-primary", source: "postgresql", eventType: "db.pool.utilization", severity: "medium", message: "Connection pool utilization elevated at 68%", metadata: { poolUsage: 0.68, maxConnections: 100, activeConnections: 68 } },
    { offsetSeconds: 120, service: "postgres-primary", source: "postgresql", eventType: "db.pool.utilization", severity: "high", message: "Connection pool utilization reached 92%", metadata: { poolUsage: 0.92, maxConnections: 100, waitingQueries: 6, activeConnections: 92 } },
    { offsetSeconds: 165, service: "payment-service", source: "datadog", eventType: "metric.latency", severity: "medium", message: "P95 latency elevated: 120ms -> 340ms", metadata: { p50Ms: 90, p95Ms: 340, p99Ms: 620, metric: "latency", value: 340 } },
    { offsetSeconds: 205, service: "payment-service", source: "datadog", eventType: "metric.latency", severity: "high", message: "P95 latency reached 640ms (threshold: 400ms)", metadata: { p50Ms: 140, p95Ms: 640, p99Ms: 1250, metric: "latency", value: 640 } },
    { offsetSeconds: 248, service: "payment-service", source: "application-logs", eventType: "http.server.error", severity: "critical", message: "HTTP 500 error rate increased from 0.5% to 18%", metadata: { errorRate: 0.18, statusCode: 500, sampleWindow: "1m" } },
    { offsetSeconds: 278, service: "payment-service", source: "application-logs", eventType: "http.server.error", severity: "critical", message: "HTTP 500 error rate reached 36%", metadata: { errorRate: 0.36, statusCode: 500, sampleWindow: "1m" } },
    { offsetSeconds: 325, service: "checkout-service", source: "payments", eventType: "business.payment.failure", severity: "critical", message: "Payment transaction success rate dropped to 48%", metadata: { successRate: 0.48, baselineRate: 0.995, failedTxCount: 64 } },
  ],
};

