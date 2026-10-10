import { Event, EventSource, Severity, EventType } from "@/types";

const services = [
  "payment-api",
  "postgres-primary",
  "checkout-api",
  "auth-api",
  "api-gateway",
  "redis",
  "notification-service",
  "k8s-cluster",
];

const sources: EventSource[] = [
  "GitHub",
  "Datadog",
  "AWS",
  "PostgreSQL",
  "Application Logs",
  "Kubernetes",
  "Payments",
  "Redis",
  "PagerDuty",
];

const severities: Severity[] = ["critical", "high", "medium", "low", "info"];
const types: EventType[] = [
  "deployment",
  "metric",
  "log",
  "alert",
  "error",
  "health",
  "resource",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function makeTs(hour: number, min: number, sec = 0) {
  return `2026-08-29T${pad(hour)}:${pad(min)}:${pad(sec)}Z`;
}

// Core correlated events for INC-001
const criticalEvents: Event[] = [
  {
    id: "evt-001",
    timestamp: makeTs(9, 31, 0),
    service: "payment-api",
    source: "GitHub",
    type: "deployment",
    message: "Deployment completed: payment-api v2.4.1 (deploy_784)",
    severity: "info",
    incidentId: "INC-001",
  },
  {
    id: "evt-002",
    timestamp: makeTs(9, 31, 12),
    service: "payment-api",
    source: "Kubernetes",
    type: "deployment",
    message: "Rolling update started for payment-api",
    severity: "info",
    incidentId: "INC-001",
  },
  {
    id: "evt-003",
    timestamp: makeTs(9, 31, 45),
    service: "payment-api",
    source: "Kubernetes",
    type: "health",
    message: "New pods ready: 3/3",
    severity: "info",
    incidentId: "INC-001",
  },
  {
    id: "evt-004",
    timestamp: makeTs(9, 32, 5),
    service: "postgres-primary",
    source: "PostgreSQL",
    type: "metric",
    message: "Connection pool utilization 42% → 68%",
    severity: "medium",
    incidentId: "INC-001",
  },
  {
    id: "evt-005",
    timestamp: makeTs(9, 32, 20),
    service: "postgres-primary",
    source: "PostgreSQL",
    type: "metric",
    message: "Connection pool utilization reached 92%",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-006",
    timestamp: makeTs(9, 32, 35),
    service: "postgres-primary",
    source: "Datadog",
    type: "alert",
    message: "High connection count alert triggered",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-007",
    timestamp: makeTs(9, 33, 0),
    service: "payment-api",
    source: "Datadog",
    type: "metric",
    message: "P95 latency 120ms → 340ms",
    severity: "medium",
    incidentId: "INC-001",
  },
  {
    id: "evt-008",
    timestamp: makeTs(9, 33, 18),
    service: "payment-api",
    source: "Datadog",
    type: "metric",
    message: "P95 latency reached 640ms",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-009",
    timestamp: makeTs(9, 33, 40),
    service: "payment-api",
    source: "Application Logs",
    type: "log",
    message: "Connection acquire timeout warnings increasing",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-010",
    timestamp: makeTs(9, 34, 2),
    service: "payment-api",
    source: "Application Logs",
    type: "error",
    message: "HTTP 500 rate 0.8% → 18%",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-011",
    timestamp: makeTs(9, 34, 15),
    service: "payment-api",
    source: "Application Logs",
    type: "error",
    message: "HTTP 500 rate reached 35%",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-012",
    timestamp: makeTs(9, 34, 30),
    service: "payment-api",
    source: "Datadog",
    type: "alert",
    message: "Error rate SLO burn alert",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-013",
    timestamp: makeTs(9, 34, 50),
    service: "checkout-api",
    source: "Application Logs",
    type: "error",
    message: "Downstream payment failures propagating",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-014",
    timestamp: makeTs(9, 35, 5),
    service: "checkout-api",
    source: "Payments",
    type: "metric",
    message: "Payment success rate dropped 42%",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-015",
    timestamp: makeTs(9, 35, 20),
    service: "checkout-api",
    source: "PagerDuty",
    type: "alert",
    message: "Critical: Payment processing failures",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-016",
    timestamp: makeTs(9, 35, 35),
    service: "payment-api",
    source: "AWS",
    type: "resource",
    message: "ECS task CPU elevated to 78%",
    severity: "medium",
    incidentId: "INC-001",
  },
  {
    id: "evt-017",
    timestamp: makeTs(9, 36, 0),
    service: "postgres-primary",
    source: "PostgreSQL",
    type: "metric",
    message: "Active queries waiting on locks increased",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-018",
    timestamp: makeTs(9, 36, 15),
    service: "payment-api",
    source: "Application Logs",
    type: "error",
    message: "Pool exhausted: could not acquire connection",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-019",
    timestamp: makeTs(9, 36, 40),
    service: "api-gateway",
    source: "Datadog",
    type: "metric",
    message: "Upstream 5xx from payment-api rising",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-020",
    timestamp: makeTs(9, 37, 0),
    service: "payment-api",
    source: "Kubernetes",
    type: "health",
    message: "Liveness probe failures on 1 pod",
    severity: "high",
    incidentId: "INC-001",
  },
  {
    id: "evt-021",
    timestamp: makeTs(9, 37, 25),
    service: "checkout-api",
    source: "Application Logs",
    type: "error",
    message: "Checkout timeout rate +31%",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-022",
    timestamp: makeTs(9, 37, 50),
    service: "payment-api",
    source: "Datadog",
    type: "alert",
    message: "Apdex score dropped below 0.6",
    severity: "critical",
    incidentId: "INC-001",
  },
  {
    id: "evt-023",
    timestamp: makeTs(9, 38, 10),
    service: "postgres-primary",
    source: "AWS",
    type: "resource",
    message: "RDS CPU utilization 81%",
    severity: "high",
    incidentId: "INC-001",
  },
];

// Generate additional realistic events
function generateNoise(count: number, startId: number): Event[] {
  const msgs = [
    "Health check passed",
    "Metric scrape completed",
    "Config reload successful",
    "Certificate rotation scheduled",
    "Autoscaling evaluation",
    "Backup job started",
    "Cache hit ratio normal",
    "Queue depth within limits",
    "DNS resolution latency normal",
    "TLS handshake rate steady",
    "Pod scheduled successfully",
    "Image pull completed",
    "HPA scaling decision: no change",
    "Log rotation completed",
    "Metrics exporter healthy",
    "Connection pool idle connections reclaimed",
    "GC pause duration within SLO",
    "Request rate within expected range",
    "Error budget remaining 94%",
    "Synthetic check passed",
  ];

  const result: Event[] = [];
  for (let i = 0; i < count; i++) {
    const idNum = startId + i;
    const hour = 6 + Math.floor(Math.random() * 4);
    const min = Math.floor(Math.random() * 60);
    const sec = Math.floor(Math.random() * 60);
    const sevRoll = Math.random();
    let severity: Severity = "info";
    if (sevRoll > 0.92) severity = "high";
    else if (sevRoll > 0.8) severity = "medium";
    else if (sevRoll > 0.6) severity = "low";

    result.push({
      id: `evt-${String(idNum).padStart(3, "0")}`,
      timestamp: makeTs(hour, min, sec),
      service: services[Math.floor(Math.random() * services.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      type: types[Math.floor(Math.random() * types.length)],
      message: msgs[Math.floor(Math.random() * msgs.length)],
      severity,
    });
  }
  return result;
}

// Auth related
const authEvents: Event[] = [
  {
    id: "evt-030",
    timestamp: makeTs(9, 18, 0),
    service: "auth-api",
    source: "Datadog",
    type: "metric",
    message: "Auth error rate 1.2% → 8%",
    severity: "high",
    incidentId: "INC-002",
  },
  {
    id: "evt-031",
    timestamp: makeTs(9, 19, 10),
    service: "auth-api",
    source: "Application Logs",
    type: "error",
    message: "Token validation latency 45ms → 210ms",
    severity: "high",
    incidentId: "INC-002",
  },
  {
    id: "evt-032",
    timestamp: makeTs(9, 20, 0),
    service: "redis",
    source: "Redis",
    type: "metric",
    message: "Command latency elevated for GET",
    severity: "medium",
    incidentId: "INC-002",
  },
];

const moreEvents = generateNoise(161, 50);

export const events: Event[] = [
  ...criticalEvents,
  ...authEvents,
  ...moreEvents,
].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

// Ensure we have ~187
export const eventCount = events.length;
