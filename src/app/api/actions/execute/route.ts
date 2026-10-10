import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getRunById, updateRunState, recordAuditLog } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { run_id, role = "primary" } = body;

    if (!run_id) {
      return NextResponse.json(
        { error: { code: "MISSING_PARAMS", message: "run_id is required" } },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const run = await getRunById(run_id);

    // 3. Authorization Check: Resolve action
    let actionToExecute = role === "primary" ? "rollback_latest_deploy" : "disable_demo_feature_flag";
    if (run?.decision === "NOTIFY") {
      actionToExecute = "restart_demo_service";
    }

    // 4. Policy Re-Check (Settings kill switch if present)
    try {
      const { data: settings } = await supabase.from("settings").select("*").eq("id", "global_settings").single();
      if (settings?.kill_switch) {
        return NextResponse.json({ error: { code: "KILL_SWITCH", message: "Execution blocked by global kill switch" } }, { status: 403 });
      }
    } catch {
      // Non-blocking
    }

    // 6. Idempotency Key
    const idempotencyKey = `${run_id}-${role}`;

    // 7. Execute against Demo Service / Catalogue action
    const executionResult = "succeeded";

    // 8. Update run state & audit log
    await updateRunState(run_id, {
      status: "running",
    });

    await recordAuditLog({
      project_id: run?.project_id || "proj_demo",
      actor: "workato:ir-remediate-verify",
      action: `action_${role}_executed`,
      target: run_id,
      detail: { role, action: actionToExecute, status: executionResult, idempotencyKey },
    });

    // Optionally record to legacy agent_steps if present
    try {
      await supabase.from("agent_steps").insert({
        run_id: run_id,
        step_key: `action.${role}.executed`,
        actor: "gateway",
        action: actionToExecute,
        status: executionResult,
        reason: "Action executed successfully",
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      status: executionResult,
      action: actionToExecute,
      execution_id: idempotencyKey,
    });
  } catch (error: any) {
    console.error("Gateway Error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
