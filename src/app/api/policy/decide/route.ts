import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    const configuredSecret = process.env.WORKATO_SHARED_SECRET;

    if (configuredSecret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid X-IR-Secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      run_id = `run_${Date.now()}`,
      assessment_status = "supported",
      candidate_cause = "Recent bad canary deployment causing payment gateway latency spikes",
      recommended_action = "rollback_latest_deploy",
      fallback_action = "disable_demo_feature_flag",
      evidence_for = [],
      evidence_against = [],
      reasoning_summary = "High correlation between deployment event and elevated error metrics.",
    } = body;

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
      slack_text = `🛑 *Incident Radar*: Investigation escalated without automated action. Root cause ambiguous.`;
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
