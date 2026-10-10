import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { run_id } = body;

    if (!run_id) {
      return Response.json({ error: { code: 'MISSING_PARAMS', message: 'run_id is required' } }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Fetch current telemetry from the demo service
    // In a real app, this would be: await fetch(`${process.env.PAYMENT_DEMO_URL}/metrics`)
    // For the demo, we simulate telemetry based on the run state
    const { data: run } = await supabase.from('agent_runs').select('*').eq('id', run_id).single();
    if (!run) return Response.json({ error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } }, { status: 404 });

    // Simulation Logic:
    // If the run is 'verifying' and we've had a 'succeeded' action, we gradually improve metrics
    const isRecovering = run.status === 'verifying';
    const errorRate = isRecovering ? Math.random() * 0.05 : 0.15; // Healthy if < 0.02
    const p95Latency = isRecovering ? 120 + Math.random() * 50 : 400 + Math.random() * 200;

    const healthStatus = (errorRate < 0.02 && p95Latency <= 180) ? 'healthy' : 'unhealthy';

    // 2. Persist the sample
    const { data: sample, error: sampleError } = await supabase
      .from('recovery_samples')
      .insert({
        run_id: run_id,
        error_rate: errorRate,
        p95_latency: p95Latency,
        health_status: healthStatus,
        source: 'demo-service-metrics'
      })
      .select()
      .single();

    if (sampleError) throw sampleError;

    // 3. Calculate the streak of consecutive healthy samples
    const { data: samples } = await supabase
      .from('recovery_samples')
      .select('health_status')
      .eq('run_id', run_id)
      .order('created_at', { ascending: false });

    let streak = 0;
    for (const s of (samples || [])) {
      if (s.health_status === 'healthy') streak++;
      else break;
    }

    // 4. Determine Verdict
    let verdict = 'not_recovered';
    if (streak >= 3) {
      verdict = 'recovered';
    } else if (streak > 0) {
      verdict = 'recovering';
    }

    // 5. Update Run Status if recovered
    if (verdict === 'recovered') {
      await supabase.from('agent_runs')
        .update({ status: 'resolved', end_time: new Date().toISOString() })
        .eq('id', run_id);

      await supabase.from('agent_steps').insert({
        run_id: run_id,
        step_key: 'verifier.resolved',
        actor: 'system',
        action: 'verify_recovery',
        status: 'succeeded',
        reason: 'Three consecutive healthy samples observed'
      });
    }

    return Response.json({
      verdict,
      streak,
      current_sample: { errorRate, p95Latency, healthStatus },
      resolved: verdict === 'recovered'
    });

  } catch (error: any) {
    console.error('Verifier Error:', error);
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
