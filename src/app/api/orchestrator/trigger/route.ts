import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setActiveRun, recordAuditLog } from "@/lib/run-state";
import {
  computeRuleScores,
  combineCategoryScores,
  computeCandidateFit,
  computeAssignmentConfidence,
  calculateSlaDeadlines,
  MemberProfile,
  EvidenceContext,
} from "../../../../../assignment-engine";
import { DEMO_MEMBERS } from "../../../../../scripts/seed-team";
import { supabaseAdmin } from "@/lib/supabase";

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

    // ==========================================
    // 🎨 FRONTEND INCIDENTS -> @Dachepally (U02DACHEPALLY)
    // ==========================================
    if (scenario === "fe_dead_click" || scenario === "dead_click" || scenario === "fe_act") {
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
    } else if (scenario === "fe_hydration") {
      run_id = `run_fe_hydration_${timestamp}`;
      incident_id = `inc_fe_hydration_${timestamp}`;
      evidence = [
        { item: "React 19 SSR hydration mismatch: server rendered tree did not match client on /checkout" },
        { item: "Payment modal failed to mount; client unhandled exception trapped by window.onerror" },
        { item: "Regression introduced in latest frontend asset build fe-v1.8.2" },
      ];
      permitted_actions = ["rollback_latest_deploy", "disable_demo_feature_flag"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    } else if (scenario === "fe_chunk_404") {
      run_id = `run_fe_chunk_${timestamp}`;
      incident_id = `inc_fe_chunk_404_${timestamp}`;
      evidence = [
        { item: "Loading chunk 1255 failed (404 Not Found) on CDN edge" },
        { item: "Stale cache index.html referencing pruned script hash after deployment rollout" },
        { item: "340 users trapped in White Screen of Death on checkout load" },
      ];
      permitted_actions = ["rollback_latest_deploy", "restart_demo_service"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    } else if (scenario === "fe_quota") {
      run_id = `run_fe_quota_${timestamp}`;
      incident_id = `inc_fe_quota_${timestamp}`;
      evidence = [
        { item: "DOMException: QuotaExceededError in localStorage.setItem('ir_cart_session')" },
        { item: "Unbounded telemetry logging filled 5MB client browser storage budget" },
        { item: "Safe fallback: disable aggressive client telemetry feature flag" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "rollback_latest_deploy"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    } else if (scenario === "fe_calc_drift") {
      run_id = `run_fe_calc_drift_ask_${timestamp}`;
      incident_id = `inc_fe_calc_drift_${timestamp}`;
      evidence = [
        { item: "Checkout calculation drift: floating-point rounding discrepancy on multi-currency tax rate (±0.02)" },
        { item: "Discrepancy observed across 1,200 international orders" },
        { item: "Blast radius uncertain: disabling tax optimization flag requires human sign-off" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    } else if (scenario === "fe_csp_violation") {
      run_id = `run_fe_csp_ask_${timestamp}`;
      incident_id = `inc_fe_csp_${timestamp}`;
      evidence = [
        { item: "Content-Security-Policy directive 'script-src' blocked external payment gateway token loader" },
        { item: "18% checkout submits failing before token exchange" },
        { item: "Modifying security header requires human engineer review" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "rollback_latest_deploy"];
      assignedSlackId = "U02DACHEPALLY";
      assignedName = "Dachepally";
    }

    // ==========================================
    // ⚙️ BACKEND / SYSTEM INCIDENTS -> @Nithish gajjela (U03NITHISHSYS)
    // ==========================================
    else if (scenario === "be_db_pool" || scenario === "be_act" || scenario === "database") {
      run_id = `run_be_db_act_${timestamp}`;
      incident_id = `inc_be_db_pool_${timestamp}`;
      evidence = [
        { item: "PostgreSQL connection pool saturated at 98% (max_connections 100 reached)" },
        { item: "CheckoutController.processPayment waiting >30000ms for db connection" },
        { item: "Correlates directly with deployment of payment-api v2.4.1" },
      ];
      permitted_actions = ["rollback_latest_deploy", "restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_npe") {
      run_id = `run_be_npe_act_${timestamp}`;
      incident_id = `inc_be_npe_${timestamp}`;
      evidence = [
        { item: "NullPointerException at CheckoutController.java:42 processPayment()" },
        { item: "Error rate surged from 0.2% to 42.5% immediately following deploy v2.4.1" },
        { item: "Database and network health nominal (12ms), confirmed application defect" },
      ];
      permitted_actions = ["rollback_latest_deploy", "disable_demo_feature_flag"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_slow_query") {
      run_id = `run_be_slow_query_act_${timestamp}`;
      incident_id = `inc_be_slow_query_${timestamp}`;
      evidence = [
        { item: "Unindexed sequential scan on orders table holding table lock for 4200ms" },
        { item: "Query execution queue backed up to 850 concurrent waiting transactions" },
        { item: "Introduced in recent database schema change script" },
      ];
      permitted_actions = ["rollback_latest_deploy", "restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_redis_oom") {
      run_id = `run_be_redis_act_${timestamp}`;
      incident_id = `inc_be_redis_oom_${timestamp}`;
      evidence = [
        { item: "Redis maxmemory limit reached (2048MB used of 2048MB); OOM command not allowed" },
        { item: "User sessions failing to persist; session token lookup dropping to 0% success" },
        { item: "Safe catalogue remediation: restart cache service with flush policy" },
      ];
      permitted_actions = ["restart_demo_service", "disable_demo_feature_flag"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_auth_desync" || scenario === "sys_ask" || scenario === "desync") {
      run_id = `run_sys_desync_ask_${timestamp}`;
      incident_id = `inc_sys_desync_${timestamp}`;
      evidence = [
        { item: "Telemetry contradiction: Ingress reports 2.1ms latency while auth-gateway reports 85% failures" },
        { item: "Distributed session split-brain across region us-east-1 and us-west-2" },
        { item: "Ambiguous root cause between Redis network partition and stale JWT revocation cache" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_kafka_lag") {
      run_id = `run_be_kafka_ask_${timestamp}`;
      incident_id = `inc_be_kafka_lag_${timestamp}`;
      evidence = [
        { item: "Event stream consumer lag spike: 45,000 uncommitted messages on order-events topic" },
        { item: "Consumer group offset drift growing by 2,000 msg/sec" },
        { item: "Restarting consumer group may cause duplicate message delivery; requires human sign-off" },
      ];
      permitted_actions = ["restart_demo_service", "disable_demo_feature_flag"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    } else if (scenario === "be_504_cascade") {
      run_id = `run_be_504_ask_${timestamp}`;
      incident_id = `inc_be_504_cascade_${timestamp}`;
      evidence = [
        { item: "Downstream banking partner switch intermittent 504 Gateway Timeouts across 4 microservices" },
        { item: "Connection queue backpressure propagating upstream to payment API" },
        { item: "Proposed remediation to disable partner routing flag requires engineer approval" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U03NITHISHSYS";
      assignedName = "Nithish gajjela";
    }

    // ==========================================
    // 👑 ADMIN / PROJECT LEAD INCIDENTS -> @Rohith D (U01ROHITHADMIN)
    // ==========================================
    else if (scenario === "admin_canary_fail" || scenario === "canary") {
      run_id = `run_admin_canary_act_${timestamp}`;
      incident_id = `inc_admin_canary_${timestamp}`;
      evidence = [
        { item: "Canary deployment payment-api v2.4.1 breached 1.0% error rate SLA threshold (actual: 42.5%)" },
        { item: "Automated canary health gate failed 3 consecutive evaluations" },
        { item: "Autonomous catalogue action: roll back canary release to stable v2.4.0" },
      ];
      permitted_actions = ["rollback_latest_deploy", "disable_demo_feature_flag"];
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
    } else if (scenario === "admin_circuit_breaker") {
      run_id = `run_admin_circuit_act_${timestamp}`;
      incident_id = `inc_admin_circuit_${timestamp}`;
      evidence = [
        { item: "Payment Gateway Circuit Breaker state transitioned to OPEN after 50 consecutive failed requests" },
        { item: "100% of checkout payments failing fast with CircuitBreakerOpenException" },
        { item: "Autonomous action: disable demo payment feature flag and route to backup provider" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
    } else if (scenario === "admin_heap_oom" || scenario === "ask" || scenario === "heap_oom") {
      run_id = `run_admin_heap_ask_${timestamp}`;
      incident_id = `inc_admin_heap_oom_${timestamp}`;
      evidence = [
        { item: "Gradual cluster heap memory thrash over 48 hours (92% saturation reached)" },
        { item: "No recent deployments in the last 3 days; leak origin unconfirmed across microservices" },
        { item: "Multi-service blast radius: remediation restart affects 50,000 active sessions (Admin sign-off required)" },
      ];
      permitted_actions = ["restart_demo_service", "disable_demo_feature_flag"];
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
    } else if (scenario === "admin_ddos_spike") {
      run_id = `run_admin_ddos_ask_${timestamp}`;
      incident_id = `inc_admin_ddos_${timestamp}`;
      evidence = [
        { item: "Ingress anomaly: 10,000 req/s concentrated from suspicious IP CIDR pool on /api/payouts" },
        { item: "API Gateway rate limiters saturated; legitimate payout workflows degraded" },
        { item: "Enabling global emergency DDoS mitigation filter requires Admin authorization" },
      ];
      permitted_actions = ["disable_demo_feature_flag", "restart_demo_service"];
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
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
      assignedSlackId = "U01ROHITHADMIN";
      assignedName = "Rohith D";
    }

    // ==========================================
    // Real Area-Based Assignment Engine:
    // Extract evidence text & context to calculate category & candidate fit
    // ==========================================
    if (Array.isArray(body.evidence) && body.evidence.length > 0) evidence = body.evidence;
    if (Array.isArray(body.permitted_actions) && body.permitted_actions.length > 0) permitted_actions = body.permitted_actions;

    const evidenceText = evidence.map((e) => (typeof e === "string" ? e : (e as any).item || "")).join(" ");
    const evidenceContext: EvidenceContext = {
      messages: [evidenceText],
      files: [],
      silent_kinds: [],
      affected_services: ["payment-gateway"],
    };

    if (evidenceText.toLowerCase().includes("dead click") || scenario.includes("dead_click") || scenario.includes("fe_")) {
      evidenceContext.silent_kinds = ["dead_click"];
      evidenceContext.files = ["src/components/CheckoutButton.tsx", "public/bundle.js"];
    } else if (evidenceText.toLowerCase().includes("hydration") || scenario.includes("hydration")) {
      evidenceContext.files = ["src/app/page.tsx", "src/components/PaymentModal.tsx"];
    } else if (evidenceText.toLowerCase().includes("database") || evidenceText.toLowerCase().includes("pool")) {
      evidenceContext.files = ["supabase/migrations/20261010_schema.sql"];
    } else if (evidenceText.toLowerCase().includes("npe") || evidenceText.toLowerCase().includes("controller") || scenario.includes("be_")) {
      evidenceContext.files = ["src/app/api/checkout/route.ts"];
    } else if (evidenceText.toLowerCase().includes("canary") || evidenceText.toLowerCase().includes("deploy")) {
      evidenceContext.files = [".github/workflows/deploy.yml"];
    }

    const ruleScores = computeRuleScores(evidenceContext);
    const combinedScores = combineCategoryScores(ruleScores);
    const calculatedCategory = (body.category || combinedScores.topCategory || "system_architecture").trim().toLowerCase().replace(/\s+/g, "_");

    // Evaluate candidates across our 3-member team based on expertise and fit
    const candidates = DEMO_MEMBERS.map((m) => {
      const fitResult = computeCandidateFit(m as unknown as MemberProfile, calculatedCategory);
      const conf = computeAssignmentConfidence(combinedScores.confidence, fitResult.fit);
      return {
        ...m,
        ...fitResult,
        confidence: conf,
      };
    }).sort((a, b) => b.confidence - a.confidence);

    const topCandidate = candidates[0];

    // Priority: Explicit client param > Top candidate from assignment engine
    if (!body.assigned_user_slack_id && topCandidate) {
      assignedSlackId = topCandidate.slack_user_id;
      assignedName = topCandidate.display_name;
    } else if (body.assigned_user_slack_id) {
      assignedSlackId = body.assigned_user_slack_id;
      if (body.assigned_user_name) assignedName = body.assigned_user_name;
    }
    const assignedRole = topCandidate?.role || "Responder";
    const assignmentId = crypto.randomUUID();
    const { ackDueAt, dueAt } = calculateSlaDeadlines("high");
    const deadlineIso = ackDueAt.toISOString();

    // Persist assignment in Supabase for persistence and auditability
    if (supabaseAdmin) {
      try {
        await (supabaseAdmin as any).from("assignments").upsert({
          id: assignmentId,
          project_id: "00000000-0000-0000-0000-000000000002",
          kind: "incident",
          incident_id,
          category: calculatedCategory,
          assignee_id: topCandidate.id,
          confidence: topCandidate.confidence,
          breakdown: topCandidate.breakdown,
          candidates: candidates.slice(0, 3),
          decision: "auto",
          status: "assigned",
          ack_due_at: deadlineIso,
          due_at: dueAt.toISOString(),
        });

        await recordAuditLog({
          project_id: "00000000-0000-0000-0000-000000000002",
          actor: "assignment-engine",
          action: "incident_assigned",
          target: incident_id,
          detail: {
            assignment_id: assignmentId,
            category: calculatedCategory,
            confidence: topCandidate.confidence,
            assignee_user_id: topCandidate.id,
            assignee_slack_user_id: assignedSlackId,
            assignee_name: assignedName,
            assignee_role: assignedRole,
            deadline: deadlineIso,
          },
        });
      } catch (err: any) {
        // Non-blocking fallback
      }
    }

    const executionCategory = scenario.includes("ask") ? "ask" : scenario === "notify" ? "notify" : "act";
    setActiveRun(run_id, incident_id, executionCategory);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IR-Secret": secret,
      },
      body: JSON.stringify({
        project_id: "00000000-0000-0000-0000-000000000002",
        run_id,
        incident_id,
        category: calculatedCategory,
        category_confidence: Math.round(combinedScores.confidence * 100) / 100,
        evidence,
        permitted_actions,
        assigned_user_slack_id: assignedSlackId,
        assigned_user_name: assignedName,
        assigned_user_role: assignedRole,
        deadline: deadlineIso,
        slack_destination_type: "USER_DM",
        debug_routing_info: `Assignment engine routed category '${calculatedCategory}' (${topCandidate.confidence}% confidence) to ${assignedName} (${assignedSlackId})`,
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
