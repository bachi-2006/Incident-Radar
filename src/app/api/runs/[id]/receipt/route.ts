import { generateRecoveryReceipt } from '@/lib/receipt';
import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('id');

    if (!runId) {
      return Response.json({ error: { code: 'MISSING_ID', message: 'Run ID is required' } }, { status: 400 });
    }

    const supabase = createClient();
    const { data: run } = await supabase.from('agent_runs').select('*').eq('id', runId).single();

    if (!run) {
      return Response.json({ error: { code: 'NOT_FOUND', message: 'Run not found' } }, { status: 404 });
    }

    if (run.status !== 'resolved' && run.status !== 'failed' && run.status !== 'escalated') {
      return Response.json({ error: { code: 'NOT_FINALIZED', message: 'Receipt can only be generated for terminal runs' } }, { status: 400 });
    }

    const result = await generateRecoveryReceipt(runId);

    return Response.json(result);
  } catch (error: any) {
    return Response.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
