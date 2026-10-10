export interface RunState {
  runId: string;
  incidentId?: string;
  scenario?: "act" | "ask" | "notify";
  updatedAt: number;
}

const globalForRun = global as unknown as { activeRunState?: RunState };

export function setActiveRun(
  runId: string,
  incidentId?: string,
  scenario?: "act" | "ask" | "notify"
) {
  globalForRun.activeRunState = {
    runId,
    incidentId,
    scenario,
    updatedAt: Date.now(),
  };
}

export function getActiveRun(maxAgeMs = 300_000): RunState | null {
  const current = globalForRun.activeRunState;
  if (!current) return null;
  if (Date.now() - current.updatedAt > maxAgeMs) {
    return null;
  }
  return current;
}
