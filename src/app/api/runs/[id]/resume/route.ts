import { NextRequest, NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/approval-token";
import { getRunById, updateRunState, recordAuditLog } from "@/lib/run-state";
import { checkProjectPermission } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { decision, token, approver_user_id, approver_slack_user_id } = body;

    if (!decision || !["approve", "reject"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json({ error: "Missing approval token" }, { status: 400 });
    }

    // 1. Cryptographically verify token validity, expiration, and runId binding
    const verification = verifyApprovalToken(token, id);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || "Invalid approval token" },
        { status: 403 }
      );
    }

    const run = await getRunById(id);
    if (!run) {
      return NextResponse.json({ error: `Run '${id}' not found` }, { status: 404 });
    }

    // 2. Check single-use token replay protection
    if (run.approval_token_hash && run.approval_token_hash === verification.tokenHash) {
      return NextResponse.json(
        { error: "This approval link has already been used" },
        { status: 409 }
      );
    }

    // 3. RBAC validation if approver identity is provided
    const requiredRole = verification.payload?.requiredRole || (run as any)?.required_role || "responder";
    let effectiveActor = approver_user_id || approver_slack_user_id || "authorized_responder";

    if (approver_slack_user_id || (approver_user_id && approver_user_id !== "user_demo")) {
      const perm = await checkProjectPermission({
        projectId: run.project_id || "proj_demo",
        userId: approver_user_id && !approver_user_id.startsWith("U0") ? approver_user_id : undefined,
        slackUserId: approver_slack_user_id || (approver_user_id?.startsWith("U0") ? approver_user_id : undefined),
        requiredRole,
      });

      if (!perm.allowed) {
        return NextResponse.json(
          { error: `Insufficient permissions: ${perm.reason || `Approver requires '${requiredRole}' role`}` },
          { status: 403 }
        );
      }
      effectiveActor = perm.userId || effectiveActor;
    }

    const newStatus = decision === "approve" ? "approved" : "rejected";

    // 4. Update run state
    await updateRunState(id, {
      status: newStatus,
      approval_token_hash: verification.tokenHash,
      approved_by: effectiveActor,
    });

    await recordAuditLog({
      project_id: run.project_id || "proj_demo",
      actor: effectiveActor,
      action: decision === "approve" ? "approval_granted" : "approval_rejected",
      target: id,
      detail: { decision, token_hash: verification.tokenHash, requiredRole },
    });

    // 5. Call Workato ir-resume webhook if configured
    const webhookUrl = process.env.WORKATO_RESUME_WEBHOOK_URL;
    let webhookTriggered = false;

    if (webhookUrl) {
      try {
        const secret = process.env.WORKATO_SHARED_SECRET || "";
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-IR-Secret": secret,
          },
          body: JSON.stringify({
            run_id: id,
            project_id: run.project_id || "proj_demo",
            decision,
            approver_user_id: effectiveActor,
          }),
        });
        webhookTriggered = res.ok;
      } catch (err) {
        console.error("Failed to trigger Workato resume webhook:", err);
      }
    }

    return NextResponse.json({
      success: true,
      run_id: id,
      decision,
      status: newStatus,
      webhook_triggered: webhookTriggered,
      resumed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process resume request" }, { status: 500 });
  }
}
