import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/run-state";

function verifyGitHubHMAC(payloadText: string, signature: string | null, secret: string): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expectedSig = "sha256=" + crypto.createHmac("sha256", secret).update(payloadText).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const eventType = req.headers.get("x-github-event") || "push";
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify HMAC if secret is configured
    if (secret && !verifyGitHubHMAC(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid GitHub HMAC signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || "{}");
    const projectId = "00000000-0000-0000-0000-000000000002";
    let isActionable = false;
    let eventKind = "push";

    if (eventType === "workflow_run" && payload.workflow_run?.conclusion === "failure") {
      isActionable = true;
      eventKind = "ci_failed";
    } else if (eventType === "deployment_status" && (payload.deployment_status?.state === "failure" || payload.deployment_status?.state === "error")) {
      isActionable = true;
      eventKind = "deploy_failed";
    } else if (eventType === "deployment_status" && payload.deployment_status?.state === "success") {
      eventKind = "deploy_succeeded";
    }

    await recordAuditLog({
      project_id: projectId,
      actor: "github",
      action: `github_webhook:${eventKind}`,
      target: payload.repository?.full_name || "github",
      detail: { eventType, isActionable },
    });

    // Notify Workato ir-github-events recipe if actionable
    const webhookUrl = process.env.WORKATO_GITHUB_EVENTS_WEBHOOK_URL;
    let webhookTriggered = false;

    if (isActionable && webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-IR-Secret": process.env.WORKATO_SHARED_SECRET || "",
          },
          body: JSON.stringify({
            project_id: projectId,
            kind: eventKind,
            sha: payload.workflow_run?.head_sha || payload.deployment?.sha || "head",
            run_url: payload.workflow_run?.html_url || payload.repository?.html_url,
            branch: payload.workflow_run?.head_branch || "main",
          }),
        });
        webhookTriggered = res.ok;
      } catch {
        // Ignored in local mode
      }
    }

    return NextResponse.json({
      success: true,
      event_type: eventType,
      kind: eventKind,
      actionable: isActionable,
      webhook_triggered: webhookTriggered,
      processed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process GitHub webhook" }, { status: 500 });
  }
}
