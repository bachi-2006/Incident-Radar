import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { run_id, role } = body; // role: 'primary' | 'fallback'

    if (!run_id || !role) {
      return Response.json({ error: { code: 'MISSING_PARAMS', message: 'run_id and role are required' } }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Load Run and State
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .select('*, incidents(id)')
      .eq('id', run_id)
      .single();

    if (runError || !run) {
      return Response.json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } }, { status: 404 });
    }

    // 2. Safety Check: Is the run in a state that permits execution?
    if (run.status !== 'executing' && run.status !== 'verifying') {
      return Response.json({ error: { code: 'INVALID_STATE', message: `Cannot execute action in state ${run.status}` } }, { status: 400 });
    }

    // 3. Authorization Check: Resolve action from the Triage JSON
    const triage = run.triage_json as any;
    const actionToExecute = role === 'primary' ? triage.recommended_action : triage.fallback_action;

    if (!actionToExecute) {
      return Response.json({ error: { code: 'NO_ACTION', message: 'No authorized action found for this role' } }, { status: 400 });
    }

    // 4. Policy Re-Check (The Final Gate)
    const { data: settings } = await supabase.from('settings').select('*').eq('id', 'global_settings').single();
    if (settings?.kill_switch) {
      return Response.json({ error: { code: 'KILL_SWITCH', message: 'Execution blocked by global kill switch' } }, { status: 403 });
    }

    // 5. Approval Check (If the run was an 'ASK')
    if (run.decision === 'ASK') {
      const { data: approval } = await supabase
        .from('approvals')
        .select('*')
        .eq('run_id', run_id)
        .eq('decision', 'approved')
        .single();

      if (!approval || new Date(approval.expiry_time) < new Date()) {
        return Response.json({ error: { code: 'UNAUTHORIZED', message: 'No valid, unexpired approval found' } }, { status: 403 });
      }
    }

    // 6. Idempotency Reservation
    const idempotencyKey = `${run_id}-${role}`;
    const { error: idemError } = await supabase
      .from('action_executions')
      .insert({
        run_id: run_id,
        action_type: actionToExecute,
        role: role,
        idempotency_key: idempotencyKey,
        status: 'executing'
      });

    if (idemError) {
      // If it's a unique constraint violation, the action is already running/done
      if (idemError.code === '23505') {
        return Response.json({ status: 'duplicate', message: 'Action already executing or completed' }, { status: 200 });
      }
      throw idemError;
    }

    // 7. Execute against Demo Service (Simulation for now, but structured for API call)
    let executionResult = 'succeeded';
    if (settings?.dry_run) {
      executionResult = 'simulated';
    } else {
      // In a real scenario: await fetch(`${process.env.PAYMENT_DEMO_URL}/internal/${actionToExecute}`, ...)
      // For the demo, we simulate a 5% failure rate for "Primary" actions to test Fallbacks
      if (role === 'primary' && Math.random() < 0.05) {
        executionResult = 'failed';
      }
    }

    // 8. Update Execution Record
    await supabase.from('action_executions')
      .update({ status: executionResult === 'succeeded' ? 'succeeded' : 'failed', result: executionResult })
      .eq('idempotency_key', idempotencyKey);

    // 9. Log Step
    await supabase.from('agent_steps').insert({
      run_id: run_id,
      step_key: `action.${role}.executed`,
      actor: 'gateway',
      action: actionToExecute,
      status: executionResult,
      reason: executionResult === 'succeeded' ? 'Action executed successfully' : 'Action failed'
    });

    return Response.json({
      status: executionResult,
      action: actionToExecute,
      execution_id: idempotencyKey
    });

  } catch (error: any) {
    console.error('Gateway Error:', error);
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
