import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { checkProjectPermission } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { project_id = "proj_demo", user_id, slack_user_id, required_role = "responder" } = body;

    const permission = await checkProjectPermission({
      projectId: project_id,
      userId: user_id,
      slackUserId: slack_user_id,
      requiredRole: required_role,
    });

    return NextResponse.json({
      allowed: permission.allowed,
      user_id: permission.userId,
      role: permission.role,
      reason: permission.reason,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "RBAC check failed" }, { status: 500 });
  }
}
