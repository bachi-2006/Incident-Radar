export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type IncidentStatus = "active" | "investigating" | "resolved" | "mitigated";
export type PolicyDecision = "ACT" | "ASK" | "NOTIFY";
export type ServiceHealth = "healthy" | "degraded" | "critical" | "unknown";

export interface Evidence {
  id: string;
  title: string;
  detail: string;
  source: string;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  primary?: boolean;
}

export interface TimelineItem {
  time: string;
  title: string;
  detail: string;
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
  correlatedCount: number;
  affectedServices: string[];
  evidence: Evidence[];
  recommendations: Recommendation[];
  timeline: TimelineItem[];
  policy: PolicyDecision;
  proposedAction: string;
}

export interface EventRow {
  id: string;
  timestamp: string;
  service: string;
  source: string;
  type: string;
  message: string;
  severity: Severity;
  incidentId?: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  health: ServiceHealth;
  requestsPerMin: number;
  errorRate: number;
  latencyMs: number;
  activeIncidents: number;
  sparkline: number[];
}
