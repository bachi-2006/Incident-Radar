import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { computeRuleScores } from "../../../../../../assignment-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const { id } = await params;

    let messages = ["NullPointer in CheckoutController.processPayment at CheckoutController.java:42"];
    let files = ["src/components/CheckoutButton.tsx", "src/app/api/checkout/route.ts"];
    let silent_kinds = ["dead_click"];

    if (id.includes("memory") || id.includes("ask")) {
      messages = ["Memory consumption climbing gradually across cluster over 48 hours"];
      files = ["src/lib/worker-pool.ts", "infra/docker-compose.yml"];
      silent_kinds = [];
    } else if (id.includes("notify") || id.includes("db")) {
      messages = ["Database CPU spiked to 99% on primary instance"];
      files = ["supabase/migrations/20261010_init.sql"];
      silent_kinds = [];
    }

    const evidence = { messages, files, silent_kinds };
    const rule_scores = computeRuleScores(evidence);

    return NextResponse.json({
      incident_id: id,
      evidence: {
        summary: messages[0],
        events: messages,
        files,
        silent_kinds,
      },
      rule_scores,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch classification context" }, { status: 500 });
  }
}
