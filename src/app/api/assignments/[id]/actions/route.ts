import { NextRequest, NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/approval-token";
import { recordAuditLog } from "@/lib/run-state";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action, token, reason } = body;

    if (!action || !["ack", "decline", "extend"].includes(action)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    if (token) {
      const verification = verifyApprovalToken(token, id);
      if (!verification.valid) {
        return NextResponse.json({ error: verification.reason || "Invalid action token" }, { status: 403 });
      }
    }

    await recordAuditLog({
      project_id: "00000000-0000-0000-0000-000000000002",
      actor: "assignee",
      action: `assignment_${action}`,
      target: id,
      detail: { action, reason },
    });

    // Notify Workato assignment events webhook if set
    const webhookUrl = process.env.WORKATO_ASSIGNMENT_EVENTS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-IR-Secret": process.env.WORKATO_SHARED_SECRET || "",
          },
          body: JSON.stringify({
            assignment_id: id,
            event: action === "ack" ? "acknowledged" : action === "decline" ? "declined" : "extension_requested",
            actor: "assignee",
            detail: { reason },
          }),
        });
      } catch {
        // Ignored in local mode
      }
    }

    return NextResponse.json({
      success: true,
      assignment_id: id,
      action,
      status: action === "ack" ? "acknowledged" : action === "decline" ? "declined" : "extension_requested",
      processed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process assignment action" }, { status: 500 });
  }
}
