import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    const configuredSecret = process.env.WORKATO_SHARED_SECRET;

    if (configuredSecret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid X-IR-Secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { run_id = `run_${Date.now()}`, role = "primary" } = body;

    const action = role === "fallback" ? "disable_demo_feature_flag" : "rollback_latest_deploy";
    const execution_id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(`[Action Gateway] Executing ${role} action: ${action} for run ${run_id}`);

    return NextResponse.json({
      success: true,
      run_id,
      role,
      action,
      status: "succeeded",
      execution_id,
      executed_at: new Date().toISOString(),
      details: {
        target: "payment-service",
        previous_version: "v2.4.1",
        target_version: role === "fallback" ? "v2.4.0 (feature flag disabled)" : "v2.4.0",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Action execution failed" }, { status: 500 });
  }
}
