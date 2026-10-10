import { NextRequest, NextResponse } from "next/server";
import { setActiveRun } from "@/lib/run-state";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-IR-Secret, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

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
    let assignedSlackId = "U01ROHITHADMIN";
    let assignedName = "Rohith D";

    // 1. FRONTEND ACT: Dead Click / UI Freeze -> @Dachepally
    if (scenario === "fe_act" || scenario === "frontend_act" || scenario === "dead_click") {
      run_id = `run_fe_act_${timestamp}`;
      incident_id = `inc_fe_dead_click_${timestamp}`;
      evidence = [
        { item: "Dead click: User clicked button#pay-button 4x with zero DOM mutations" },
        { item: "Client hydration exception on /checkout at bundle chunk-4bd1b696.js" },
        { item: "Canary deploy fe-v1.8.2 introduced React state freeze on payment form" },
      ];
      permitted_actions = ["rollback_latest_deploy", "disable_demo_feature_flag"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    }
    // 2. BACKEND ACT: Database Pool Exhaustion NPE -> @Rahul Verma
    else if (scenario === "be_act" || scenario === "backend_act" || scenario === "database") {
      run_id = `run_be_act_${timestamp}`;
      incident_id = `inc_be_db_exhaustion_${timestamp}`;
      evidence = [
        { item: "CheckoutController.processPayment NullPointerException in deploy v2.4.1" },
        { item: "PostgreSQL connection pool saturated at 98% (max_connections 100 reached)" },
        { item: "Downstream API response latency surged from 45ms to 2400ms" },
      ];
      permitted_actions = ["rollback_latest_deploy", "restart_demo_service"];
      assignedSlackId = "U04RAHULBACK";
      assignedName = "Rahul Verma";
    }
    // 3. DEVOPS ACT: Canary Health CrashLoop -> @Sam Taylor
    else if (scenario === "devops_act" || scenario === "devops" || scenario === "canary") {
      run_id = `run_devops_act_${timestamp}`;
      incident_id = `inc_devops_canary_${timestamp}`;
      evidence = [
        { item: "Kubernetes worker-pool canary pods failing liveness probe" },
        { item: "Container exit code 137 (OOMKilled by Linux cgroup memory limit)" },
        { item: "Traffic router shifting 100% requests away from degraded canary pods" },
      ];
      permitted_actions = ["restart_demo_service", "rollback_latest_deploy"];
      assignedSlackId = "U05SAMDEVOPS";
      assignedName = "Sam Taylor";
    }
    // 4. SYSTEM ARCHITECTURE ASK: Distributed Telemetry Contradiction -> @Nithish gajjela
    else if (scenario === "sys_ask" || scenario === "system_ask" || scenario === "desync") {
      run_id = `run_sys_ask_${timestamp}`;
      incident_id = `inc_sys_desync_${timestamp}`;
      evidence = [
        { item: "Telemetry contradiction: Ingress reports 2.1ms latency while auth-gateway reports 85% failures" },
        { item: "Distributed session split-brain across region us-east-1 and us-west-2" },
        { item: "Ambiguous root cause between Redis network partition and stale JWT revocation cache" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    }
    // 5. ADMIN / LEAD ASK: 48h Cluster Heap Thrash P1 -> @Rohith D
    else if (scenario === "ask" || scenario === "admin_ask" || scenario === "heap_oom") {
      run_id = `run_ask_${timestamp}`;
      incident_id = `inc_memory_leak_${timestamp}`;
      evidence = [
        { item: "Memory consumption climbing gradually across cluster over 48 hours (92% reached)" },
        { item: "No recent deployments in the last 3 days" },
        { item: "Intermittent 504 timeouts cascading across 4 unrelated downstream microservices" },
        { item: "Multi-service blast radius: remediation restart affects 50,000 active sessions" },
      ];
      permitted_actions = ["restart_demo_service", "disable_demo_feature_flag"];
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
    }
    // 6. GENERAL NOTIFY / ESCALATION
    else if (scenario === "notify") {
      run_id = `run_notify_${timestamp}`;
      incident_id = `inc_contradictory_${timestamp}`;
      evidence = [
        { item: "Database CPU spiked to 99% on primary instance" },
        { item: "Query execution latency is nominal at 2.1ms (no slow query logs)" },
        { item: "Auth gateway rejects 80% requests but external ingress shows zero traffic" },
        { item: "Conflicting health signals reported across cluster nodes" },
      ];
      permitted_actions = ["restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    }

    // Override with explicit client parameters if provided
    if (body.assigned_user_slack_id) assignedSlackId = body.assigned_user_slack_id;
    if (body.assigned_user_name) assignedName = body.assigned_user_name;
    if (Array.isArray(body.evidence) && body.evidence.length > 0) evidence = body.evidence;
    if (Array.isArray(body.permitted_actions) && body.permitted_actions.length > 0) permitted_actions = body.permitted_actions;

    const executionCategory = scenario.includes("ask") ? "ask" : scenario === "notify" ? "notify" : "act";
    setActiveRun(run_id, incident_id, executionCategory);

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
        assigned_user_slack_id: assignedSlackId,
        assigned_user_name: assignedName,
      }),
    });

    if (!res.ok) {
      throw new Error(`Workato webhook responded with HTTP ${res.status}`);
    }

    const responseData = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: true,
        scenario,
        run_id,
        incident_id,
        workato_response: responseData,
        message: `Triggered Workato orchestrator for scenario '${scenario.toUpperCase()}'. Check Slack #all-incident-radar in ~10 seconds!`,
      },
      {
        headers: corsHeaders(),
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
