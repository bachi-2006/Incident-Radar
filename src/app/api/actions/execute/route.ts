import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getRunById, updateRunState, recordAuditLog } from "@/lib/run-state";
import { executeActionWithAdapter } from "@/lib/action-adapters";

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

    // 1. Resolve remediation action
    let actionToExecute = body.action;
    if (!actionToExecute) {
      if (run?.decision === "NOTIFY") {
        actionToExecute = "restart_demo_service";
      } else {
        actionToExecute = role === "primary" ? "rollback_latest_deploy" : "disable_demo_feature_flag";
      }
    }

    // 2. Kill Switch verification
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "global_settings")
        .single();
      if (settings?.kill_switch) {
        return NextResponse.json(
          { error: { code: "KILL_SWITCH", message: "Execution blocked by global safety kill switch" } },
          { status: 403 }
        );
      }
    } catch {
      // Non-blocking
    }

    // 3. Resolve target service and operational mode
    let inferredService = "payment-gateway-service";
    if (run_id.includes("auth")) inferredService = "auth-gateway";
    else if (run_id.includes("memory") || run_id.includes("ask")) inferredService = "worker-cluster-pool";
    else if (run_id.includes("db") || run_id.includes("postgres")) inferredService = "postgres-primary";

    const targetService = body.target_service || body.service_name || (run as any)?.target_service || inferredService;
    const mode = body.mode || (process.env.EXECUTION_MODE === "LIVE" ? "LIVE" : "SIMULATION");
    const idempotencyKey = body.idempotency_key || `${run_id}-${role}-${actionToExecute}`;

    // 4. Execute via Action Adapter
    const executionResult = await executeActionWithAdapter({
      runId: run_id,
      projectId: run?.project_id || "proj_demo",
      action: actionToExecute,
      role,
      targetService,
      idempotencyKey,
      mode,
      parameters: body.parameters,
    });

    // 5. Update run state & audit trail
    await updateRunState(run_id, {
      status: executionResult.status === "failed" ? "failed" : "running",
      action_execution_id: executionResult.executionId,
      action_executed: actionToExecute,
      action_output: executionResult.output,
    });

    await recordAuditLog({
      project_id: run?.project_id || "proj_demo",
      actor: "workato:ir-remediate-verify",
      action: `action_${role}_executed`,
      target: run_id,
      detail: {
        role,
        action: actionToExecute,
        status: executionResult.status,
        provider: executionResult.provider,
        idempotencyKey,
        durationMs: executionResult.durationMs,
        mode: executionResult.mode,
      },
    });

    // 6. Record to Supabase agent_steps if available
    try {
      await supabase.from("agent_steps").insert({
        run_id,
        step_key: `action.${role}.executed`,
        actor: executionResult.provider,
        action: actionToExecute,
        status: executionResult.status,
        reason: executionResult.status === "succeeded" ? "Remediation action successfully executed" : executionResult.error,
        metadata: {
          idempotencyKey,
          mode: executionResult.mode,
          durationMs: executionResult.durationMs,
          output: executionResult.output,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      status: executionResult.status,
      action: actionToExecute,
      execution_id: executionResult.executionId,
      mode: executionResult.mode,
      provider: executionResult.provider,
      output: executionResult.output,
    });
  } catch (error: any) {
    console.error("Action Execution Gateway Error:", error);
    return NextResponse.json(
      { error: { code: "EXECUTION_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
