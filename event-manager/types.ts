export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type StandardTenantId = "acme-prod" | "novapay-prod" | "techflow-staging";
export type TenantId = StandardTenantId | (string & {});

export interface OperationalEvent {
  eventId: string;
  tenantId: TenantId;
  timestamp: string;
  service: string;
  source: string;
  eventType: string;
  severity: Severity;
  message: string;
  metadata: Record<string, unknown>;
}

export interface ScenarioStepTemplate {
  offsetSeconds: number;
  service: string;
  source: string;
  eventType: string;
  severity: Severity;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentScenario {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
  steps: ScenarioStepTemplate[];
}

export interface GeneratorOptions {
  tenantId?: TenantId;
  startTime?: Date;
  noiseCount?: number;
  noiseTimeWindowMinutes?: number;
  seed?: number;
}

export interface StreamOptions extends GeneratorOptions {
  emissionRateMs?: number;
  instant?: boolean;
}

export interface EventTransport {
  send(event: OperationalEvent): Promise<void>;
  sendBatch(events: OperationalEvent[]): Promise<void>;
  close?(): Promise<void>;
}
