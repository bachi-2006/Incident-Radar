import { NextRequest, NextResponse } from "next/server";

export function validateWorkatoAuth(req: Request | NextRequest): { authorized: boolean; error?: string; status?: number } {
  const secret = req.headers.get("x-ir-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  const configuredSecret = process.env.WORKATO_SHARED_SECRET;

  if (configuredSecret && secret !== configuredSecret) {
    return {
      authorized: false,
      error: "Unauthorized: Invalid X-IR-Secret",
      status: 401,
    };
  }

  return { authorized: true };
}

export function unauthorizedResponse(error = "Unauthorized: Invalid X-IR-Secret"): NextResponse {
  return NextResponse.json({ error }, { status: 401 });
}
