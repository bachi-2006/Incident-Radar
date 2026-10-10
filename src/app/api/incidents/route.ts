import { NextRequest, NextResponse } from "next/server";
import { getIncidents } from "@/lib/api";
import { upsertIncidentBundle } from "@/lib/ingest";

export async function GET() {
  try {
    const incidents = await getIncidents();
    return NextResponse.json({ success: true, count: incidents.length, data: incidents });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      incident_id: body.incident_id || body.id || `INC-${Date.now()}`,
      incident_title: body.incident_title || body.title || "Untitled Incident",
    };

    const saved = await upsertIncidentBundle(payload);
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
