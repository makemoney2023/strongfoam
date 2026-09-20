import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { MembershipRole } from "@/lib/ops/identity";
import { isFieldMembershipRole } from "@/lib/ops/identity";
import { getFieldIdentityById } from "@/lib/ops/store";

export const FIELD_SESSION_COOKIE = "sf-field-session";
export const FIELD_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type FieldSessionToken = {
  userId: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
};

export type FieldSession = FieldSessionToken & {
  displayName: string;
  organizationId: string;
};

export function fieldSessionSecret(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.FIELD_SESSION_SECRET || env.OPS_SESSION_SECRET || null;
}

export function signFieldSession(
  session: FieldSessionToken,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyFieldSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): FieldSessionToken | null {
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
    ) as FieldSessionToken;
    if (
      typeof session.userId !== "string" ||
      typeof session.organizationId !== "string" ||
      typeof session.email !== "string" ||
      !isFieldMembershipRole(session.role) ||
      typeof session.sessionVersion !== "number" ||
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

export function createFieldSessionToken(
  identity: {
    userId: string;
    organizationId: string;
    email: string;
    role: MembershipRole;
    sessionVersion: number;
  },
  now = Date.now(),
): FieldSessionToken {
  return {
    ...identity,
    issuedAt: now,
    expiresAt: now + FIELD_SESSION_TTL_MS,
  };
}

export function resolveFieldSession(
  session: FieldSessionToken,
  identity: {
    userId: string;
    organizationId: string;
    email: string;
    displayName: string;
    role: MembershipRole;
    active: boolean;
    membershipActive: boolean;
    sessionVersion: number;
  } | null,
): FieldSession | null {
  if (
    !identity ||
    !identity.active ||
    !identity.membershipActive ||
    !isFieldMembershipRole(identity.role) ||
    identity.email !== session.email ||
    identity.organizationId !== session.organizationId ||
    identity.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }

  return {
    ...session,
    displayName: identity.displayName,
    organizationId: identity.organizationId,
  };
}

export async function getFieldSession(): Promise<FieldSession | null> {
  const secret = fieldSessionSecret();
  if (!secret) return null;
  const store = await cookies();
  const token = store.get(FIELD_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifyFieldSessionToken(token, secret);
  if (!session) return null;
  return resolveFieldSession(session, await getFieldIdentityById(session.userId));
}
