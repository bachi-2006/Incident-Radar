import type { OperationalEvent, Severity, TenantId } from "./types";

interface NoiseTemplate {
  service: string;
  source: string;
  eventType: string;
  severity: Severity;
  message: string;
  metadata: () => Record<string, unknown>;
}

const NOISE_TEMPLATES: NoiseTemplate[] = [
  {
    service: "auth-service",
    source: "application-logs",
    eventType: "log.info",
    severity: "info",
    message: "Scheduled background token cleanup completed",
    metadata: () => ({ expiredTokensPurged: Math.floor(Math.random() * 50) + 1 }),
  },
  {
    service: "auth-service",
    source: "datadog",
    eventType: "metric.auth",
    severity: "info",
    message: "Token verification throughput normal",
    metadata: () => ({ rps: Math.floor(Math.random() * 200) + 300, p95Ms: 12 }),
  },
  {
    service: "api-gateway",
    source: "datadog",
    eventType: "metric.ingress",
    severity: "info",
    message: "Ingress request rate within normal boundaries",
    metadata: () => ({ reqPerSec: Math.floor(Math.random() * 1000) + 2500, http2Ratio: 0.94 }),
  },
  {
    service: "api-gateway",
    source: "kubernetes",
    eventType: "k8s.hpa",
    severity: "info",
    message: "HPA scaling evaluation: target replicas unchanged",
    metadata: () => ({ currentReplicas: 8, desiredReplicas: 8, targetUtilization: 60 }),
  },
  {
    service: "redis-cache",
    source: "redis",
    eventType: "cache.stats",
    severity: "info",
    message: "Cache hit ratio healthy at 97.2%",
    metadata: () => ({ hitRatio: 0.972, connectedClients: 42, memoryUsedMb: 512 }),
  },
  {
    service: "redis-cache",
    source: "datadog",
    eventType: "metric.latency",
    severity: "low",
    message: "Redis command latency nominal (0.8ms average)",
    metadata: () => ({ avgLatencyMs: 0.8, p99LatencyMs: 2.1 }),
  },
  {
    service: "notification-service",
    source: "application-logs",
    eventType: "log.info",
    severity: "info",
    message: "Email dispatch batch completed successfully",
    metadata: () => ({ dispatchedCount: Math.floor(Math.random() * 100) + 20, failureCount: 0 }),
  },
  {
    service: "user-service",
    source: "kubernetes",
    eventType: "k8s.pod.healthcheck",
    severity: "info",
    message: "Liveness and readiness probes passing",
    metadata: () => ({ probeType: "readiness", status: "success", pod: `user-svc-${Math.floor(Math.random() * 5)}` }),
  },
  {
    service: "inventory-service",
    source: "application-logs",
    eventType: "log.info",
    severity: "info",
    message: "Sync task completed with warehouse stream",
    metadata: () => ({ recordsProcessed: Math.floor(Math.random() * 500) + 100 }),
  },
  {
    service: "postgres-primary",
    source: "postgresql",
    eventType: "db.autovacuum",
    severity: "info",
    message: "Autovacuum completed on audit_logs table",
    metadata: () => ({ table: "audit_logs", durationSec: 1.4, deadTuplesRemoved: 320 }),
  },
  {
    service: "postgres-primary",
    source: "aws",
    eventType: "resource.snapshot",
    severity: "info",
    message: "Automated RDS snapshot backup completed",
    metadata: () => ({ snapshotId: `snap-auto-${Date.now()}`, sizeGb: 120 }),
  },
  {
    service: "search-service",
    source: "application-logs",
    eventType: "search.indexing",
    severity: "info",
    message: "Elasticsearch index refresh cycle finished",
    metadata: () => ({ docsIndexed: 310, tookMs: 45 }),
  },
  {
    service: "search-service",
    source: "datadog",
    eventType: "metric.cpu",
    severity: "low",
    message: "Search cluster CPU utilization steady at 41%",
    metadata: () => ({ cpuUtilization: 0.41, loadAvg: 1.8 }),
  },
  {
    service: "api-gateway",
    source: "system",
    eventType: "security.tls",
    severity: "info",
    message: "TLS certificate validity check OK (valid for 64 days)",
    metadata: () => ({ domain: "api.company.internal", daysRemaining: 64 }),
  },
  {
    service: "payment-service",
    source: "application-logs",
    eventType: "log.info",
    severity: "info",
    message: "Daily reconciliation worker idle check",
    metadata: () => ({ queueLength: 0 }),
  },
  {
    service: "payment-service",
    source: "datadog",
    eventType: "metric.jvm",
    severity: "low",
    message: "JVM GC pause duration within acceptable limits (14ms)",
    metadata: () => ({ gcPauseMs: 14, heapUsedMb: 680, heapMaxMb: 2048 }),
  },
  {
    service: "auth-service",
    source: "application-logs",
    eventType: "log.warn",
    severity: "medium",
    message: "Rate limit threshold reached for anonymous IP block",
    metadata: () => ({ ipMasked: "198.51.100.xxx", requestCount: 120, limit: 100 }),
  },
  {
    service: "inventory-service",
    source: "datadog",
    eventType: "metric.latency",
    severity: "low",
    message: "Catalog query p95 latency 38ms",
    metadata: () => ({ p95Ms: 38, qps: 85 }),
  },
];

export function generateNoiseEvent(
  tenantId: TenantId,
  timestamp: Date,
  idNumber: number
): OperationalEvent {
  const template = NOISE_TEMPLATES[Math.floor(Math.random() * NOISE_TEMPLATES.length)];
  return {
    eventId: `evt_noise_${String(idNumber).padStart(4, "0")}`,
    tenantId,
    timestamp: timestamp.toISOString(),
    service: template.service,
    source: template.source,
    eventType: template.eventType,
    severity: template.severity,
    message: template.message,
    metadata: template.metadata(),
  };
}

export function generateNoiseStream(
  tenantId: TenantId,
  count: number,
  startTime: Date,
  durationMinutes: number = 15,
  startId: number = 1
): OperationalEvent[] {
  const events: OperationalEvent[] = [];
  const durationMs = durationMinutes * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const randomOffsetMs = Math.floor(Math.random() * durationMs);
    const eventTime = new Date(startTime.getTime() + randomOffsetMs);
    events.push(generateNoiseEvent(tenantId, eventTime, startId + i));
  }

  return events;
}

