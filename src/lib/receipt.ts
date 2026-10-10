import { createClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function generateRecoveryReceipt(runId: string) {
  const supabase = createClient();

  // 1. Fetch all data for the run
  const { data: run } = await supabase.from('agent_runs').select('*, incidents(*)').eq('id', runId).single();
  const { data: steps } = await supabase.from('agent_steps').select('*').eq('run_id', runId).order('timestamp', { ascending: true });
  const { data: executions } = await supabase.from('action_executions').select('*').eq('run_id', runId);
  const { data: samples } = await supabase.from('recovery_samples').select('*').eq('run_id', runId).order('created_at', { ascending: true });

  if (!run) throw new Error('Run not found');

  // 2. Construct canonical receipt object
  const receipt = {
    incident: {
      id: run.incidents?.id,
      title: run.incidents?.title,
      severity: run.incidents?.severity,
    },
    run_metadata: {
      id: run.id,
      scenario: run.scenario,
      mode: run.mode,
      duration: run.end_time ? (new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000 : null,
    },
    policy: {
      version: run.policy_version,
      decision: run.decision,
      rules: run.rule_ids,
    },
    execution_history: executions?.map((e: any) => ({
      action: e.action_type,
      role: e.role,
      status: e.status,
      timestamp: e.created_at
    })),
    verification_evidence: samples?.map((s: any) => ({
      timestamp: s.timestamp,
      error_rate: s.error_rate,
      p95: s.p95_latency,
      status: s.health_status
    })),
    final_outcome: run.status,
    timestamp: new Date().toISOString()
  };

  // 3. Generate Integrity Hash
  const canonicalString = JSON.stringify(receipt);
  const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return {
    receipt,
    hash
  };
}
