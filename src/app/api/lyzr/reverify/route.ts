import { NextRequest, NextResponse } from "next/server";
import { getIncident, getEventsByIncident } from "@/lib/api";
import { reverifyIncidentWithLyzr } from "@/lib/lyzr";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incidentId = body.incidentId || body.incident_id || "INC-001";

    const incident = await getIncident(incidentId);
    if (!incident) {
      return NextResponse.json({ success: false, error: `Incident ${incidentId} not found` }, { status: 404 });
    }

    const events = await getEventsByIncident(incidentId);
    const verification = await reverifyIncidentWithLyzr(incident, events);

    return NextResponse.json({
      success: true,
      data: verification,
      incident: incident,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
