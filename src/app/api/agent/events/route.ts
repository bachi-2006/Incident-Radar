import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    const configuredSecret = process.env.WORKATO_SHARED_SECRET;

    if (configuredSecret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid X-IR-Secret" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { run_id, step_key, actor = "workato", status = "completed", error } = body;

    console.log(`[Agent Event] Run: ${run_id} | Step: ${step_key} | Status: ${status}`, error ? `Error: ${error}` : "");

    return NextResponse.json({
      success: true,
      run_id,
      step_key: step_key || "event_logged",
      logged_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log agent event" }, { status: 500 });
  }
}
