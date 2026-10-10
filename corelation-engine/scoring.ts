import type { CorrelationEngineConfig, EventSignal, ServiceNode } from './types';

export const defaultCorrelationConfig: CorrelationEngineConfig = {
  threshold: 0.65,
  timeWindowMs: 15 * 60 * 1000,
  timeWeight: 0.25,
  serviceWeight: 0.2,
  dependencyWeight: 0.2,
  semanticWeight: 0.2,
  sequenceWeight: 0.15,
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const toMilliseconds = (value: string | Date) =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeTimeScore(
  left: EventSignal,
  right: EventSignal,
  windowMs = defaultCorrelationConfig.timeWindowMs,
): number {
  const diff = Math.abs(toMilliseconds(left.timestamp) - toMilliseconds(right.timestamp));

  if (diff <= 0) {
    return 1;
  }

  if (diff >= windowMs) {
    return 0;
  }

  return clamp(1 - diff / windowMs);
}

export function computeServiceScore(left: EventSignal, right: EventSignal): number {
  if (left.service === right.service) {
    return 1;
  }

  return 0.25;
}

export function computeDependencyScore(
  left: EventSignal,
  right: EventSignal,
  services: ServiceNode[],
): number {
  const leftNode = services.find((service) => service.name === left.service || service.id === left.serviceId);
  const rightNode = services.find((service) => service.name === right.service || service.id === right.serviceId);

  if (!leftNode || !rightNode) {
    return clamp(
      left.service === right.service ? 1 : 0.15,
    );
  }

  const directDependency =
    leftNode.dependencies.includes(rightNode.name) || rightNode.dependencies.includes(leftNode.name);

  if (directDependency) {
    return 0.9;
  }

  const sharedDependency =
    leftNode.dependencies.some((dependency) => rightNode.dependencies.includes(dependency)) ||
    rightNode.dependencies.some((dependency) => leftNode.dependencies.includes(dependency));

  if (sharedDependency) {
    return 0.65;
  }

  return 0.2;
}

export function computeSemanticScore(left: EventSignal, right: EventSignal): number {
  const leftTokens = new Set(normalizeText(left.message).split(' '));
  const rightTokens = new Set(normalizeText(right.message).split(' '));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  const similarity = overlap.length / union.size;

  const sameType = left.eventType === right.eventType ? 0.2 : 0;
  const sameSource = left.source === right.source ? 0.1 : 0;

  return clamp(similarity + sameType + sameSource);
}

export function computeSequenceScore(left: EventSignal, right: EventSignal): number {
  const ordered = [
    'deployment',
    'metric',
    'error',
    'warning',
    'info',
  ];

  const leftIndex = ordered.indexOf(String(left.eventType).toLowerCase());
  const rightIndex = ordered.indexOf(String(right.eventType).toLowerCase());

  if (leftIndex === -1 || rightIndex === -1) {
    return 0.3;
  }

  const delta = Math.abs(leftIndex - rightIndex);
  const forwardProgress = delta <= 2 ? 0.8 : 0.4;
  const timeScore = computeTimeScore(left, right);

  return clamp((forwardProgress + timeScore) / 2);
}

export function computeOverallScore(
  left: EventSignal,
  right: EventSignal,
  services: ServiceNode[],
  config: CorrelationEngineConfig = defaultCorrelationConfig,
): number {
  const timeScore = computeTimeScore(left, right, config.timeWindowMs);
  const serviceScore = computeServiceScore(left, right);
  const dependencyScore = computeDependencyScore(left, right, services);
  const semanticScore = computeSemanticScore(left, right);
  const sequenceScore = computeSequenceScore(left, right);

  const overall =
    timeScore * config.timeWeight +
    serviceScore * config.serviceWeight +
    dependencyScore * config.dependencyWeight +
    semanticScore * config.semanticWeight +
    sequenceScore * config.sequenceWeight;

  return clamp(overall);
}
