import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/run-state";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ingestKey: string }> }
) {
  try {
    const { ingestKey } = await params;
    const body = await req.json().catch(() => ({}));
    const events: any[] = body.events || [];

    const processed = events.map((e) => {
      const fpString = `${e.kind}|${e.message?.toLowerCase()}|${e.page_path || "/"}`;
      const fingerprint = crypto.createHash("sha256").update(fpString).digest("hex").substring(0, 16);
      return {
        ...e,
        fingerprint,
      };
    });

    // Check if spike threshold met
    const isSpike = processed.length >= 5;

    await recordAuditLog({
      project_id: "00000000-0000-0000-0000-000000000002",
      actor: "browser-sdk",
      action: isSpike ? "client_error_spike_detected" : "client_errors_ingested",
      target: ingestKey,
      detail: { count: processed.length, isSpike },
    });

    return NextResponse.json({
      success: true,
      ingest_key: ingestKey,
      ingested: processed.length,
      spike_detected: isSpike,
      processed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to collect client events" }, { status: 500 });
  }
}
