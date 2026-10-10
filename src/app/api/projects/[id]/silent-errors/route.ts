import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const { id } = await params;

    const signatures = [
      {
        fingerprint: "fp_dead_click_chk",
        kind: "dead_click",
        count: 28,
        first_seen: new Date(Date.now() - 3600 * 1000).toISOString(),
        sample: {
          message: "Dead click on #pay-now button on /checkout",
          page_path: "/checkout",
        },
      },
      {
        fingerprint: "fp_soft_error_payment",
        kind: "soft_error",
        count: 14,
        first_seen: new Date(Date.now() - 1800 * 1000).toISOString(),
        sample: {
          message: "Soft error payload on /api/checkout: success=false",
          page_path: "/api/checkout",
        },
      },
    ];

    return NextResponse.json({
      project_id: id,
      window: "1h",
      signatures,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch silent errors" }, { status: 500 });
  }
}
