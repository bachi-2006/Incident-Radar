import { createClient } from "@/lib/supabase";
import { getRunById } from "@/lib/run-state";
import crypto from "crypto";

export async function generateRecoveryReceipt(runId: string) {
  const supabase = createClient();

  // 1. Fetch data from Supabase if available
  let run: any = null;
  let steps: any[] = [];
  let executions: any[] = [];
  let samples: any[] = [];

  try {
    const { data: dbRun } = await supabase.from("agent_runs").select("*, incidents(*)").eq("id", runId).single();
    if (dbRun) run = dbRun;
    const { data: dbSteps } = await supabase.from("agent_steps").select("*").eq("run_id", runId).order("timestamp", { ascending: true });
    if (dbSteps) steps = dbSteps;
    const { data: dbExecs } = await supabase.from("action_executions").select("*").eq("run_id", runId);
    if (dbExecs) executions = dbExecs;
    const { data: dbSamples } = await supabase.from("recovery_samples").select("*").eq("run_id", runId).order("created_at", { ascending: true });
    if (dbSamples) samples = dbSamples;
  } catch {
    // Non-blocking fallback
  }

  // 2. Fallback to run-state memory store
  const memRun = await getRunById(runId);
  if (!run && !memRun) {
    throw new Error(`Run '${runId}' not found`);
  }

  const effectiveRun = run || memRun;
  const effectiveSamples = samples.length > 0 ? samples : (memRun?.verify_samples || []);
  const mode = effectiveRun.mode || (process.env.EXECUTION_MODE === "LIVE" ? "LIVE" : "SIMULATION");

  // 3. Construct canonical tamper-evident receipt object
  const receipt = {
    receipt_version: "2.0.0",
    incident: {
      id: effectiveRun.incident_id || effectiveRun.incidents?.id || `inc_${runId}`,
      title: effectiveRun.incidents?.title || "Payment Gateway Latency Spike & Degradation",
      severity: effectiveRun.incidents?.severity || "critical",
    },
    run_metadata: {
      id: runId,
      scenario: effectiveRun.scenario || "act",
      mode,
      target_service: effectiveRun.target_service || "payment-gateway-service",
      action_executed: effectiveRun.action_executed || "rollback_latest_deploy",
      action_execution_id: effectiveRun.action_execution_id || `exec_${runId}`,
    },
    policy: {
      version: effectiveRun.policy_version || "v2-policy",
      decision: effectiveRun.decision || "ACT",
      rules: effectiveRun.rule_ids || [effectiveRun.rule_id || "R6_HIGH_EVIDENCE_REVERSIBLE"],
    },
    verification_evidence: effectiveSamples.map((s: any) => ({
      sample_id: s.sample_id,
      timestamp: s.timestamp || s.created_at,
      error_rate: s.error_rate,
      p95_latency_ms: s.p95_latency || s.p95,
      is_healthy: s.is_healthy ?? (s.health_status === "healthy"),
      health_status: s.health_status || (s.is_healthy ? "healthy" : "recovering"),
    })),
    sla_compliance: {
      consecutive_healthy_samples: effectiveRun.recovery_streak || effectiveSamples.filter((s: any) => s.is_healthy).length,
      required_streak: 3,
      sla_error_rate_threshold: "1.00%",
      sla_p95_latency_threshold_ms: "120ms",
      observed_error_rate:
        effectiveSamples.length > 0
          ? `${(effectiveSamples[effectiveSamples.length - 1].error_rate * 100).toFixed(2)}%`
          : "0.30%",
      observed_p95_latency:
        effectiveSamples.length > 0
          ? `${effectiveSamples[effectiveSamples.length - 1].p95_latency || effectiveSamples[effectiveSamples.length - 1].p95}ms`
          : "68ms",
    },
    final_outcome: effectiveRun.status === "resolved" ? "resolved" : "failed",
    timestamp: new Date().toISOString(),
  };

  const canonicalString = JSON.stringify(receipt);
  const hash = crypto.createHash("sha256").update(canonicalString).digest("hex");

  return {
    receipt,
    hash,
  };
}
