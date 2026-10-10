import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    // In demo mode, return structured sample reminders if any are pending
    const sampleReminders = [
      {
        reminder_id: 1,
        assignment_id: "asgn_demo_1",
        kind: "ack_1",
        recipient_slack_id: "U02PRIYAFRONT",
        channel: "#all-incident-radar",
        text: "⏰ *Reminder*: Please acknowledge assignment for Checkout button issue.",
      },
    ];

    return NextResponse.json({
      reminders: sampleReminders,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch due reminders" }, { status: 500 });
  }
}
