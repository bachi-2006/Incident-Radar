import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getRunById, incrementRunPollCount, updateRunState, recordAuditLog } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const runId = body.run_id || "default_run";
    const isDemoMode = process.env.DEMO_MODE !== "false";

    const currentCount = await incrementRunPollCount(runId);
    const existingRun = await getRunById(runId);

    if (isDemoMode) {
      // After 2 polls in demo mode, simulate 3 consecutive fresh healthy samples
      if (currentCount >= 2) {
        const hash = runId.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const baseErr = (hash % 5 + 2) / 1000; // 0.2% - 0.6%
        const baseLat = 85 + (hash % 40); // 85 - 124ms

        const samples = [
          { error_rate: baseErr + 0.001, p95_ms: baseLat + 4, healthy: true },
          { error_rate: baseErr, p95_ms: baseLat, healthy: true },
          { error_rate: Math.max(0.001, baseErr - 0.001), p95_ms: baseLat - 3, healthy: true },
        ];

        await updateRunState(runId, {
          status: "approved",
          verify_samples: samples,
        });

        await recordAuditLog({
          project_id: existingRun?.project_id || "proj_demo",
          actor: "workato:ir-remediate-verify",
          action: "verification_completed",
          target: runId,
          detail: { verdict: "recovered", consecutive_healthy: 3 },
        });

        return NextResponse.json({
          run_id: runId,
          verdict: "recovered",
          consecutive_healthy: 3,
          error_rate: baseErr,
          p95_ms: baseLat,
          status: "healthy",
          samples,
          verified_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        run_id: runId,
        verdict: "pending",
        consecutive_healthy: currentCount,
        error_rate: 0.045,
        p95_ms: 215,
        status: "recovering",
        verified_at: new Date().toISOString(),
      });
    }

    // Strict Non-Demo Mode (Phase 7 real verification will fill this path)
    const samples = existingRun?.verify_samples || [];
    return NextResponse.json({
      run_id: runId,
      verdict: samples.length >= 3 ? "recovered" : "pending",
      consecutive_healthy: samples.length,
      samples,
      verified_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification poll failed" }, { status: 500 });
  }
}
