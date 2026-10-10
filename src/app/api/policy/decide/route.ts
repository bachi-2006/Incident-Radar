import { createClient } from '@/lib/supabase';
import { calculateEvidenceGrade, evaluatePolicy, POLICY_VERSION } from '@/lib/policy';
interface TriageData {
  assessment_status: 'supported' | 'uncertain' | 'contradictory' | 'insufficient_data';
  candidate_cause: string;
  evidence_for: string[];
  evidence_against: string[];
  missing_evidence: string[];
  recommended_action: string;
  fallback_action?: string;
  reasoning_summary: string;
  limitations: string[];
}

function parseTriage(input: any): { success: boolean; data: TriageData } {
  if (!input || typeof input !== 'object') {
    return { success: false, data: {} as TriageData };
  }
  const validStatuses = ['supported', 'uncertain', 'contradictory', 'insufficient_data'];
  const status = validStatuses.includes(input.assessment_status) ? input.assessment_status : 'uncertain';
  return {
    success: true,
    data: {
      assessment_status: status as any,
      candidate_cause: String(input.candidate_cause || input.likely_cause || 'Unknown cause'),
      evidence_for: Array.isArray(input.evidence_for) ? input.evidence_for.map(String) : [],
      evidence_against: Array.isArray(input.evidence_against) ? input.evidence_against.map(String) : [],
      missing_evidence: Array.isArray(input.missing_evidence) ? input.missing_evidence.map(String) : [],
      recommended_action: String(input.recommended_action || 'rollback_latest_deploy'),
      fallback_action: input.fallback_action ? String(input.fallback_action) : undefined,
      reasoning_summary: String(input.reasoning_summary || ''),
      limitations: Array.isArray(input.limitations) ? input.limitations.map(String) : [String(input.limitations || '')],
    }
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { run_id, triage_output } = body;

    if (!run_id || !triage_output) {
      return Response.json({ error: { code: 'MISSING_PARAMS', message: 'run_id and triage_output are required' } }, { status: 400 });
    }

    // 1. Validate Genie Output
    const parsedTriage = parseTriage(triage_output);
    if (!parsedTriage.success) {
      return Response.json({ error: { code: 'INVALID_TRIAGE', message: 'Genie output failed schema validation' } }, { status: 400 });
    }

    const supabase = createClient();

    // 2. Fetch Canonical Evidence for this run
    const { data: run } = await supabase.from('agent_runs').select('incident_id').eq('id', run_id).single();
    if (!run) return Response.json({ error: { code: 'RUN_NOT_FOUND', message: 'Run ID not found' } }, { status: 404 });

    const { data: evidence } = await supabase.from('events').select('*').eq('incident_id', run.incident_id);
    if (!evidence) return Response.json({ error: { code: 'NO_EVIDENCE', message: 'No events found for incident' } }, { status: 500 });

    // 3. Fetch Current Settings
    const { data: settings } = await supabase.from('settings').select('*').eq('id', 'global_settings').single();

    // 4. Determine Grade and Decision
    const grade = calculateEvidenceGrade(evidence);
    const policyResult = evaluatePolicy(grade, parsedTriage.data.recommended_action, {
      killSwitch: settings?.kill_switch ?? false,
      dryRun: settings?.dry_run ?? false,
    });

    // 5. Persist Decision to Run
    await supabase.from('agent_runs').update({
      decision: policyResult.decision,
      policy_version: POLICY_VERSION,
      rule_ids: [policyResult.ruleId],
      triage_json: parsedTriage.data,
      status: policyResult.decision === 'ASK' ? 'awaiting_approval' :
              policyResult.decision === 'ACT' ? 'executing' : 'escalated'
    }).eq('id', run_id);

    // 6. If ASK, create Approval record
    if (policyResult.decision === 'ASK') {
      await supabase.from('approvals').insert({
        run_id: run_id,
        action_type: parsedTriage.data.recommended_action,
        summary: parsedTriage.data.reasoning_summary,
        evidence_ids: parsedTriage.data.evidence_for,
        policy_version: POLICY_VERSION,
        expiry_time: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
      });
    }

    // 7. Log Step
    await supabase.from('agent_steps').insert({
      run_id: run_id,
      step_key: 'policy.decided',
      actor: 'system',
      action: 'evaluate_policy',
      status: 'succeeded',
      reason: policyResult.reason,
      summary: { grade, ruleId: policyResult.ruleId }
    });

    // Determine assigned user mention based on triage context
    let assignedSlackId = "U01ROHITHADMIN";
    let assignedRole = "Admin / Project Lead";
    let assignedHandle = "@Rohith D";

    const causeLower = parsedTriage.data.candidate_cause.toLowerCase();
    const action = parsedTriage.data.recommended_action;

    if (action === "rollback_latest_deploy" || causeLower.includes("frontend") || causeLower.includes("click") || causeLower.includes("checkout")) {
      assignedSlackId = "U02DACHEPALLY";
      assignedRole = "Frontend Developer";
      assignedHandle = "@Dachepally";
    } else if (causeLower.includes("memory") || causeLower.includes("cluster") || causeLower.includes("infrastructure") || causeLower.includes("oom")) {
      assignedSlackId = "U03NITHISHSYS";
      assignedRole = "System Designer";
      assignedHandle = "@Nithish gajjela";
    }

    let slack_text = "";
    if (policyResult.decision === "ASK") {
      slack_text = `⚠️ *Incident Radar — Human Approval Required*\n<@${assignedSlackId}> (${assignedHandle} - ${assignedRole}): Confidence requires human sign-off. Please review and approve remediation action \`${action}\`.\n👉 *Approval URL*: https://incident-radar.onrender.com/approve/${run_id}\n*Cause*: ${parsedTriage.data.candidate_cause}`;
    } else if (policyResult.decision === "ACT") {
      slack_text = `🚨 *Incident Radar — Autonomous Remediation*\n<@${assignedSlackId}> (${assignedHandle} - ${assignedRole}): Assessment supported (${parsedTriage.data.candidate_cause}). Auto-remediating with action: \`${action}\`.`;
    } else {
      slack_text = `🛑 *Incident Radar — Investigation Escalated*\nRoot cause ambiguous (${parsedTriage.data.candidate_cause}). Paging on-call team:\n• <@U02DACHEPALLY> (@Dachepally - Frontend Developer)\n• <@U03NITHISHSYS> (@Nithish gajjela - System Designer)\n• <@U01ROHITHADMIN> (@Rohith D - Admin)`;
    }

    return Response.json({
      run_id,
      decision: policyResult.decision,
      action: parsedTriage.data.recommended_action,
      fallback_action: parsedTriage.data.fallback_action,
      rule_id: policyResult.ruleId,
      ruleId: policyResult.ruleId,
      grade: grade,
      reason: policyResult.reason,
      slack_text,
      assigned_user_slack_id: assignedSlackId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Policy Decision Error:', error);
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
