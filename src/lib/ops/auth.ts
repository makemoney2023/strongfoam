import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const OPS_SESSION_COOKIE = "sf-ops-session";
export const OPS_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type OpsSession = {
  email: string;
  role: "estimator";
  issuedAt: number;
  expiresAt: number;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function configuredStaffEmails(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return (env.OPS_STAFF_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isConfiguredStaffEmail(
  email: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return configuredStaffEmails(env).includes(normalizeEmail(email));
}

export function signOpsSession(
  session: OpsSession,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOpsSession(
  token: string,
  secret: string,
  now = Date.now(),
): OpsSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as OpsSession;
    if (
      typeof session.email !== "string" ||
      session.role !== "estimator" ||
      typeof session.issuedAt !== "number" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= now
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function createOpsSession(
  email: string,
  now = Date.now(),
): OpsSession {
  return {
    email: normalizeEmail(email),
    role: "estimator",
    issuedAt: now,
    expiresAt: now + OPS_SESSION_TTL_MS,
  };
}

export async function getOpsSession(): Promise<OpsSession | null> {
  const secret = process.env.OPS_SESSION_SECRET;
  if (!secret) return null;
  const store = await cookies();
  const token = store.get(OPS_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifyOpsSession(token, secret);
  if (!session || !isConfiguredStaffEmail(session.email)) return null;
  return session;
}
