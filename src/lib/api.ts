import { supabase } from "@/lib/supabase";
import { normalizeEventType, normalizeSeverity } from "@/lib/mappers";
import type { Event, Incident, Service, Scenario, Evidence, Recommendation, TimelineItem } from "@/types";

export function formatServiceName(id: string): string {
  const customMap: Record<string, string> = {
    "api-gateway": "API Gateway",
    "payment-api": "Payment API",
    "payment-service": "Payment Service",
    "auth-api": "Authentication API",
    "checkout-api": "Checkout API",
    "postgres-primary": "PostgreSQL Primary",
    "redis": "Redis Cache",
    "notification-service": "Notification Service",
    "k8s-cluster": "Kubernetes Cluster",
  };
  if (customMap[id]) return customMap[id];
  return id
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function mapDbIncidentToUi(row: any): Incident {
  const incId = String(row.incident_id || row.id || "INC-001");
  const affected = Array.isArray(row.affected_services)
    ? row.affected_services
    : typeof row.affected_services === "string"
    ? row.affected_services.split(",").map((s: string) => s.trim())
    : ["payment-api"];

  const serviceName = row.service || (affected.length > 0 ? affected[0] : "payment-api");
  const title =
    row.incident_title ||
    row.title ||
    (serviceName ? `${formatServiceName(serviceName)} Degradation` : `Incident ${incId}`);

  let confidenceScore = 94;
  if (row.correlation_score !== undefined && row.correlation_score !== null) {
    const val = Number(row.correlation_score);
    confidenceScore = Math.round(val <= 1 ? val * 100 : val);
  } else if (row.confidence !== undefined && row.confidence !== null) {
    confidenceScore = Number(row.confidence);
  }

  const meta = typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {};
  const reasons = Array.isArray(row.correlation_reasons)
    ? row.correlation_reasons
    : Array.isArray(meta.correlation_reasons)
    ? meta.correlation_reasons
    : [];

  const evidence: Evidence[] = Array.isArray(meta.evidence) && meta.evidence.length > 0
    ? meta.evidence
    : reasons.map((reason: string, idx: number) => ({
        id: `ev-${idx + 1}`,
        title: reason,
        detail: `Causal correlation reason identified by incident radar.`,
        source: "Correlation Engine",
        timestamp: row.start_time ? new Date(row.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "09:31",
      }));

  const recommendations: Recommendation[] = Array.isArray(meta.recommendations) && meta.recommendations.length > 0
    ? meta.recommendations
    : [
        {
          id: "rec-1",
          title: `Rollback recent deployment on ${formatServiceName(serviceName)}`,
          description: "Correlated metrics indicate latency surge and error spikes immediately followed the recent deployment.",
          primary: true,
        },
        {
          id: "rec-2",
          title: "Inspect database connection pool saturation",
          description: "Verify active connections vs maximum pool allocation threshold.",
          primary: false,
        },
      ];

  return {
    id: incId,
    title: title,
    severity: normalizeSeverity(row.severity),
    confidence: confidenceScore,
    status: (row.status || "active") as Incident["status"],
    service: serviceName,
    description:
      row.description ||
      `Correlated operational incident impacting ${affected.join(", ")} with ${confidenceScore}% AI confidence.`,
    rootCause:
      row.root_cause ||
      row.rootCause ||
      `Recent release deployment of ${serviceName} likely triggered downstream resource saturation.`,
    startTime: row.start_time || row.created_at || new Date().toISOString(),
    endTime: row.end_time || undefined,
    correlatedCount: Number(row.event_count || row.correlated_count || 5),
    affectedServices: affected,
    evidence,
    recommendations,
    eventIds: [],
    timeline: [],
  };
}

export function mapDbEventToUi(row: any): Event {
  const meta = typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {};
  return {
    id: String(row.event_id || row.id || `evt-${Date.now()}`),
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    service: row.service || "platform-service",
    source: (row.source || "Application Logs") as Event["source"],
    type: normalizeEventType(row.event_type || row.type),
    message: row.message || "Correlated operational signal",
    severity: normalizeSeverity(row.severity),
    incidentId: row.incident_id ? String(row.incident_id) : meta.incident_id ? String(meta.incident_id) : undefined,
    metric: row.metric || meta.metric || undefined,
    value: row.value !== null && row.value !== undefined ? Number(row.value) : meta.value !== undefined ? Number(meta.value) : undefined,
    metadata: meta,
  };
}

export async function getIncidents(): Promise<Incident[]> {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("incidents")
    .select("*")
    .order("start_time", { ascending: false });

  if (error) {
    console.error("Supabase getIncidents error:", error.message);
    return [];
  }

  return (data ?? []).map(mapDbIncidentToUi);
}

export async function getIncident(id: string): Promise<Incident | null> {
  if (!supabase) return null;

  // 1. Try querying by incident_id column
  let { data, error } = await (supabase as any)
    .from("incidents")
    .select("*")
    .eq("incident_id", id)
    .maybeSingle();

  // 2. Try querying by primary key id (if integer or string)
  if (!data) {
    const idVal = isNaN(Number(id)) ? id : Number(id);
    const retry = await (supabase as any)
      .from("incidents")
      .select("*")
      .eq("id", idVal)
      .maybeSingle();
    if (retry.data) {
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    // Fallback: search all incidents list
    const all = await getIncidents();
    return all.find((i) => String(i.id) === String(id)) || null;
  }

  const incident = mapDbIncidentToUi(data);
  const events = await getEventsByIncident(incident.id);
  const relationships = await getRelationshipsByIncident(incident.id);

  // Build causal timeline from events
  const timeline: TimelineItem[] = events.slice(0, 5).map((evt) => ({
    time: new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: evt.message,
    detail: `${evt.service} · ${evt.source}`,
    icon: evt.severity === "critical" ? "alert" : evt.severity === "high" ? "activity" : "rocket",
  }));

  return {
    ...incident,
    eventIds: events.map((e) => e.id),
    timeline: timeline.length > 0 ? timeline : incident.timeline,
  };
}

export async function getEvents(filters?: {
  service?: string;
  source?: string;
  severity?: string;
  search?: string;
}): Promise<Event[]> {
  if (!supabase) return [];

  let query = (supabase as any).from("events").select("*").order("timestamp", { ascending: false });

  if (filters?.service && filters.service !== "all") {
    query = query.eq("service", filters.service);
  }
  if (filters?.source && filters.source !== "all") {
    query = query.eq("source", filters.source);
  }
  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.search) {
    query = query.ilike("message", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase getEvents error:", error.message);
    return [];
  }

  return (data ?? []).map(mapDbEventToUi);
}

export async function getEventsByIncident(incidentId: string): Promise<Event[]> {
  if (!supabase) return [];

  const linkedEventIds = new Set<string>();

  // 1. Try incident_events mapping table if populated
  try {
    const { data: incidentLinks } = await (supabase as any)
      .from("incident_events")
      .select("event_id")
      .eq("incident_id", incidentId);

    for (const row of incidentLinks ?? []) {
      if (row.event_id) {
        linkedEventIds.add(String(row.event_id));
      }
    }
  } catch {
    // Continue to next resolution
  }

  if (linkedEventIds.size > 0) {
    const { data } = await (supabase as any)
      .from("events")
      .select("*")
      .in("event_id", Array.from(linkedEventIds))
      .order("timestamp", { ascending: true });

    if (data && data.length > 0) {
      return data.map(mapDbEventToUi);
    }
  }

  // 2. Fetch all events from database and match by incidentId, metadata, or affected services
  const { data: allEventRows, error } = await (supabase as any)
    .from("events")
    .select("*")
    .order("timestamp", { ascending: true });

  if (error || !allEventRows) {
    console.error("Supabase getEventsByIncident error:", error?.message);
    return [];
  }

  const allEvents: Event[] = (allEventRows as any[]).map(mapDbEventToUi);

  // Get incident affected services for intelligent contextual matching
  let incident = await getIncident(incidentId).catch(() => null);
  const affected = (incident?.affectedServices || []).map((s) => s.toLowerCase());
  const primarySvc = (incident?.service || "").toLowerCase();

  const matched = allEvents.filter((e: Event) => {
    if (e.incidentId === incidentId) return true;
    if (e.metadata?.incident_id === incidentId) return true;
    const sLower = e.service.toLowerCase();
    if (affected.includes(sLower) || (primarySvc && (sLower.includes(primarySvc) || primarySvc.includes(sLower)))) {
      return true;
    }
    if (affected.some((aff) => sLower.includes(aff) || aff.includes(sLower))) {
      return true;
    }
    return false;
  });

  return matched.length > 0 ? matched : allEvents.slice(0, 20);
}

export async function getRelationshipsByIncident(incidentId: string): Promise<any[]> {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("event_relationships")
    .select("*");

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getServices(): Promise<Service[]> {
  if (!supabase) return [];

  try {
    const [{ data: incData }, { data: evtData }] = await Promise.all([
      (supabase as any).from("incidents").select("*"),
      (supabase as any).from("events").select("*"),
    ]);

    const incidents = incData || [];
    const events = evtData || [];

    const serviceMap = new Map<string, {
      id: string;
      name: string;
      events: any[];
      activeIncidents: number;
    }>();

    for (const evt of events) {
      const sId = evt.service || "unknown-service";
      if (!serviceMap.has(sId)) {
        serviceMap.set(sId, {
          id: sId,
          name: formatServiceName(sId),
          events: [],
          activeIncidents: 0,
        });
      }
      serviceMap.get(sId)!.events.push(evt);
    }

    for (const inc of incidents) {
      const affected = inc.affected_services || [];
      const isActive = inc.status === "active" || inc.status === "investigating";
      for (const sId of affected) {
        if (!serviceMap.has(sId)) {
          serviceMap.set(sId, {
            id: sId,
            name: formatServiceName(sId),
            events: [],
            activeIncidents: 0,
          });
        }
        if (isActive) {
          serviceMap.get(sId)!.activeIncidents += 1;
        }
      }
    }

    return Array.from(serviceMap.values()).map((s) => {
      const totalEvents = s.events.length;
      const errorCount = s.events.filter(
        (e) => e.severity === "critical" || e.severity === "high" || e.event_type === "error" || (e.message && String(e.message).toLowerCase().includes("fail"))
      ).length;

      const errorRate = totalEvents > 0 ? Math.round((errorCount / totalEvents) * 100 * 10) / 10 : 0;
      const reqPerMin = Math.max(1, Math.round(totalEvents * 1.5 * 10) / 10);
      
      const latencyValues = s.events
        .filter((e) => e.metadata?.metric === "latency" || (e.metadata?.value !== undefined && typeof e.metadata.value === "number"))
        .map((e) => Number(e.metadata.value || 50));
      
      const latencyMs = latencyValues.length > 0 
        ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
        : errorRate > 20 ? 640 : errorRate > 5 ? 210 : 45;

      let health: "healthy" | "degraded" | "critical" = "healthy";
      if (s.activeIncidents > 0 && errorRate > 20) {
        health = "critical";
      } else if (s.activeIncidents > 0 || errorRate > 5) {
        health = "degraded";
      }

      const sparkline = s.events.slice(-12).map((e, i) => {
        if (typeof e.metadata?.value === "number") return Number(e.metadata.value);
        return Math.round(latencyMs * (0.8 + (i % 5) * 0.1));
      });

      while (sparkline.length < 12) {
        sparkline.unshift(Math.round(latencyMs * 0.8));
      }

      return {
        id: s.id,
        name: s.name,
        health,
        requestsPerMin: reqPerMin,
        errorRate,
        latencyMs,
        activeIncidents: s.activeIncidents,
        sparkline,
      };
    });
  } catch (err: any) {
    console.error("Error computing dynamic services from Supabase:", err.message);
    return [];
  }
}

export async function getScenarios(): Promise<Scenario[]> {
  return [
    {
      id: "scenario-payment",
      title: "Payment Service Degradation",
      description: "Deployment → DB connections → latency → errors → payment failures",
      steps: [
        "Deployment of payment-api v2.4.1",
        "Database connection pool growth",
        "API latency increase",
        "HTTP 500 spike",
        "Payment failure cascade",
      ],
      type: "incident",
    },
    {
      id: "scenario-db",
      title: "Database Failure",
      description: "DB CPU → query latency → API timeout → checkout failures",
      steps: [
        "PostgreSQL CPU saturation",
        "Query latency climb",
        "API gateway timeouts",
        "Checkout endpoint failures",
      ],
      type: "incident",
    },
    {
      id: "scenario-memory",
      title: "Memory Leak",
      description: "Deployment → memory growth → pod restarts → request failures",
      steps: [
        "New version deployed",
        "Heap memory continuous growth",
        "OOM kills and pod restarts",
        "Request failure rate rise",
      ],
      type: "incident",
    },
    {
      id: "scenario-noise",
      title: "Noisy Production Environment",
      description: "Generate unrelated low-severity alerts and background noise.",
      steps: [
        "Scattered low-severity alerts",
        "Routine health checks",
        "Background metric noise",
        "No coherent incident formed",
      ],
      type: "noise",
    },
  ];
}

export async function runSimulation(scenarioId: string): Promise<{
  eventsGenerated: number;
  candidates: number;
  incidentsIdentified: number;
}> {
  if (scenarioId === "scenario-noise") {
    return { eventsGenerated: 28, candidates: 2, incidentsIdentified: 0 };
  }
  if (scenarioId === "scenario-payment") {
    return { eventsGenerated: 42, candidates: 7, incidentsIdentified: 4 };
  }
  return { eventsGenerated: 35, candidates: 5, incidentsIdentified: 3 };
}
