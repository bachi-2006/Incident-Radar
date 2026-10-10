export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type IncidentStatus = "active" | "investigating" | "resolved" | "mitigated";

export type EventSource =
  | "GitHub"
  | "Datadog"
  | "AWS"
  | "PostgreSQL"
  | "Application Logs"
  | "Kubernetes"
  | "Payments"
  | "Redis"
  | "PagerDuty"
  | "Correlation Agent";

export type EventType =
  | "deployment"
  | "metric"
  | "log"
  | "alert"
  | "error"
  | "health"
  | "resource"
  | "business_failure";

export interface Event {
  id: string;
  timestamp: string;
  service: string;
  source: EventSource;
  type: EventType;
  message: string;
  severity: Severity;
  incidentId?: string;
  metric?: string;
  value?: number | string | null;
  metadata?: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  title: string;
  detail: string;
  source: string;
  timestamp: string;
  icon?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  primary?: boolean;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  confidence: number;
  status: IncidentStatus;
  service: string;
  description: string;
  rootCause: string;
  startTime: string;
  endTime?: string;
  correlatedCount: number;
  affectedServices: string[];
  evidence: Evidence[];
  recommendations: Recommendation[];
  eventIds: string[];
  timeline: TimelineItem[];
}

export interface TimelineItem {
  time: string;
  title: string;
  detail: string;
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  health: "healthy" | "degraded" | "critical" | "unknown";
  requestsPerMin: number;
  errorRate: number;
  latencyMs: number;
  activeIncidents: number;
  sparkline: number[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  steps: string[];
  type: "incident" | "noise";
}

export interface KPI {
  label: string;
  value: string | number;
  subtext?: string;
}

export interface SimulationState {
  running: boolean;
  stage: number;
  message: string;
  eventsGenerated: number;
  candidates: number;
  incidents: number;
}
