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
      const hash = runId.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const baseErr = ((hash % 5 + 2) / 1000); // 0.002 - 0.006 (0.2% - 0.6%)
      const baseLat = 85 + (hash % 40); // 85 - 124ms

      return NextResponse.json({
        run_id: runId,
        verdict: "recovered",
        consecutive_healthy: 3,
        error_rate: baseErr,
        p95_ms: baseLat,
        status: "healthy",
        samples: [
          { error_rate: baseErr + 0.001, p95_ms: baseLat + 4, healthy: true },
          { error_rate: baseErr, p95_ms: baseLat, healthy: true },
          { error_rate: Math.max(0.001, baseErr - 0.001), p95_ms: baseLat - 3, healthy: true },
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
