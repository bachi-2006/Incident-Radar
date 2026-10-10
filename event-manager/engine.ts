import type {
  GeneratorOptions,
  IncidentScenario,
  OperationalEvent,
  TenantId,
  EventTransport,
  StreamOptions,
} from "./types";
import { generateNoiseStream } from "./noise";

export function generateTimeline(
  scenario?: IncidentScenario,
  options: GeneratorOptions = {}
): OperationalEvent[] {
  const tenantId: TenantId = options.tenantId ?? "acme-prod";
  const startTime = options.startTime ?? new Date();
  const noiseCount = options.noiseCount ?? 20;

  const scenarioEvents: OperationalEvent[] = [];
  let durationMinutes = options.noiseTimeWindowMinutes ?? 15;

  if (scenario) {
    const scenarioDurationMin = Math.ceil(scenario.durationSeconds / 60) + 2;
    if (scenarioDurationMin > durationMinutes) {
      durationMinutes = scenarioDurationMin;
    }

    scenario.steps.forEach((step, index) => {
      const eventTime = new Date(startTime.getTime() + step.offsetSeconds * 1000);
      scenarioEvents.push({
        eventId: `evt_${tenantId}_sc_${String(index + 1).padStart(3, "0")}`,
        tenantId,
        timestamp: eventTime.toISOString(),
        service: step.service,
        source: step.source,
        eventType: step.eventType,
        severity: step.severity,
        message: step.message,
        metadata: { ...(step.metadata || {}) },
      });
    });
  }

  const noiseEvents =
    noiseCount > 0
      ? generateNoiseStream(
          tenantId,
          noiseCount,
          startTime,
          durationMinutes,
          100
        )
      : [];

  const allEvents = [...scenarioEvents, ...noiseEvents];

  // Strictly sort by timestamp ascending
  allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return allEvents;
}

export async function emitTimeline(
  events: OperationalEvent[],
  transport: EventTransport,
  options: StreamOptions = {}
): Promise<void> {
  const delayMs = options.emissionRateMs ?? 0;

  if (delayMs <= 0 || options.instant) {
    await transport.sendBatch(events);
    if (transport.close) {
      await transport.close();
    }
    return;
  }

  for (let i = 0; i < events.length; i++) {
    await transport.send(events[i]);
    if (i < events.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (transport.close) {
    await transport.close();
  }
}

