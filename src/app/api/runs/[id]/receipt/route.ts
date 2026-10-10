import { NextRequest, NextResponse } from "next/server";
import { generateRecoveryReceipt } from "@/lib/receipt";
import { getRunById } from "@/lib/run-state";

async function handleReceiptRequest(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { id } = await paramsPromise;
    const { searchParams } = new URL(req.url);
    const runId = id || searchParams.get("id");

    if (!runId) {
      return NextResponse.json(
        { error: { code: "MISSING_ID", message: "Run ID is required" } },
        { status: 400 }
      );
    }

    const run = await getRunById(runId);
    if (!run) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Run '${runId}' not found` } },
        { status: 404 }
      );
    }

    const result = await generateRecoveryReceipt(runId);

    return NextResponse.json({
      success: true,
      run_id: runId,
      receipt_sha256: result.hash,
      receipt: result.receipt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleReceiptRequest(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleReceiptRequest(req, params);
}
