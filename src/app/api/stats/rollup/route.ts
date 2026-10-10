import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const hour = body.hour || new Date().toISOString();

    const stats = {
      project_id: "00000000-0000-0000-0000-000000000002",
      hour,
      uptime_pct: 99.8,
      p95_latency_ms: 104,
      probe_count: 96,
      probe_failures: 0,
      client_error_count: 3,
      ci_runs: 4,
      ci_pass_rate: 1.0,
      deploys: 1,
      failed_deploys: 0,
      incidents_opened: 1,
      incidents_resolved: 1,
      mttr_minutes: 12.5,
      assignments_overdue: 0,
    };

    return NextResponse.json({
      projects: [
        {
          project_id: stats.project_id,
          stats,
          breaches: [], // no SLA breaches
        },
      ],
      rolled_up_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute stats rollup" }, { status: 500 });
  }
}
