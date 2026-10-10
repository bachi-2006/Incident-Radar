export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type EventCategory =
  | 'deployment'
  | 'metric'
  | 'error'
  | 'warning'
  | 'info'
  | 'unknown';

export interface ServiceNode {
  id: string;
  name: string;
  type: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
}

export interface EventSignal {
  id: string;
  timestamp: string | Date;
  service: string;
  serviceId?: string;
  source: string;
  eventType: EventCategory | string;
  severity: Severity;
  message: string;
  metadata?: Record<string, unknown>;
  incidentId?: string;
}

export interface CorrelationFactors {
  time: number;
  service: number;
  dependency: number;
  semantic: number;
  sequence: number;
  overall: number;
}

export interface EventCorrelation {
  eventAId: string;
  eventBId: string;
  relationship: string;
  factors: CorrelationFactors;
}

export interface IncdientCandidateEvidence {
  type: 'temporal' | 'service' | 'dependency' | 'semantic' | 'sequence';
  description: string;
  strength: number;
}

export interface IncidentCandidate {
  id: string;
  title: string;
  confidence: number;
  eventIds: string[];
  serviceNames: string[];
  summary: string;
  evidence: IncdientCandidateEvidence[];
}

export interface CorrelationEngineConfig {
  threshold: number;
  timeWindowMs: number;
  timeWeight: number;
  serviceWeight: number;
  dependencyWeight: number;
  semanticWeight: number;
  sequenceWeight: number;
}
