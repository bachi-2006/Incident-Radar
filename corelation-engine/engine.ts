import { buildCorrelations, clusterIncidentCandidates } from './cluster';
import { defaultCorrelationConfig } from './scoring';
import type { CorrelationEngineConfig, EventSignal, IncidentCandidate, ServiceNode } from './types';

export interface CorrelationRunResult {
  correlations: ReturnType<typeof buildCorrelations>;
  candidates: IncidentCandidate[];
  summary: {
    eventCount: number;
    candidateCount: number;
    correlatedEventCount: number;
    threshold: number;
  };
}

export function runCorrelationEngine(
  events: EventSignal[],
  services: ServiceNode[],
  config: CorrelationEngineConfig = defaultCorrelationConfig,
): CorrelationRunResult {
  const correlations = buildCorrelations(events, services, config.threshold);
  const candidates = clusterIncidentCandidates(events, services, config.threshold);

  return {
    correlations,
    candidates,
    summary: {
      eventCount: events.length,
      candidateCount: candidates.length,
      correlatedEventCount: new Set(correlations.flatMap((item) => [item.eventAId, item.eventBId])).size,
      threshold: config.threshold,
    },
  };
}

export { defaultCorrelationConfig };
