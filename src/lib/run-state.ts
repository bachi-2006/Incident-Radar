import { supabaseAdmin } from "@/lib/supabase";

export interface RunStateRecord {
  id: string;
  project_id?: string;
  incident_id?: string;
  scenario?: string;
  decision?: string;
  rule_id?: string;
  status: "running" | "awaiting_approval" | "approved" | "rejected" | "resolved" | "failed" | "escalated";
  required_role?: string;
  approval_token_hash?: string;
  approved_by?: string;
  verify_samples?: any[];
  receipt_sha256?: string;
  poll_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLogRecord {
  id?: number;
  project_id?: string;
  actor: string;
  action: string;
  target?: string;
  detail?: Record<string, any>;
  created_at?: string;
}

// In-memory fallback map for offline/provisioning fallback
const inMemoryRuns = new Map<string, RunStateRecord>();
const inMemoryAuditLogs: AuditLogRecord[] = [];
let lastActiveRunId: string | null = null;

export async function setActiveRun(
  runId: string,
  incidentId?: string,
  scenario?: "act" | "ask" | "notify" | string,
  projectId = "proj_demo"
): Promise<RunStateRecord> {
  lastActiveRunId = runId;

  const record: RunStateRecord = {
    id: runId,
    project_id: projectId,
    incident_id: incidentId,
    scenario,
    status: "running",
    poll_count: 0,
    verify_samples: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryRuns.set(runId, { ...(inMemoryRuns.get(runId) || {}), ...record });

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("runs")
        .upsert(record as any)
        .select("*")
        .single();

      if (!error && data) {
        return data as RunStateRecord;
      }
    } catch {
      // Fallback to in-memory on DB failure
    }
  }

  return record;
}

export async function getRunById(runId: string): Promise<RunStateRecord | null> {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("runs")
        .select("*")
        .eq("id", runId)
        .single();

      if (!error && data) {
        return data as RunStateRecord;
      }
    } catch {
      // Fallback to in-memory on DB failure
    }
  }

  return inMemoryRuns.get(runId) || null;
}

export async function getActiveRun(maxAgeMs = 300_000): Promise<RunStateRecord | null> {
  if (lastActiveRunId) {
    const run = await getRunById(lastActiveRunId);
    if (run) {
      const updatedTime = run.updated_at ? new Date(run.updated_at).getTime() : 0;
      if (Date.now() - updatedTime <= maxAgeMs) {
        return run;
      }
    }
  }
  return null;
}

export async function updateRunState(
  runId: string,
  updates: Partial<RunStateRecord>
): Promise<RunStateRecord | null> {
  const existing = (await getRunById(runId)) || { id: runId, status: "running" };
  const updated: RunStateRecord = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  inMemoryRuns.set(runId, updated);

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("runs")
        .upsert(updated as any)
        .select("*")
        .single();

      if (!error && data) {
        return data as RunStateRecord;
      }
    } catch {
      // Fallback to in-memory
    }
  }

  return updated;
}

export async function incrementRunPollCount(runId: string): Promise<number> {
  const run = await getRunById(runId);
  const newCount = ((run?.poll_count) || 0) + 1;
  await updateRunState(runId, { poll_count: newCount });
  return newCount;
}

export async function recordAuditLog(entry: AuditLogRecord): Promise<void> {
  const record: AuditLogRecord = {
    ...entry,
    project_id: entry.project_id || "proj_demo",
    created_at: new Date().toISOString(),
  };

  inMemoryAuditLogs.push(record);

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("audit_log").insert(record as any);
    } catch {
      // Fallback to in-memory
    }
  }
}

export function getInMemoryAuditLogs(): AuditLogRecord[] {
  return [...inMemoryAuditLogs];
}
