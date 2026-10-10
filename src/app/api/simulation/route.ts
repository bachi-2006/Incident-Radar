import { NextRequest, NextResponse } from "next/server";
import { getSimulationScenarios, runSimulationScenario } from "@/lib/simulation";

export async function GET() {
  try {
    const scenarios = getSimulationScenarios();
    return NextResponse.json({ success: true, count: scenarios.length, data: scenarios });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenarioId = body.scenarioId || "scenario-payment";
    const result = await runSimulationScenario(scenarioId, {
      tenantId: body.tenantId || "acme-prod",
      noiseCount: body.noiseCount,
    });
    return NextResponse.json({ success: true, scenarioId, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
