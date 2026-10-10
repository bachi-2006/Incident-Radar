import { NextRequest, NextResponse } from "next/server";
import { getIncident } from "@/lib/api";
import { callLyzrAgent } from "@/lib/lyzr";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { incidentId, question } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: "Question is required" }, { status: 400 });
    }

    let incidentContext = "";
    if (incidentId) {
      const incident = await getIncident(incidentId);
      if (incident) {
        incidentContext = `\nINCIDENT CONTEXT:\n- Title: ${incident.title}\n- Service: ${incident.service}\n- Root Cause: ${incident.rootCause}\n- Confidence: ${incident.confidence}%\n- Affected: ${incident.affectedServices.join(", ")}`;
      }
    }

    const prompt = `You are the AI SRE Copilot for Incident Radar.${incidentContext}\n\nUser Question: ${question}\n\nProvide an accurate, concise, evidence-grounded response.`;
    const responseText = await callLyzrAgent(prompt);

    return NextResponse.json({
      success: true,
      answer: responseText,
      provider: "ai",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

