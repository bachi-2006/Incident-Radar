import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service") || undefined;
    const source = searchParams.get("source") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const search = searchParams.get("search") || undefined;

    const events = await getEvents({ service, source, severity, search });
    return NextResponse.json({ success: true, count: events.length, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
