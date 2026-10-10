import { Incident } from "@/types";

export const incidents: Incident[] = [
  {
    id: "INC-001",
    title: "Payment Service Degradation",
    severity: "critical",
    confidence: 94,
    status: "active",
    service: "payment-api",
    description:
      "Payment requests are failing due to probable database connection exhaustion following a recent deployment.",
    rootCause:
      "Recent deployment of payment-api v2.4.1 likely caused database connection pool exhaustion.",
    startTime: "2026-08-29T09:31:00Z",
    correlatedCount: 23,
    affectedServices: ["payment-api", "postgres-primary", "checkout-api"],
    evidence: [
      {
        id: "ev-1",
        title: "Deployment occurred at 09:31",
        detail: "payment-api v2.4.1 deployed successfully",
        source: "GitHub",
        timestamp: "09:31",
      },
      {
        id: "ev-2",
        title: "Database connections increased",
        detail: "42% → 92%",
        source: "PostgreSQL",
        timestamp: "09:32",
      },
      {
        id: "ev-3",
        title: "API latency increased",
        detail: "120ms → 640ms",
        source: "Datadog",
        timestamp: "09:33",
      },
      {
        id: "ev-4",
        title: "HTTP 500 errors increased",
        detail: "0.8% → 35%",
        source: "Application Logs",
        timestamp: "09:34",
      },
      {
        id: "ev-5",
        title: "Payment failures increased",
        detail: "+42%",
        source: "Payments",
        timestamp: "09:35",
      },
    ],
    recommendations: [
      {
        id: "rec-1",
        title: "Rollback deployment deploy_784",
        description:
          "The strongest evidence suggests the incident began shortly after the deployment and propagated through database connection exhaustion.",
        primary: true,
      },
      {
        id: "rec-2",
        title: "Inspect DB connection pool configuration",
      },
      {
        id: "rec-3",
        title: "Check for connection leaks",
      },
      {
        id: "rec-4",
        title: "Compare v2.4.1 with the previous deployment",
      },
    ],
    eventIds: Array.from({ length: 23 }, (_, i) => `evt-${String(i + 1).padStart(3, "0")}`),
    timeline: [
      {
        time: "09:31",
        title: "Deployment completed",
        detail: "payment-api v2.4.1",
        icon: "rocket",
      },
      {
        time: "09:32",
        title: "Database connections spike",
        detail: "42% → 92%",
        icon: "database",
      },
      {
        time: "09:33",
        title: "API latency increases",
        detail: "120ms → 640ms",
        icon: "activity",
      },
      {
        time: "09:34",
        title: "HTTP 500 errors increase",
        detail: "0.8% → 35%",
        icon: "alert",
      },
      {
        time: "09:35",
        title: "Payment failures detected",
        detail: "+42%",
        icon: "credit-card",
      },
    ],
  },
  {
    id: "INC-002",
    title: "Authentication Service Errors",
    severity: "high",
    confidence: 81,
    status: "active",
    service: "auth-api",
    description:
      "Elevated error rates in authentication flows correlating with increased token validation latency.",
    rootCause:
      "Possible cache stampede or Redis connection pressure after traffic surge.",
    startTime: "2026-08-29T09:18:00Z",
    correlatedCount: 12,
    affectedServices: ["auth-api", "redis", "api-gateway"],
    evidence: [
      {
        id: "ev-a1",
        title: "Auth error rate spike",
        detail: "1.2% → 12%",
        source: "Datadog",
        timestamp: "09:18",
      },
      {
        id: "ev-a2",
        title: "Token validation latency",
        detail: "45ms → 210ms",
        source: "Application Logs",
        timestamp: "09:19",
      },
    ],
    recommendations: [
      {
        id: "rec-a1",
        title: "Scale Redis read replicas",
        primary: true,
      },
      {
        id: "rec-a2",
        title: "Inspect JWT validation cache hit rate",
      },
    ],
    eventIds: ["evt-030", "evt-031", "evt-032"],
    timeline: [
      {
        time: "09:18",
        title: "Auth error rate spike",
        detail: "1.2% → 12%",
        icon: "alert",
      },
      {
        time: "09:19",
        title: "Token latency increase",
        detail: "45ms → 210ms",
        icon: "activity",
      },
    ],
  },
  {
    id: "INC-003",
    title: "Elevated API Latency",
    severity: "medium",
    confidence: 63,
    status: "investigating",
    service: "api-gateway",
    description:
      "P95 latency elevated across multiple upstream services without clear single root cause.",
    rootCause: "Network jitter or intermittent upstream saturation under investigation.",
    startTime: "2026-08-29T08:55:00Z",
    correlatedCount: 18,
    affectedServices: ["api-gateway", "payment-api", "checkout-api"],
    evidence: [
      {
        id: "ev-b1",
        title: "P95 latency rise",
        detail: "180ms → 420ms",
        source: "Datadog",
        timestamp: "08:55",
      },
    ],
    recommendations: [
      {
        id: "rec-b1",
        title: "Review upstream timeout budgets",
        primary: true,
      },
    ],
    eventIds: ["evt-040"],
    timeline: [
      {
        time: "08:55",
        title: "P95 latency rise",
        detail: "180ms → 420ms",
        icon: "activity",
      },
    ],
  },
  {
    id: "INC-004",
    title: "Cache Performance Degradation",
    severity: "low",
    confidence: 38,
    status: "active",
    service: "redis",
    description: "Slight increase in Redis memory usage and eviction rate.",
    rootCause: "Possible increase in cache key cardinality from new feature flags.",
    startTime: "2026-08-29T07:40:00Z",
    correlatedCount: 7,
    affectedServices: ["redis"],
    evidence: [
      {
        id: "ev-c1",
        title: "Redis memory usage",
        detail: "62% → 78%",
        source: "Redis",
        timestamp: "07:40",
      },
    ],
    recommendations: [
      {
        id: "rec-c1",
        title: "Audit cache key TTLs",
        primary: true,
      },
    ],
    eventIds: ["evt-050"],
    timeline: [
      {
        time: "07:40",
        title: "Redis memory rise",
        detail: "62% → 78%",
        icon: "database",
      },
    ],
  },
  {
    id: "INC-005",
    title: "Kubernetes Node Pressure",
    severity: "high",
    confidence: 72,
    status: "mitigated",
    service: "k8s-cluster",
    description: "Disk pressure on worker nodes in us-east-1a.",
    rootCause: "Log volume spike from verbose debug flags left enabled.",
    startTime: "2026-08-29T06:12:00Z",
    correlatedCount: 15,
    affectedServices: ["k8s-cluster", "payment-api"],
    evidence: [],
    recommendations: [
      {
        id: "rec-d1",
        title: "Reduce log verbosity",
        primary: true,
      },
    ],
    eventIds: [],
    timeline: [],
  },
  {
    id: "INC-006",
    title: "Checkout Timeout Increase",
    severity: "medium",
    confidence: 55,
    status: "active",
    service: "checkout-api",
    description: "Intermittent timeouts on checkout finalization endpoints.",
    rootCause: "Downstream payment service degradation cascading.",
    startTime: "2026-08-29T09:34:00Z",
    correlatedCount: 9,
    affectedServices: ["checkout-api", "payment-api"],
    evidence: [],
    recommendations: [
      {
        id: "rec-e1",
        title: "Increase circuit breaker thresholds temporarily",
        primary: true,
      },
    ],
    eventIds: [],
    timeline: [],
  },
];
