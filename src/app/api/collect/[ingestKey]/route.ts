import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/run-state";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-IR-Secret, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ingestKey: string }> }
) {
  try {
    const { ingestKey } = await params;
    const body = await req.json().catch(() => ({}));
    // Accept either body.events or body.batch
    const events: any[] = Array.isArray(body.events) ? body.events : Array.isArray(body.batch) ? body.batch : [];

    const processed = events.map((e) => {
      const fpString = `${e.kind || "unknown"}|${(e.message || "").toLowerCase()}|${e.page_path || "/"}`;
      const fingerprint = crypto.createHash("sha256").update(fpString).digest("hex").substring(0, 16);
      return {
        ...e,
        fingerprint,
        occurred_at: e.ts ? new Date(e.ts).toISOString() : new Date().toISOString(),
      };
    });

    // Check if spike threshold met (>= 3 errors)
    const isSpike = processed.length >= 3;

    await recordAuditLog({
      project_id: "00000000-0000-0000-0000-000000000002",
      actor: "browser-sdk",
      action: isSpike ? "client_error_spike_detected" : "client_errors_ingested",
      target: ingestKey,
      detail: { count: processed.length, isSpike, fingerprints: processed.map(p => p.fingerprint) },
    });

    return NextResponse.json(
      {
        success: true,
        ingest_key: ingestKey,
        ingested: processed.length,
        spike_detected: isSpike,
        processed_events: processed,
        processed_at: new Date().toISOString(),
      },
      {
        headers: corsHeaders(),
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to collect client events" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
