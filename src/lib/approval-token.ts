import crypto from "crypto";

const DEFAULT_SECRET = "12ed97e9fc175a0608e08d8bafae0d08a040e4112880d0f5ad69064731f9e900";

export interface TokenPayload {
  runId: string;
  exp: number;
  nonce: string;
}

function getSigningSecret(): string {
  return process.env.APPROVAL_SIGNING_SECRET || DEFAULT_SECRET;
}

export function generateApprovalToken(runId: string, ttlMs = 30 * 60 * 1000): string {
  const secret = getSigningSecret();
  const payload: TokenPayload = {
    runId,
    exp: Date.now() + ttlMs,
    nonce: crypto.randomBytes(8).toString("hex"),
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("hex");

  return `${payloadEncoded}.${signature}`;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyApprovalToken(
  token: string,
  expectedRunId?: string
): { valid: boolean; reason?: string; payload?: TokenPayload; tokenHash?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, reason: "Malformed token format" };
  }

  const [payloadEncoded, signature] = token.split(".");
  const secret = getSigningSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadEncoded)
    .digest("hex");

  if (signature !== expectedSignature) {
    return { valid: false, reason: "Invalid token signature" };
  }

  try {
    const payloadJson = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
    const payload: TokenPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { valid: false, reason: "Approval token expired", payload };
    }

    if (expectedRunId && payload.runId !== expectedRunId) {
      return { valid: false, reason: "Token run ID mismatch", payload };
    }

    const tokenHash = hashToken(token);
    return { valid: true, payload, tokenHash };
  } catch {
    return { valid: false, reason: "Failed to parse token payload" };
  }
}
