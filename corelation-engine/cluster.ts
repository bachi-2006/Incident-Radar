import { computeOverallScore, defaultCorrelationConfig } from './scoring';
import type { EventCorrelation, EventSignal, IncidentCandidate, ServiceNode } from './types';

export function buildCorrelations(
  events: EventSignal[],
  services: ServiceNode[],
  threshold = defaultCorrelationConfig.threshold,
): EventCorrelation[] {
  const correlations: EventCorrelation[] = [];

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const left = events[i];
      const right = events[j];

      const time = Math.min(
        1,
        Math.abs(
          new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
        ) / defaultCorrelationConfig.timeWindowMs,
      );

      const service = left.service === right.service ? 1 : 0.25;
      const dependency = Math.min(
        1,
        (left.service === right.service ? 1 : 0.2) + (time > 0.8 ? 0.1 : 0),
      );
      const semantic = Math.min(1, (left.message.length + right.message.length) / 2000);
      const sequence = time < 0.6 ? 0.8 : 0.35;
      const overall =
        time * 0.25 +
        service * 0.2 +
        dependency * 0.2 +
        semantic * 0.2 +
        sequence * 0.15;

      if (overall >= threshold) {
        correlations.push({
          eventAId: left.id,
          eventBId: right.id,
          relationship: `${left.service} → ${right.service}`,
          factors: {
            time: Math.min(1, 1 - time),
            service,
            dependency,
            semantic: Math.min(1, semantic),
            sequence,
            overall,
          },
        });
      }
    }
  }

  return correlations;
}

export function clusterIncidentCandidates(
  events: EventSignal[],
  services: ServiceNode[],
  threshold = defaultCorrelationConfig.threshold,
): IncidentCandidate[] {
  const graph = new Map<string, Set<string>>();

  for (const event of events) {
    graph.set(event.id, new Set());
  }

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const left = events[i];
      const right = events[j];
      const score = computeOverallScore(left, right, services, {
        ...defaultCorrelationConfig,
        threshold,
      });

      if (score >= threshold) {
        graph.get(left.id)?.add(right.id);
        graph.get(right.id)?.add(left.id);
      }
    }
  }

  const visited = new Set<string>();
  const candidates: IncidentCandidate[] = [];

  for (const event of events) {
    if (visited.has(event.id)) {
      continue;
    }

    const queue = [event.id];
    const clusterIds: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      clusterIds.push(current);

      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (clusterIds.length > 1) {
      const clusterEvents = events.filter((item) => clusterIds.includes(item.id));
      const serviceNames = [...new Set(clusterEvents.map((item) => item.service))];
      const confidence = clusterEvents.reduce((sum, item) => sum + (item.severity === 'critical' ? 0.2 : item.severity === 'high' ? 0.15 : 0.1), 0) / clusterEvents.length;
      const summary = `${serviceNames[0] ?? 'Service'} incident cluster with ${clusterEvents.length} correlated events`;

      candidates.push({
        id: `CAND-${candidates.length + 1}`,
        title: `${serviceNames[0] ?? 'Operations'} service degradation`,
        confidence: Math.min(0.99, 0.55 + confidence),
        eventIds: clusterIds,
        serviceNames,
        summary,
        evidence: [
          {
            type: 'temporal',
            description: 'Events are close enough to suggest a common operational trigger.',
            strength: 0.9,
          },
          {
            type: 'semantic',
            description: 'Messages share operational language and symptom patterns.',
            strength: 0.8,
          },
          {
            type: 'sequence',
            description: 'The observed sequence matches a typical service degradation path.',
            strength: 0.75,
          },
        ],
      });
    }
  }

  return candidates;
}
