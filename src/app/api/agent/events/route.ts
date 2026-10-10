import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { setActiveRun, recordAuditLog } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { run_id, project_id = "proj_demo", incident_id, step_key, actor = "workato", status = "completed", error } = body;

    if (run_id) {
      await setActiveRun(run_id, incident_id, undefined, project_id);
    }

    await recordAuditLog({
      project_id,
      actor,
      action: `agent_step:${step_key || "event_logged"}`,
      target: run_id,
      detail: { status, error },
    });

    console.log(`[Agent Event] Run: ${run_id} | Step: ${step_key} | Status: ${status}`, error ? `Error: ${error}` : "");

    return NextResponse.json({
      success: true,
      run_id,
      step_key: step_key || "event_logged",
      logged_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log agent event" }, { status: 500 });
  }
}
