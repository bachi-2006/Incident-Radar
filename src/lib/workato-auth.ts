import { NextRequest, NextResponse } from "next/server";

export function validateWorkatoAuth(req: Request | NextRequest): {
  authorized: boolean;
  error?: string;
  status?: number;
} {
  const secret =
    req.headers.get("x-ir-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  const configuredSecret =
    process.env.WORKATO_SHARED_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "83ea2f004e0a8204c943192a99b1116e252b3360dadb7d337f4282a0d530741d"
      : undefined);

  if (!configuredSecret) {
    return {
      authorized: false,
      error: "Authentication service misconfiguration: WORKATO_SHARED_SECRET is not configured",
      status: 500,
    };
  }

  if (!secret || secret !== configuredSecret) {
    return {
      authorized: false,
      error: "Unauthorized: Invalid or missing X-IR-Secret header",
      status: 401,
    };
  }

  return { authorized: true };
}

export function unauthorizedResponse(
  error = "Unauthorized: Invalid X-IR-Secret",
  status = 401
): NextResponse {
  return NextResponse.json({ error }, { status });
}
