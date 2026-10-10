import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { recordAuditLog, updateRunState } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { run_id = `run_${Date.now()}`, project_id = "proj_demo", role = "primary", target_sha } = body;

    const action = role === "fallback" ? "disable_demo_feature_flag" : "rollback_latest_deploy";
    const execution_id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await updateRunState(run_id, {
      project_id,
      status: "running",
    });

    await recordAuditLog({
      project_id,
      actor: "workato:ir-remediate-verify",
      action: "action_executed",
      target: run_id,
      detail: { role, action, target_sha, execution_id },
    });

    console.log(`[Action Gateway] Executing ${role} action: ${action} for run ${run_id}`);

    return NextResponse.json({
      success: true,
      run_id,
      project_id,
      role,
      action,
      status: "succeeded",
      execution_id,
      executed_at: new Date().toISOString(),
      details: {
        target: "payment-service",
        previous_version: "v2.4.1",
        target_version: role === "fallback" ? "v2.4.0 (feature flag disabled)" : "v2.4.0",
        target_sha,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Action execution failed" }, { status: 500 });
  }
}
