import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import {
  computeRuleScores,
  combineCategoryScores,
  computeCandidateFit,
  computeAssignmentConfidence,
  getDecisionTier,
  calculateSlaDeadlines,
  MemberProfile,
} from "../../../../../../assignment-engine";
import { DEMO_MEMBERS } from "../../../../../../scripts/seed-team";
import { generateApprovalToken } from "@/lib/approval-token";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { genie_probabilities, rationale = "Classified based on stack trace files and client signals" } = body;

    const evidence = {
      messages: ["NullPointer in CheckoutController.processPayment at CheckoutController.java:42"],
      files: ["src/components/CheckoutButton.tsx", "src/app/api/checkout/route.ts"],
      silent_kinds: ["dead_click"],
    };

    if (id.includes("memory") || id.includes("ask")) {
      evidence.messages = ["Memory consumption climbing gradually across cluster over 48 hours"];
      evidence.files = ["infra/docker-compose.yml", "src/lib/worker.ts"];
      evidence.silent_kinds = [];
    }

    const ruleScores = computeRuleScores(evidence);
    const combined = combineCategoryScores(ruleScores, genie_probabilities);

    const candidates = DEMO_MEMBERS.map((m) => {
      const fitResult = computeCandidateFit(m as unknown as MemberProfile, combined.topCategory);
      const conf = computeAssignmentConfidence(combined.confidence, fitResult.fit);
      return {
        ...fitResult,
        confidence: conf,
      };
    }).sort((a, b) => b.confidence - a.confidence);

    const topCandidate = candidates[0];
    const decision = getDecisionTier(topCandidate.confidence);

    const scale = Number(process.env.SLA_TIME_SCALE) || 1;
    const { ackDueAt, dueAt } = calculateSlaDeadlines("high", scale);

    const assignmentId = `asgn_${Date.now()}`;
    const token = generateApprovalToken(assignmentId);
    const baseUrl = process.env.APP_BASE_URL || "https://incident-radar.onrender.com";

    const ackLink = `${baseUrl}/a/${assignmentId}?action=ack&t=${token}`;
    const declineLink = `${baseUrl}/a/${assignmentId}?action=decline&t=${token}`;
    const extendLink = `${baseUrl}/a/${assignmentId}?action=extend&t=${token}`;

    const slackMessage = `🎯 *You've been assigned: Incident Triage* (${combined.topCategory}, High)\n` +
      `• Confidence *${topCandidate.confidence}*: ${topCandidate.display_name} (${topCandidate.breakdown.skill * 5}/5 skill)\n` +
      `• Ack by: ${ackDueAt.toLocaleTimeString("en-IN")} IST | Due: ${dueAt.toLocaleDateString("en-IN")}\n` +
      `• Actions: <${ackLink}|Acknowledge> | <${declineLink}|Decline> | <${extendLink}|Request Extension>`;

    if (supabaseAdmin) {
      try {
        await (supabaseAdmin as any).from("issue_classifications").upsert({
          incident_id: id,
          category: combined.topCategory,
          secondary_category: combined.secondaryCategory,
          category_confidence: combined.confidence,
          probabilities: combined.composite,
          rule_scores: ruleScores,
          genie_probabilities,
          rationale,
        });

        await (supabaseAdmin as any).from("assignments").insert({
          id: assignmentId,
          project_id: "00000000-0000-0000-0000-000000000002",
          kind: "incident",
          incident_id: id,
          category: combined.topCategory,
          assignee_id: topCandidate.user_id,
          confidence: topCandidate.confidence,
          breakdown: topCandidate.breakdown,
          candidates: candidates.slice(0, 3),
          decision,
          status: decision === "auto" ? "assigned" : "proposed",
          ack_due_at: ackDueAt.toISOString(),
          due_at: dueAt.toISOString(),
        });
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      incident_id: id,
      category: combined.topCategory,
      secondary_category: combined.secondaryCategory,
      category_confidence: combined.confidence,
      decision,
      assignment: {
        id: assignmentId,
        assignee: topCandidate,
        ack_due_at: ackDueAt.toISOString(),
        due_at: dueAt.toISOString(),
      },
      candidates: candidates.slice(0, 3),
      slack_message: slackMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process classification" }, { status: 500 });
  }
}
