import { NextRequest, NextResponse } from "next/server";

// In-memory verification poll tracker per run_id
const pollCounts = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    const configuredSecret = process.env.WORKATO_SHARED_SECRET;

    if (configuredSecret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid X-IR-Secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const runId = body.run_id || "default_run";

    const currentCount = (pollCounts.get(runId) || 0) + 1;
    pollCounts.set(runId, currentCount);

    // After 2 polls, simulate 3 consecutive fresh healthy samples
    if (currentCount >= 2) {
      return NextResponse.json({
        run_id: runId,
        verdict: "recovered",
        consecutive_healthy: 3,
        error_rate: 0.006,
        p95_ms: 108,
        status: "healthy",
        samples: [
          { error_rate: 0.007, p95_ms: 112, healthy: true },
          { error_rate: 0.006, p95_ms: 109, healthy: true },
          { error_rate: 0.005, p95_ms: 104, healthy: true },
        ],
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification poll failed" }, { status: 500 });
  }
}
