import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { getActiveRun, updateRunState, recordAuditLog } from "@/lib/run-state";
import { generateApprovalToken } from "@/lib/approval-token";
import { createClient } from "@/lib/supabase";

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

    // Extract triage fields from body or body.triage_output if provided
    const triage = body.triage_output || body;

    let assessment_status = triage.assessment_status || "supported";
    let candidate_cause = triage.candidate_cause || triage.likely_cause || "Recent bad canary deployment causing payment gateway latency spikes";
    let recommended_action = triage.recommended_action || "rollback_latest_deploy";
    let fallback_action = triage.fallback_action || "disable_demo_feature_flag";

    // Scenario routing based on run_id or active scenario
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
        run_id.includes("oom") ||
        (!body.run_id && active?.scenario === "ask"));

    if (isNotify) {
      assessment_status = "contradictory";
      candidate_cause = "Conflicting telemetry: CPU saturation on primary node with nominal query latency and zero external traffic.";
      recommended_action = "restart_demo_service";
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
    let approvalToken: string | null = null;
    let requiredRole = "responder";

    const baseUrl = process.env.APP_BASE_URL || "https://incident-radar.onrender.com";

    // Canonical Persona Dictionary
    const ROSTER: Record<string, { name: string; handle: string; role: string }> = {
      "U0C9380GASU": { name: "Rohith D", handle: "@Rohith D", role: "Admin / Project Lead" },
      "U0C846MT30D": { name: "Dachepally", handle: "@Dachepally", role: "Frontend Developer" },
      "U0C7TNSNS5D": { name: "Nithish gajjela", handle: "@Nithish gajjela", role: "Backend Developer / System Designer" },
    };

    let assignedSlackId = body.assigned_user_slack_id;
    if (!assignedSlackId || !ROSTER[assignedSlackId]) {
      const causeLower = (candidate_cause || "").toLowerCase();
      const runLower = (run_id || "").toLowerCase();

      if (runLower.includes("fe_") || runLower.includes("frontend") || causeLower.includes("frontend") || causeLower.includes("dead click") || causeLower.includes("hydration") || causeLower.includes("chunk")) {
        assignedSlackId = "U0C846MT30D";
      } else if (runLower.includes("be_") || runLower.includes("backend") || runLower.includes("sys_") || causeLower.includes("database") || causeLower.includes("npe") || causeLower.includes("pool") || causeLower.includes("redis") || causeLower.includes("kafka") || causeLower.includes("desync")) {
        assignedSlackId = "U0C7TNSNS5D";
      } else {
        assignedSlackId = "U0C9380GASU";
      }
    }

    const memberInfo = ROSTER[assignedSlackId] || ROSTER["U0C9380GASU"];
    const assignedName = memberInfo.name;
    const assignedHandle = memberInfo.handle;
    const assignedRole = memberInfo.role;

    const incident_id = body.incident_id || run_id;
    const category = (body.category || "frontend").trim().toLowerCase().replace(/\s+/g, "_");
    const categoryConfidence = Number(body.category_confidence) || 0.92;
    const deadline = body.deadline || new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const formattedDeadline = new Date(deadline).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

    let targetService = "payment-gateway-service";
    if (category === "frontend") targetService = "checkout-frontend";
    else if (category === "database") targetService = "postgres-primary";
    else if (category === "system_architecture") targetService = "auth-gateway-service";
    else if (category === "devops") targetService = "payment-api-canary";

    if (assessment_status === "supported" && isAllowedAction) {
      decision = "ACT";
      rule_id = "R6_HIGH_EVIDENCE_REVERSIBLE";
      reason = "High confidence causal link backed by chronological telemetry; authorized catalogue action.";
    } else if (assessment_status === "uncertain" || assessment_status === "insufficient_data") {
      decision = "ASK";
      rule_id = "R4_LOW_EVIDENCE_REVIEW";
      reason = "Telemetry signals inconclusive or conflicting. Requires human-in-the-loop sign-off.";
      requiredRole = body.affected_services?.length >= 2 ? "maintainer" : "responder";
      approvalToken = generateApprovalToken(run_id, 30 * 60 * 1000, { requiredRole, targetService });
    } else {
      decision = "NOTIFY";
      rule_id = "R7_ACTION_CONTEXT_MISMATCH";
      reason = "Contradictory evidence or unsupported action. Escalating to on-call engineer.";
    }

    const effectiveToken = approvalToken || generateApprovalToken(run_id, 30 * 60 * 1000, { requiredRole, targetService });
    const approveUrl = `${baseUrl}/approve/${run_id}?t=${effectiveToken}`;
    const ackLink = `${baseUrl}/a/${run_id}?action=ack&t=${effectiveToken}`;

    let slack_dm_text = "";
    let slack_channel_summary = `🚨 *Incident ${incident_id} assigned to ${assignedHandle.replace(/^@/, "")} (${category})*, confidence ${Math.round(categoryConfidence * 100)}%. A direct message was sent to the assignee.`;

    if (decision === "ACT") {
      slack_channel_summary = `🚨 *Incident ${incident_id} assigned to ${assignedHandle.replace(/^@/, "")} (${category})*. Autonomous remediation initiated via \`${recommended_action}\`. Direct message dispatched to assignee.`;
      slack_dm_text = `🚨 *Incident assigned to you*\n\n` +
        `*Assignee*: <@${assignedSlackId}> (${assignedHandle} — ${assignedRole})\n` +
        `*Area*: ${category} | *Confidence*: ${Math.round(categoryConfidence * 100)}%\n` +
        `*Incident*: ${candidate_cause}\n` +
        `*Service*: \`${targetService}\` | *Severity*: High\n\n` +
        `*Why you were selected*:\n` +
        `• ${assignedName} holds highest domain expertise (${assignedRole})\n` +
        `• Component ownership in ${category} architecture\n` +
        `• Correlated telemetry matches service ownership\n\n` +
        `*Recommended action*:\nAutonomous remediation via action \`${recommended_action}\`.\n\n` +
        `*Deadline*:\n${formattedDeadline} IST\n\n` +
        `*Open incident*: ${baseUrl}/incidents/${incident_id}\n` +
        `*View run*: ${baseUrl}/runs/${run_id}`;
    } else if (decision === "ASK") {
      slack_channel_summary = `🚨 *Incident ${incident_id} assigned to ${assignedHandle.replace(/^@/, "")} (${category})*. Human-in-the-loop review requested from assignee for action \`${recommended_action}\`. Direct message dispatched with approval link.`;
      slack_dm_text = `🚨 *Incident assigned to you*\n\n` +
        `*Assignee*: <@${assignedSlackId}> (${assignedHandle} — ${assignedRole})\n` +
        `*Area*: ${category} | *Confidence*: ${Math.round(categoryConfidence * 100)}%\n` +
        `*Incident*: ${candidate_cause}\n` +
        `*Service*: \`${targetService}\` | *Severity*: High\n\n` +
        `*Why you were selected*:\n` +
        `• ${assignedName} holds domain authority (${assignedRole})\n` +
        `• Specialist review required for ${category} component\n` +
        `• Telemetry ambiguity requires expert sign-off\n\n` +
        `*Recommended action*:\n\`${recommended_action}\` (Fallback: \`${fallback_action}\`)\n\n` +
        `*Deadline*:\n${formattedDeadline} IST\n\n` +
        `*Open incident*: ${baseUrl}/incidents/${incident_id}\n` +
        `*Acknowledge / Approve*: ${approveUrl}`;
    } else {
      slack_channel_summary = `🛑 *Incident ${incident_id} Escalated* to on-call roster. Primary: ${assignedHandle} (${assignedRole}). Manual investigation required.`;
      slack_dm_text = `🛑 *Incident Alert Escalated*\n\n` +
        `*Incident*: ${candidate_cause}\n` +
        `*Service*: \`${targetService}\`\n\n` +
        `*Primary Assignee*: <@${assignedSlackId}> (${assignedHandle} — ${assignedRole})\n` +
        `*Escalation Roster*: <@U0C9380GASU> (@Rohith D - Admin / Project Lead), <@U0C846MT30D> (@Dachepally - Frontend Developer), <@U0C7TNSNS5D> (@Nithish gajjela - Backend Developer / System Designer)`;
    }

    // Default slack_text to slack_dm_text for single-step compatibility
    slack_text = slack_dm_text;

    // Persist run state in runs and audit_log
    await updateRunState(run_id, {
      project_id,
      decision,
      rule_id,
      status: decision === "ASK" ? "awaiting_approval" : decision === "ACT" ? "running" : "escalated",
      required_role: requiredRole,
    });

    const mode = body.mode || active?.mode || (process.env.EXECUTION_MODE === "LIVE" ? "LIVE" : "SIMULATION");

    await updateRunState(run_id, {
      decision,
      rule_id,
      required_role: requiredRole,
      target_service: targetService,
      mode,
      status: decision === "ASK" ? "awaiting_approval" : decision === "ACT" ? "running" : "escalated",
    });

    await recordAuditLog({
      project_id,
      actor: "workato:ir-orchestrator",
      action: "policy_evaluated",
      target: run_id,
      detail: { decision, rule_id, recommended_action, assessment_status, assignedSlackId, category, deadline, mode },
    });

    // Optionally update agent_runs if present in Supabase
    try {
      const supabase = createClient();
      await supabase.from("agent_runs").update({
        decision,
        rule_ids: [rule_id],
        status: decision === "ASK" ? "awaiting_approval" : decision === "ACT" ? "executing" : "escalated",
      }).eq("id", run_id);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      run_id,
      project_id,
      incident_id,
      decision,
      action: recommended_action,
      fallback_action,
      rule_id,
      ruleId: rule_id,
      required_role: requiredRole,
      policy_version: "v2-policy",
      reason,
      slack_text,
      slack_dm_text,
      slack_channel_summary,
      category,
      category_confidence: categoryConfidence,
      deadline,
      mode,
      assigned_user_slack_id: assignedSlackId,
      assigned_user_name: assignedHandle.replace(/^@/, ""),
      assigned_user_role: assignedRole,
      slack_destination_type: body.slack_destination_type || "USER_DM",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Policy Decision Error:", err);
    return NextResponse.json({ error: err.message || "Failed to evaluate policy" }, { status: 500 });
  }
}
