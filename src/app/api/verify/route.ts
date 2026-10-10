import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getRunById, incrementRunPollCount, updateRunState, recordAuditLog } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { run_id } = body;

    if (!run_id) {
      return NextResponse.json(
        { error: { code: "MISSING_PARAMS", message: "run_id is required" } },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const run = await getRunById(run_id);
    const pollCount = await incrementRunPollCount(run_id);

    // Bounded verification simulation: healthy telemetry recovers across consecutive polls
    const isRecovered = pollCount >= 2;
    const errorRate = isRecovered ? 0.005 : 0.045;
    const p95Latency = isRecovered ? 78 : 340;
    const healthStatus = isRecovered ? "healthy" : "recovering";
    const verdict = isRecovered ? "recovered" : "pending";
    const streak = isRecovered ? 3 : pollCount;

    if (isRecovered) {
      await updateRunState(run_id, {
        status: "resolved",
      });

      await recordAuditLog({
        project_id: run?.project_id || "proj_demo",
        actor: "workato:ir-remediate-verify",
        action: "verification_completed",
        target: run_id,
        detail: { verdict, streak, errorRate, p95Latency },
      });

      try {
        await supabase.from("agent_runs").update({
          status: "resolved",
          end_time: new Date().toISOString(),
        }).eq("id", run_id);
      } catch {
        // Non-blocking
      }
    }

    // Optional recovery sample recording
    try {
      await supabase.from("recovery_samples").insert({
        run_id,
        error_rate: errorRate,
        p95_latency: p95Latency,
        health_status: healthStatus,
        source: "demo-service-metrics",
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      verdict,
      healthy: isRecovered,
      streak,
      resolved: isRecovered,
      current_sample: { errorRate, p95Latency, healthStatus },
    });
  } catch (error: any) {
    console.error("Verifier Error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
