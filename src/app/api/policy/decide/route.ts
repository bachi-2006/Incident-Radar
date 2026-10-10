import { createClient } from '@/lib/supabase';
import { calculateEvidenceGrade, evaluatePolicy, POLICY_VERSION } from '@/lib/policy';
import { z } from 'zod';

const TriageSchema = z.object({
  assessment_status: z.enum(['supported', 'uncertain', 'contradictory', 'insufficient_data']),
  candidate_cause: z.string(),
  evidence_for: z.array(z.string()),
  evidence_against: z.array(z.string()),
  missing_evidence: z.array(z.string()),
  recommended_action: z.string(),
  fallback_action: z.string().optional(),
  reasoning_summary: z.string(),
  limitations: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { run_id, triage_output } = body;

    if (!run_id || !triage_output) {
      return Response.json({ error: { code: 'MISSING_PARAMS', message: 'run_id and triage_output are required' } }, { status: 400 });
    }

    // 1. Validate Genie Output
    const parsedTriage = TriageSchema.safeParse(triage_output);
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

    return Response.json({
      decision: policyResult.decision,
      ruleId: policyResult.ruleId,
      grade: grade,
      reason: policyResult.reason
    });

  } catch (error: any) {
    console.error('Policy Decision Error:', error);
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
