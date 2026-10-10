import { NextRequest, NextResponse } from "next/server";
import { upsertIncidentBundle } from "@/lib/ingest";
import type { AgentIncidentPayload } from "@/lib/mappers";

export async function POST(req: NextRequest) {
  try {
    const payload: AgentIncidentPayload = await req.json();
    if (!payload.incident_id && !(payload as any).id) {
      return NextResponse.json({ success: false, error: "Missing incident_id" }, { status: 400 });
    }

    const normalizedPayload: AgentIncidentPayload = {
      ...payload,
      incident_id: payload.incident_id || (payload as any).id,
      incident_title: payload.incident_title || (payload as any).title || "Untitled Incident",
    };

    const saved = await upsertIncidentBundle(normalizedPayload);
    return NextResponse.json(
      {
        success: true,
        source: "supabase",
        incident_id: saved.id,
        data: saved,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API /api/ingest error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
