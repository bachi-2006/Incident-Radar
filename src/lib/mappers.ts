import type { Event, Evidence, Incident, Severity, TimelineItem, EventType, EventSource, Recommendation } from "@/types";

export type AgentRelationshipType = "PRECEDES" | "CAUSES" | "CORRELATES_WITH" | "BLOCKS" | string;

export type AgentSeverity = "CRITICAL" | "WARNING" | "INFO" | "ERROR" | "LOW" | "MEDIUM" | "HIGH" | Severity | string;

export interface AgentIncidentEvent {
  event_id?: string;
  id?: string;
  service?: string;
  event_type?: string;
  eventType?: string;
  severity?: AgentSeverity;
  source?: string;
  incidentId?: string;
  tenantId?: string;
  message?: string;
  metric?: string;
  value?: number | string | null;
  timestamp?: string;
  [key: string]: unknown;
}

export interface AgentIncidentRelationship {
  from?: string;
  to?: string;
  type?: AgentRelationshipType;
  from_event?: string;
  to_event?: string;
  relationship?: AgentRelationshipType;
}

export interface AgentIncidentPayload {
  incident_id: string;
  incident_title: string;
  time_window: { start?: string; end?: string };
  affected_services: string[];
  event_count?: number;
  correlation_score?: number;
  correlation_reasons?: string[];
  severity?: AgentSeverity;
  status?: string;
  service?: string;
  description?: string;
  rootCause?: string;
  recommendations?: Array<{ title?: string; description?: string; id?: string; primary?: boolean }>;
  events?: AgentIncidentEvent[];
  relationships?: AgentIncidentRelationship[];
}

const severityRank: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const severityMap: Record<string, Severity> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
  criticala: "critical",
  warning: "medium",
  warn: "medium",
  warning_high: "high",
  error: "high",
  severe: "high",
};

const eventTypeMap: Record<string, EventType> = {
  deployment: "deployment",
  deployment_completed: "deployment",
  "deployment.completed": "deployment",
  metric: "metric",
  metric_usage: "metric",
  "metric.usage": "metric",
  log: "log",
  alert: "alert",
  error: "error",
  health: "health",
  resource: "resource",
  business_failure: "business_failure",
  "business failure": "business_failure",
};

const evidenceLookup: Record<string, string> = {
  temporal_proximity: "The events cluster closely in time, indicating a likely shared incident window.",
  service_overlap: "The affected services overlap across the same incident sequence.",
  service_dependency: "The service dependency chain explains the propagation pattern across the incident.",
  dependency_chain: "The service dependencies and downstream effects line up with the observed blast radius.",
  semantic_similarity: "The event messages share a consistent failure pattern and alert context.",
  metric_relationship: "The metric deltas align with the observed service degradation and error growth.",
  causal_sequence: "The event chain shows an ordered progression from trigger to impact.",
  default: "The correlation engine flagged this event pattern as part of the incident.",
};

export function normalizeSeverity(value?: string): Severity {
  const normalized = `${value ?? "info"}`.trim().toLowerCase();
  if (severityMap[normalized]) return severityMap[normalized];

  if (normalized === "warning") return "medium";
  if (normalized === "err") return "high";
  if (normalized === "critical") return "critical";
  if (normalized === "info") return "info";
  if (normalized === "low") return "low";
  if (normalized === "medium") return "medium";
  if (normalized === "high") return "high";

  return "info";
}

export function normalizeEventType(value?: string): EventType {
  const token = `${value ?? "log"}`.trim().toLowerCase();
  const normalizedToken = token.replace(/[^a-z_]+/g, "_").replace(/^_|_$/g, "");
  const mapped = eventTypeMap[token] ?? eventTypeMap[normalizedToken] ?? "log";

  return mapped;
}

export function normalizeEventSource(value?: string): EventSource {
  const source = `${value ?? "Application Logs"}`.trim();
  const normalized = source.toLowerCase();

  if (["github", "github_actions", "deployment", "deployments", "git"].includes(normalized)) return "GitHub";
  if (["datadog", "metrics", "metric"].includes(normalized)) return "Datadog";
  if (["aws", "cloudwatch"].includes(normalized)) return "AWS";
  if (["postgresql", "postgres", "database", "db"].includes(normalized)) return "PostgreSQL";
  if (["application logs", "application_logs", "log", "logs", "app logs"].includes(normalized)) return "Application Logs";
  if (["kubernetes", "k8s", "kube"].includes(normalized)) return "Kubernetes";
  if (["payments", "payment"].includes(normalized)) return "Payments";
  if (["redis", "cache"].includes(normalized)) return "Redis";
  if (["pagerduty", "oncall"].includes(normalized)) return "PagerDuty";

  return "Application Logs";
}

function deriveIncidentSeverity(events: AgentIncidentEvent[]): Severity {
  const levels = events.map((event) => normalizeSeverity(event.severity as string)).filter(Boolean);
  if (levels.length === 0) return "medium";

  return levels.reduce((maxSeverity, current) =>
    severityRank[current] > severityRank[maxSeverity] ? current : maxSeverity,
  levels[0]);
}

function buildEvidenceFromReasons(reasons: string[] = []): Evidence[] {
  return reasons.map((reason, index) => {
    const key = reason.toLowerCase();
    const text = evidenceLookup[key] ?? evidenceLookup.default;

    return {
      id: `ev-${index + 1}`,
      title: reason.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      detail: text,
      source: "Correlation Agent",
      timestamp: new Date().toISOString(),
      icon: "sparkles",
    };
  });
}

function buildTimelineFromRelationships(
  events: AgentIncidentEvent[],
  relationships: AgentIncidentRelationship[] = []
): TimelineItem[] {
  const eventMap = new Map(events.map((event) => [event.event_id ?? event.id, event]));
  const edges = relationships
    .map((relationship) => ({
      from: relationship.from ?? relationship.from_event,
      to: relationship.to ?? relationship.to_event,
      type: relationship.type ?? relationship.relationship,
    }))
    .filter((relationship) => relationship.type === "PRECEDES" && relationship.from && relationship.to);

  const orderedIds: string[] = [];
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    orderedIds.push(id);

    const nextMoves = edges
      .filter((edge) => edge.from === id)
      .map((edge) => edge.to)
      .filter((nextId): nextId is string => Boolean(nextId));

    for (const nextId of nextMoves) {
      visit(nextId);
    }
  };

  const roots = edges
    .map((edge) => edge.from)
    .filter((fromId): fromId is string => Boolean(fromId))
    .filter((fromId) => !edges.some((edge) => edge.to === fromId));

  const rootIds = (roots.length ? roots : events.map((event) => event.event_id ?? event.id)).filter(
    (eventId): eventId is string => Boolean(eventId)
  );

  for (const rootId of rootIds) {
    visit(rootId);
  }

  const trailing = events
    .map((event) => event.event_id ?? event.id)
    .filter((eventId): eventId is string => Boolean(eventId))
    .filter((eventId) => !orderedIds.includes(eventId));

  const finalOrder = [...orderedIds, ...trailing];

  return finalOrder
    .map((eventId) => {
      const event = eventMap.get(eventId);
      if (!event) return null;

      const eventType = normalizeEventType(event.event_type ?? event.eventType);

      return {
        time: event.timestamp ?? new Date().toISOString(),
        title: event.message ?? "Event",
        detail: `${event.service ?? "unknown-service"} · ${eventType}`,
        icon:
          normalizeSeverity(event.severity as string) === "critical"
            ? "alert"
            : normalizeSeverity(event.severity as string) === "high"
              ? "activity"
              : "circle",
      };
    })
    .filter(Boolean) as TimelineItem[];
}

export function mapAgentOutputToIncident(payload: AgentIncidentPayload): Incident {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const relationshipGraph = Array.isArray(payload.relationships) ? payload.relationships : [];
  const incidentSeverity = deriveIncidentSeverity(events) || normalizeSeverity(payload.severity);

  const mappedEvents: Event[] = events.map((event) => ({
    id: event.event_id ?? event.id ?? `${payload.incident_id}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: event.timestamp ?? payload.time_window?.start ?? new Date().toISOString(),
    service: event.service ?? payload.service ?? "unknown-service",
    source: normalizeEventSource(event.source ?? (event.eventType?.includes("deployment") ? "deployment" : undefined)),
    type: normalizeEventType(event.event_type ?? event.eventType),
    message: event.message ?? "Correlated event",
    severity: normalizeSeverity(event.severity as string),
    incidentId: event.incidentId ?? payload.incident_id,
    metric: event.metric,
    value: event.value ?? undefined,
    metadata: {
      rawType: event.event_type ?? event.eventType,
      rawSeverity: event.severity,
      tenantId: event.tenantId,
      ...(event.metadata ? event.metadata : {}),
      ...(event.metric ? { metric: event.metric } : {}),
      ...(event.value !== undefined && event.value !== null ? { value: event.value } : {}),
    },
  }));

  const timeline = buildTimelineFromRelationships(events, relationshipGraph);
  const affectedServices = Array.from(
    new Set<string>([
      ...(payload.affected_services ?? []),
      ...events
        .map((event) => event.service)
        .filter((service): service is string => Boolean(service)),
    ])
  );

  return {
    id: payload.incident_id,
    title: payload.incident_title,
    severity: incidentSeverity,
    confidence: Math.min(100, Math.max(0, Math.round((payload.correlation_score ?? 0) * 100))),
    status: (payload.status ?? "active") as Incident["status"],
    service: payload.service ?? events[0]?.service ?? "unknown-service",
    description: payload.description ?? "This incident was synthesized from correlated events. Full narrative generation requires an additional LLM or analyst step.",
    rootCause: payload.rootCause ?? "Root cause analysis is not present in the raw agent bundle. A narrative explanation must be generated separately.",
    startTime: payload.time_window?.start ?? events[0]?.timestamp ?? new Date().toISOString(),
    endTime: payload.time_window?.end ?? undefined,
    correlatedCount: payload.event_count ?? mappedEvents.length,
    affectedServices,
    evidence: buildEvidenceFromReasons(payload.correlation_reasons ?? []),
    recommendations: (payload.recommendations ?? []).map((recommendation, index) => ({
      id: recommendation.id ?? `rec-${index + 1}`,
      title: recommendation.title ?? "Recommended action",
      description: recommendation.description,
      primary: recommendation.primary ?? index === 0,
    })),
    eventIds: mappedEvents.map((event) => event.id),
    timeline,
  };
}
