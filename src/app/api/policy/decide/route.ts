import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getActiveRun, updateRunState, recordAuditLog } from "@/lib/run-state";
import { generateApprovalToken } from "@/lib/approval-token";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const active = await getActiveRun();
    const run_id = body.run_id || active?.id || `run_${Date.now()}`;
    const project_id = body.project_id || active?.project_id || "proj_demo";

    // DEMO_MODE toggle: defaults to true unless explicitly set to 'false'
    const isDemoMode = process.env.DEMO_MODE !== "false";

    let assessment_status = body.assessment_status || "supported";
    let candidate_cause = body.candidate_cause || "Recent bad canary deployment causing payment gateway latency spikes";
    let recommended_action = body.recommended_action || "rollback_latest_deploy";
    let fallback_action = body.fallback_action || "disable_demo_feature_flag";

    // In DEMO_MODE, support run_id substring routing for hackathon scenario reliability
    if (isDemoMode) {
      const isNotify =
        run_id.includes("notify") ||
        run_id.includes("contradict") ||
        run_id.includes("escalat") ||
        run_id.includes("noise") ||
        (!body.run_id && active?.scenario === "notify");

      const isAsk =
        !isNotify &&
        (run_id.includes("ask") ||
          run_id.includes("memory") ||
          run_id.includes("approval") ||
          (!body.run_id && active?.scenario === "ask"));

      if (isNotify) {
        assessment_status = "contradictory";
        candidate_cause = "Conflicting telemetry: CPU saturation on primary node with nominal query latency and zero external traffic.";
      } else if (isAsk) {
        assessment_status = "uncertain";
        candidate_cause = "Gradual cluster memory exhaustion over 48h; unconfirmed leak origin across microservices.";
        recommended_action = "restart_demo_service";
        fallback_action = "disable_demo_feature_flag";
      }
    }

    const allowedCatalogue = [
      "rollback_latest_deploy",
      "disable_demo_feature_flag",
      "restart_demo_service",
    ];

    const isAllowedAction = allowedCatalogue.includes(recommended_action);

    let decision = "NOTIFY";
    let rule_id = "R7_ACTION_CONTEXT_MISMATCH";
    let slack_text = "";
    let reason = "";
    let approvalToken: string | null = null;
    let requiredRole = "responder";

    const baseUrl = process.env.APP_BASE_URL || "https://incident-radar.onrender.com";

    if (assessment_status === "supported" && isAllowedAction) {
      decision = "ACT";
      rule_id = "R6_HIGH_EVIDENCE_REVERSIBLE";
      reason = "High confidence causal link backed by chronological telemetry; authorized catalogue action.";
      slack_text = `🚨 *Incident Radar*: Assessment supported (${candidate_cause}). Auto-remediating with action: \`${recommended_action}\`.`;
    } else if (assessment_status === "uncertain" || assessment_status === "insufficient_data") {
      decision = "ASK";
      rule_id = "R4_LOW_EVIDENCE_REVIEW";
      reason = "Telemetry signals inconclusive or conflicting. Requires human-in-the-loop sign-off.";
      requiredRole = body.affected_services?.length >= 2 ? "maintainer" : "responder";
      approvalToken = generateApprovalToken(run_id);
      const approveUrl = `${baseUrl}/approve/${run_id}?t=${approvalToken}`;
      slack_text = `⚠️ *Incident Radar*: Triage uncertain (${candidate_cause}). Proposed fix \`${recommended_action}\` requires approval: ${approveUrl}`;
    } else {
      decision = "NOTIFY";
      rule_id = "R7_ACTION_CONTEXT_MISMATCH";
      reason = "Contradictory evidence or unsupported action. Escalating to on-call engineer.";
      slack_text = `🛑 *Incident Radar*: Investigation escalated without automated action. Root cause ambiguous (${candidate_cause}). Paging on-call responder.`;
    }

    // Persist run state
    await updateRunState(run_id, {
      project_id,
      decision,
      rule_id,
      status: decision === "ASK" ? "awaiting_approval" : decision === "ACT" ? "running" : "escalated",
      required_role: requiredRole,
    });

    await recordAuditLog({
      project_id,
      actor: "workato:ir-orchestrator",
      action: "policy_evaluated",
      target: run_id,
      detail: { decision, rule_id, recommended_action, assessment_status },
    });

    return NextResponse.json({
      run_id,
      project_id,
      decision,
      action: recommended_action,
      fallback_action,
      rule_id,
      required_role: requiredRole,
      policy_version: "v2-policy",
      reason,
      slack_text,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to evaluate policy" }, { status: 500 });
  }
}
