import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, slack_user_id } = body;

    if (!user_id || !slack_user_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id and slack_user_id" },
        { status: 400 }
      );
    }

    if (supabaseAdmin) {
      const { error } = await (supabaseAdmin as any)
        .from("profiles")
        .update({ slack_user_id })
        .eq("id", user_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      user_id,
      slack_user_id,
      linked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to link Slack profile" }, { status: 500 });
  }
}
