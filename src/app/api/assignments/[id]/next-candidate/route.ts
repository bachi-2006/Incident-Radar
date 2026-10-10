import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { DEMO_MEMBERS } from "../../../../../../scripts/seed-team";

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
    const nextCandidate = DEMO_MEMBERS[2];

    const slackMessage = `🔄 *Assignment Reassigned*\nNext candidate: ${nextCandidate.display_name} (Confidence 78)`;

    return NextResponse.json({
      exhausted: false,
      assignment_id: id,
      next_candidate: nextCandidate,
      slack_message: slackMessage,
      reassigned_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch next candidate" }, { status: 500 });
  }
}
