import { NextRequest, NextResponse } from "next/server";
import { setActiveRun } from "@/lib/run-state";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenario = (body.scenario || "act").toLowerCase();
    const timestamp = Date.now();

    const webhookUrl =
      process.env.WORKATO_ORCHESTRATOR_WEBHOOK_URL ||
      "https://webhooks.workato.com/webhooks/rest/94a2eaec-691c-42c0-a038-92d9e61f7150/ir-orchestrator";
    const secret =
      process.env.WORKATO_SHARED_SECRET ||
      "83ea2f004e0a8204c943192a99b1116e252b3360dadb7d337f4282a0d530741d";

    let run_id = `run_act_${timestamp}`;
    let incident_id = `inc_payment_spike_${timestamp}`;
    let evidence = [
      { item: "Error rate 42.5% in payment-gateway service since deploy v2.4.1" },
      { item: "Database latency normal (12ms), network healthy" },
      { item: "CheckoutController.processPayment NPE introduced in deploy v2.4.1" },
    ];
    let permitted_actions = [
      "rollback_latest_deploy",
      "disable_demo_feature_flag",
      "restart_demo_service",
    ];

    if (scenario === "ask") {
      run_id = `run_ask_${timestamp}`;
      incident_id = `inc_memory_leak_${timestamp}`;
      evidence = [
        { item: "Memory consumption climbing gradually across cluster over 48 hours" },
        { item: "No recent deployments in the last 3 days" },
        { item: "Intermittent 504 timeouts across 4 different unrelated microservices" },
        { item: "No core dumps or error logs captured" },
      ];
      permitted_actions = ["restart_demo_service", "disable_demo_feature_flag"];
    } else if (scenario === "notify") {
      run_id = `run_notify_${timestamp}`;
      incident_id = `inc_contradictory_${timestamp}`;
      evidence = [
        { item: "Database CPU spiked to 99% on primary instance" },
        { item: "Query execution latency is nominal at 2.1ms (no slow query logs)" },
        { item: "Auth gateway rejects 80% requests but external ingress shows zero traffic" },
        { item: "Conflicting health signals reported across cluster nodes" },
      ];
      permitted_actions = ["restart_demo_service"];
    }

    setActiveRun(run_id, incident_id, scenario as "act" | "ask" | "notify");

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IR-Secret": secret,
      },
      body: JSON.stringify({
        run_id,
        incident_id,
        evidence,
        permitted_actions,
      }),
    });

    if (!res.ok) {
      throw new Error(`Workato webhook responded with HTTP ${res.status}`);
    }

    const responseData = await res.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      scenario,
      run_id,
      incident_id,
      workato_response: responseData,
      message: `Triggered Workato orchestrator for scenario '${scenario.toUpperCase()}'. Check Slack #all-incident-radar in ~10 seconds!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
