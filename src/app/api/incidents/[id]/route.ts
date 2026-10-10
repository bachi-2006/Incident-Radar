import { NextRequest, NextResponse } from "next/server";
import { getIncident, getEventsByIncident } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const incident = await getIncident(id);
    if (!incident) {
      return NextResponse.json({ success: false, error: "Incident not found" }, { status: 404 });
    }
    const events = await getEventsByIncident(id);
    return NextResponse.json({ success: true, data: { ...incident, events } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
