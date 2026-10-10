import { supabase } from "./supabase";
import type { Event, Incident } from "@/types";
import {
  mapAgentOutputToIncident,
  normalizeEventType,
  normalizeSeverity,
  type AgentIncidentPayload,
} from "./mappers";

export interface IncidentBundle {
  incident: Incident;
  events: any[];
  relationships: any[];
}

export function buildIncidentBundle(payload: AgentIncidentPayload): IncidentBundle {
  const incident = mapAgentOutputToIncident(payload);
  const incId = payload.incident_id || (payload as any).id || incident.id;

  const events = (payload.events ?? []).map((event: any, index: number) => ({
    event_id: event.event_id || event.id || `${incId}-evt-${index + 1}`,
    tenant_id: "default-tenant",
    service: event.service || payload.service || incident.service || "unknown-service",
    source: event.source || "Application Logs",
    event_type: normalizeEventType(event.event_type || event.eventType),
    message: event.message || "Correlated operational signal",
    severity: normalizeSeverity(event.severity as string),
    timestamp: event.timestamp || payload.time_window?.start || incident.startTime,
    metadata: {
      raw_type: event.event_type || event.eventType,
      raw_severity: event.severity,
      incident_id: incId,
      ...(event.metric ? { metric: event.metric } : {}),
      ...(event.value !== undefined && event.value !== null ? { value: event.value } : {}),
      ...(event.metadata || {}),
    },
  }));

  const relationships = (payload.relationships ?? []).map((rel: any, index: number) => ({
    from_event_id: rel.from || rel.from_event || `${incId}-evt-${index + 1}-from`,
    to_event_id: rel.to || rel.to_event || `${incId}-evt-${index + 1}-to`,
    relationship: rel.type || rel.relationship || "PRECEDES",
    confidence: rel.confidence !== undefined ? rel.confidence : 0.94,
  }));

  return { incident, events, relationships };
}

export async function upsertIncidentBundle(payload: AgentIncidentPayload): Promise<Incident> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const bundle = buildIncidentBundle(payload);

  // 1. Upsert Parent Incident
  const { error: incError } = await (supabase as any).from("incidents").upsert(
    {
      incident_id: bundle.incident.id,
      incident_title: bundle.incident.title,
      severity: bundle.incident.severity,
      correlation_score: (bundle.incident.confidence || 90) / 100,
      status: bundle.incident.status,
      affected_services: bundle.incident.affectedServices,
      event_count: bundle.incident.correlatedCount,
      correlation_reasons: (bundle.incident.evidence || []).map((e) => e.title),
      start_time: bundle.incident.startTime,
      end_time: bundle.incident.endTime ?? null,
    },
    { onConflict: "incident_id" }
  );

  if (incError) {
    console.error("Failed to upsert incident into Supabase:", incError.message);
  }

  // 2. Upsert Associated Events
  if (bundle.events.length > 0) {
    const { error: eventsError } = await (supabase as any).from("events").upsert(bundle.events, {
      onConflict: "event_id",
    });
    if (eventsError) {
      console.error("Failed to upsert events into Supabase:", eventsError.message);
    }
  }

  // 3. Upsert Causal Relationships
  if (bundle.relationships.length > 0) {
    const { error: relError } = await (supabase as any).from("event_relationships").upsert(bundle.relationships);
    if (relError) {
      console.warn("Notice on relationships upsert:", relError.message);
    }
  }

  return bundle.incident;
}

export async function getIncidentBundleById(incidentId: string): Promise<IncidentBundle | null> {
  if (!supabase) return null;

  const { data: incData, error: incError } = await (supabase as any)
    .from("incidents")
    .select("*")
    .eq("incident_id", incidentId)
    .maybeSingle();

  if (incError || !incData) return null;

  const { data: eventsData } = await (supabase as any)
    .from("events")
    .select("*")
    .order("timestamp", { ascending: true });

  const { data: relsData } = await (supabase as any)
    .from("event_relationships")
    .select("*");

  const mappedIncident: Incident = {
    id: incData.incident_id || String(incData.id),
    title: incData.incident_title || incData.title,
    severity: incData.severity,
    confidence: Math.round((incData.correlation_score || 0.94) * 100),
    status: incData.status,
    service: incData.affected_services?.[0] || "payment-service",
    description: `Correlated operational incident impacting ${(incData.affected_services || []).join(", ")}.`,
    rootCause: `Correlated by Incident Radar engine.`,
    startTime: incData.start_time,
    endTime: incData.end_time || undefined,
    correlatedCount: incData.event_count || 5,
    affectedServices: incData.affected_services || [],
    evidence: (incData.correlation_reasons || []).map((r: string, i: number) => ({
      id: `ev-${i + 1}`,
      title: r,
      detail: "Causal correlation reason identified by incident radar.",
      source: "Correlation Engine",
      timestamp: "09:31",
    })),
    recommendations: [],
    eventIds: (eventsData ?? []).map((e: any) => e.event_id || String(e.id)),
    timeline: [],
  };

  return {
    incident: mappedIncident,
    events: eventsData || [],
    relationships: relsData || [],
  };
}

export { supabase };
