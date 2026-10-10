import { generateTimeline } from "../../event-manager/engine";
import { getScenario } from "../../event-manager/scenarios/index";
import type { IncidentScenario, OperationalEvent, TenantId } from "../../event-manager/types";
import { supabase } from "@/lib/supabase";
import { upsertIncidentBundle } from "@/lib/ingest";
import type { Scenario } from "@/types";

export interface SimulationRunResult {
  eventsGenerated: number;
  candidates: number;
  incidentsIdentified: number;
}

const scenarioMap: Record<string, { engineId?: string; type: "incident" | "noise"; title: string; description: string; steps: string[] }> = {
  "scenario-payment": {
    engineId: "payment-degradation",
    type: "incident",
    title: "Payment Service Degradation",
    description: "Deployment -> DB connections -> latency -> errors -> payment failures",
    steps: [
      "Deployment of payment-service v42",
      "Database connection pool growth",
      "API latency increase",
      "HTTP 500 spike",
      "Payment failure cascade",
    ],
  },
  "scenario-db": {
    engineId: "database-failure",
    type: "incident",
    title: "Database Failure",
    description: "DB CPU -> query latency -> API timeout -> checkout failures",
    steps: [
      "PostgreSQL CPU saturation",
      "Query latency climb",
      "API gateway timeouts",
      "Checkout endpoint failures",
      "Business impact detected",
    ],
  },
  "scenario-memory": {
    engineId: "memory-leak",
    type: "incident",
    title: "Memory Leak",
    description: "Deployment -> heap growth -> restarts -> request failures",
    steps: [
      "New version deployed",
      "Heap memory continuous growth",
      "OOM kills and pod restarts",
      "Timeout rate rises",
    ],
  },
  "scenario-noise": {
    type: "noise",
    title: "Noisy Production Environment",
    description: "Generate unrelated low-severity alerts and background noise.",
    steps: [
      "Scattered low-severity alerts",
      "Routine health checks",
      "Background metric noise",
      "No coherent incident formed",
    ],
  },
};

export function getSimulationScenarios(): Scenario[] {
  return Object.entries(scenarioMap).map(([id, scenario]) => ({
    id,
    title: scenario.title,
    description: scenario.description,
    steps: scenario.steps,
    type: scenario.type,
  }));
}

function withRunIds(events: OperationalEvent[], runId: string): OperationalEvent[] {
  return events.map((event, index) => ({
    ...event,
    eventId: `${event.eventId}_${runId}_${index + 1}`,
  }));
}

function buildRelationships(events: OperationalEvent[]) {
  return events.slice(0, -1).map((event, index) => ({
    from: event.eventId,
    to: events[index + 1].eventId,
    type: "PRECEDES",
    confidence: 0.94,
  }));
}

function buildIncidentPayload(
  uiScenarioId: string,
  engineScenario: IncidentScenario,
  events: OperationalEvent[],
  runId: string
) {
  const incidentId = `INC-SIM-${runId}`;
  const primaryService = events[0]?.service || "platform-service";
  const affectedServices = Array.from(new Set(events.map((event) => event.service)));

  return {
    incident_id: incidentId,
    incident_title: engineScenario.name,
    title: engineScenario.name,
    service: primaryService,
    severity: events.some((event) => event.severity === "critical")
      ? "critical"
      : events.some((event) => event.severity === "high")
      ? "high"
      : "medium",
    status: "active",
    time_window: {
      start: events[0]?.timestamp || new Date().toISOString(),
      end: events[events.length - 1]?.timestamp || new Date().toISOString(),
    },
    affected_services: affectedServices,
    event_count: events.length,
    correlation_score: uiScenarioId === "scenario-payment" ? 0.94 : 0.82,
    correlation_reasons: [
      `Scenario ${engineScenario.id} generated temporally ordered operational signals.`,
      "Severity progression indicates a coherent causal chain.",
      "Service overlap matches the simulated blast radius.",
    ],
    rootCause:
      uiScenarioId === "scenario-payment"
        ? "Recent payment-service deployment increased database pool pressure, which cascaded into latency and transaction failures."
        : uiScenarioId === "scenario-db"
        ? "Primary database saturation propagated into timeout-heavy downstream services."
        : "Post-deployment memory growth triggered restarts and downstream timeout amplification.",
    events: events.map((event) => ({
      event_id: event.eventId,
      service: event.service,
      source: event.source,
      event_type: event.eventType,
      severity: event.severity,
      message: event.message,
      timestamp: event.timestamp,
      metric: typeof event.metadata.metric === "string" ? event.metadata.metric : undefined,
      value: typeof event.metadata.value === "number" ? event.metadata.value : undefined,
      metadata: {
        ...event.metadata,
        incident_id: incidentId,
        tenant_id: event.tenantId,
      },
    })),
    relationships: buildRelationships(events),
  };
}

async function persistNoiseEvents(events: OperationalEvent[]) {
  if (!supabase || events.length === 0) return;

  const rows = events.map((event) => ({
    event_id: event.eventId,
    tenant_id: event.tenantId,
    timestamp: event.timestamp,
    service: event.service,
    source: event.source,
    event_type: event.eventType,
    severity: event.severity,
    message: event.message,
    metadata: event.metadata,
  }));

  const { error } = await (supabase as any).from("events").upsert(rows, {
    onConflict: "event_id",
  });

  if (error) {
    throw new Error(`Failed to persist simulation noise events: ${error.message}`);
  }
}

export async function runSimulationScenario(
  scenarioId: string,
  options: { tenantId?: TenantId; noiseCount?: number } = {}
): Promise<SimulationRunResult> {
  const scenarioConfig = scenarioMap[scenarioId];
  if (!scenarioConfig) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }

  const runId = `${Date.now()}`;
  const tenantId = options.tenantId || "acme-prod";
  const startTime = new Date();

  if (scenarioConfig.type === "noise") {
    const noiseOnlyEvents = withRunIds(
      generateTimeline(undefined, {
        tenantId,
        startTime,
        noiseCount: options.noiseCount ?? 30,
        noiseTimeWindowMinutes: 20,
      }),
      runId
    );

    await persistNoiseEvents(noiseOnlyEvents);

    return {
      eventsGenerated: noiseOnlyEvents.length,
      candidates: Math.max(1, Math.round(noiseOnlyEvents.length / 12)),
      incidentsIdentified: 0,
    };
  }

  const engineScenario = getScenario(scenarioConfig.engineId!);
  if (!engineScenario) {
    throw new Error(`Missing engine scenario: ${scenarioConfig.engineId}`);
  }

  const timeline = withRunIds(
    generateTimeline(engineScenario, {
      tenantId,
      startTime,
      noiseCount: options.noiseCount ?? 18,
      noiseTimeWindowMinutes: Math.ceil(engineScenario.durationSeconds / 60) + 5,
    }),
    runId
  );

  const scenarioEvents = timeline.filter((event) =>
    engineScenario.steps.some((step) => step.message === event.message && step.service === event.service)
  );

  const payload = buildIncidentPayload(scenarioId, engineScenario, scenarioEvents, runId);
  await upsertIncidentBundle(payload as any);

  const noiseEvents = timeline.filter(
    (event) => !scenarioEvents.some((scenarioEvent) => scenarioEvent.eventId === event.eventId)
  );
  await persistNoiseEvents(
    noiseEvents.map((event) => ({
      ...event,
      metadata: {
        ...event.metadata,
        simulation_run_id: runId,
      },
    }))
  );

  return {
    eventsGenerated: timeline.length,
    candidates: Math.max(2, Math.round(timeline.length / 8)),
    incidentsIdentified: 1,
  };
}
