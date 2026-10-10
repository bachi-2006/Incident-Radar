import { NextRequest, NextResponse } from "next/server";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { rankSuspectCommits, IncidentSignature, CommitData } from "../../../../../../similarity-engine";

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
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit")) || 5;

    const signature: IncidentSignature = {
      files: ["src/components/CheckoutButton.tsx", "src/app/api/checkout/route.ts"],
      symbols: ["processPayment"],
      text: "NullPointerException in processPayment at CheckoutController.java:42",
      services: ["payment-service"],
      start: new Date(),
    };

    const candidateCommits: CommitData[] = [
      {
        sha: "a1b2c3d4",
        author_login: "rahul-backend",
        message: "fix(payment): refactor processPayment error handling in CheckoutController",
        committed_at: new Date(Date.now() - 15 * 60 * 1000),
        files: ["src/app/api/checkout/route.ts", "src/components/CheckoutButton.tsx"],
        symbols: ["processPayment"],
        deployed_at: new Date(Date.now() - 12 * 60 * 1000),
      },
      {
        sha: "e5f6g7h8",
        author_login: "priya-frontend",
        message: "feat(ui): update primary button styles in checkout page",
        committed_at: new Date(Date.now() - 90 * 60 * 1000),
        files: ["src/components/CheckoutButton.tsx"],
        symbols: [],
      },
      {
        sha: "i9j0k1l2",
        author_login: "sam-devops",
        message: "chore(config): adjust memory limit in render.yaml",
        committed_at: new Date(Date.now() - 300 * 60 * 1000),
        files: ["render.yaml"],
        symbols: [],
      },
    ];

    const ranked = rankSuspectCommits(signature, candidateCommits).slice(0, limit);

    return NextResponse.json({
      incident_id: id,
      window: "72h",
      commits: ranked,
      computed_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate suspect commits" }, { status: 500 });
  }
}
