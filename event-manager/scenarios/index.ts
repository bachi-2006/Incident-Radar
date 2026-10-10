import type { IncidentScenario } from "../types";
import { databaseFailureScenario } from "./database-failure";
import { memoryLeakScenario } from "./memory-leak";
import { paymentDegradationScenario } from "./payment-degradation";

const scenarios: IncidentScenario[] = [paymentDegradationScenario, databaseFailureScenario, memoryLeakScenario];

export function getScenario(id: string): IncidentScenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

export function listScenarios(): IncidentScenario[] {
  return [...scenarios];
}

