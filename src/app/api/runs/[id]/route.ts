import { NextRequest, NextResponse } from "next/server";
import { getRunById } from "@/lib/run-state";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await getRunById(id);

    if (!run) {
      return NextResponse.json({ error: `Run '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, run });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch run" }, { status: 500 });
  }
}
