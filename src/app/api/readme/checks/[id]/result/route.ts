import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { checkStructural, computeVerdictAndScore, SemanticResult } from "../../../../../../../readme-checker";
import { generateApprovalToken } from "@/lib/approval-token";
import { supabaseAdmin } from "@/lib/supabase";
import fs from "fs";
import path from "path";

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
    const { semantic } = body;

    const readmePath = path.join(process.cwd(), "README.md");
    let readmeText = "";
    if (fs.existsSync(readmePath)) {
      readmeText = fs.readFileSync(readmePath, "utf-8");
    }

    const structural = checkStructural(readmeText);
    const { verdict, score, changeRequests } = computeVerdictAndScore(structural, semantic as SemanticResult);

    const assignmentId = `asgn_rdm_${Date.now()}`;
    const token = generateApprovalToken(assignmentId);
    const baseUrl = process.env.APP_BASE_URL || "https://incident-radar.onrender.com";

    let slackMessage = "";
    if (verdict === "pass") {
      slackMessage = `✅ *README Approved!* (Score: ${score}/100)\nAll compliance requirements satisfied.`;
    } else {
      const itemsText = changeRequests.map((cr) => `• *${cr.section}*: ${cr.issue} (${cr.suggested_fix})`).join("\n");
      const fixLink = `${baseUrl}/readme`;
      slackMessage = `⚠️ *README Compliance Failed* (Score: ${score}/100)\nPlease address the following change requests:\n${itemsText}\n\nView details: ${fixLink}`;
    }

    if (supabaseAdmin) {
      try {
        await (supabaseAdmin as any).from("readme_checks").update({
          verdict,
          score,
          semantic,
        }).eq("id", id);
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      check_id: id,
      verdict,
      score,
      change_requests: changeRequests,
      notify: [
        {
          slack_user_id: "U0C9380GASU",
          name: "Rohith D",
          role: "admin",
        },
      ],
      duplicate: false,
      slack_message: slackMessage,
      completed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to finalize README check result" }, { status: 500 });
  }
}
