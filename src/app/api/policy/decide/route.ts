import { NextRequest, NextResponse } from "next/server";
import { getActiveRun } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    const configuredSecret = process.env.WORKATO_SHARED_SECRET;

    if (configuredSecret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid X-IR-Secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const active = getActiveRun();
    const run_id = body.run_id || active?.runId || `run_${Date.now()}`;

    // Extract assessment fields from body or default
    let assessment_status = body.assessment_status || "supported";
    let candidate_cause = body.candidate_cause || "Recent bad canary deployment causing payment gateway latency spikes";
    let recommended_action = body.recommended_action || "rollback_latest_deploy";
    let fallback_action = body.fallback_action || "disable_demo_feature_flag";

    // Priority 1: Check explicit run_id substrings or active scenario
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

    if (assessment_status === "supported" && isAllowedAction) {
      decision = "ACT";
      rule_id = "R6_HIGH_EVIDENCE_REVERSIBLE";
      reason = "High confidence causal link backed by chronological telemetry; authorized catalogue action.";
      slack_text = `🚨 *Incident Radar*: Assessment supported (${candidate_cause}). Auto-remediating with action: \`${recommended_action}\`.`;
    } else if (assessment_status === "uncertain" || assessment_status === "insufficient_data") {
      decision = "ASK";
      rule_id = "R4_LOW_EVIDENCE_REVIEW";
      reason = "Telemetry signals inconclusive or conflicting. Requires human-in-the-loop sign-off.";
      slack_text = `⚠️ *Incident Radar*: Triage uncertain (${candidate_cause}). Proposed fix \`${recommended_action}\` requires approval: https://incident-radar.onrender.com/approve/${run_id}`;
    } else {
      decision = "NOTIFY";
      rule_id = "R7_ACTION_CONTEXT_MISMATCH";
      reason = "Contradictory evidence or unsupported action. Escalating to on-call engineer.";
      slack_text = `🛑 *Incident Radar*: Investigation escalated without automated action. Root cause ambiguous (${candidate_cause}). Paging on-call responder.`;
    }

    return NextResponse.json({
      run_id,
      decision,
      action: recommended_action,
      fallback_action,
      rule_id,
      policy_version: "demo-policy-v1",
      reason,
      slack_text,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to evaluate policy" }, { status: 500 });
  }
}
