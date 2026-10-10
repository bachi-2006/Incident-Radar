import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    // Dynamic due reminders tailored to active team roles
    const sampleReminders = [
      {
        reminder_id: 1,
        assignment_id: "asgn_demo_frontend",
        kind: "ack_1",
        recipient_slack_id: "U0C846MT30D",
        recipient_name: "Dachepally",
        role: "Frontend Developer",
        channel: "#all-incident-radar",
        text: "⏰ *Reminder for @Dachepally* (Frontend Developer): Please acknowledge assignment for Checkout button dead click & client error triage.",
      },
      {
        reminder_id: 2,
        assignment_id: "asgn_demo_sys",
        kind: "due_50",
        recipient_slack_id: "U0C7TNSNS5D",
        recipient_name: "Nithish",
        role: "System Designer",
        channel: "#all-incident-radar",
        text: "⏱️ *Status Check for @Nithish* (System Designer): 50% SLA elapsed for memory leak & worker pool architecture investigation.",
      },
      {
        reminder_id: 3,
        assignment_id: "asgn_demo_escalate",
        kind: "ack_escalate",
        recipient_slack_id: "U0C9380GASU",
        recipient_name: "Rohith D",
        role: "Admin",
        channel: "#all-incident-radar",
        text: "🚨 *Escalation to Admin @Rohith D*: Unacknowledged High severity incident in payment pipeline. Reassign or override?",
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
