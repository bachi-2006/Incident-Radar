import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";

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
    const { kind, slack_ts, channel } = body;

    return NextResponse.json({
      ok: true,
      assignment_id: id,
      kind,
      slack_ts,
      channel,
      recorded_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record reminder" }, { status: 500 });
  }
}
