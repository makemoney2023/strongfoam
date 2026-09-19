import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyPassword } from "@/lib/ops/credentials";
import {
  isOfficeMembershipRole,
  type UserIdentity,
} from "@/lib/ops/identity";
import {
  getUserIdentityByEmail,
  getUserIdentityById,
} from "@/lib/ops/store";

export const OPS_SESSION_COOKIE = "sf-ops-session";
export const OPS_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type LegacyOpsSessionToken = {
  email: string;
  role: "estimator";
  issuedAt: number;
  expiresAt: number;
};

export type UserOpsSessionToken = {
  userId: string;
  organizationId: string;
  email: string;
  role: "administrator" | "office";
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
};

export type OpsSessionToken = LegacyOpsSessionToken | UserOpsSessionToken;

export type OpsSession = OpsSessionToken & {
  displayName: string;
  legacy: boolean;
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

export function configuredAdminEmails(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const source = env.OPS_ADMIN_EMAILS ?? env.OPS_STAFF_EMAILS ?? "";
  return source
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isConfiguredAdminEmail(
  email: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return configuredAdminEmails(env).includes(normalizeEmail(email));
}

export function signOpsSession(
  session: OpsSessionToken,
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
): OpsSessionToken | null {
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
    ) as OpsSessionToken;
    if (
      typeof session.email !== "string" ||
      typeof session.issuedAt !== "number" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= now
    ) {
      return null;
    }
    if (session.role === "estimator") return session;
    if (
      !isOfficeMembershipRole(session.role) ||
      typeof session.userId !== "string" ||
      typeof session.organizationId !== "string" ||
      typeof session.sessionVersion !== "number"
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
): LegacyOpsSessionToken {
  return {
    email: normalizeEmail(email),
    role: "estimator",
    issuedAt: now,
    expiresAt: now + OPS_SESSION_TTL_MS,
  };
}

export function createUserOpsSession(
  identity: UserIdentity,
  now = Date.now(),
): UserOpsSessionToken {
  if (!isOfficeMembershipRole(identity.role)) {
    throw new Error("Office sessions require an Office membership role.");
  }
  return {
    userId: identity.userId,
    organizationId: identity.organizationId,
    email: identity.email,
    role: identity.role,
    sessionVersion: identity.sessionVersion,
    issuedAt: now,
    expiresAt: now + OPS_SESSION_TTL_MS,
  };
}

export type OpsAuthenticationResult =
  | { kind: "user"; identity: UserIdentity }
  | { kind: "legacy"; email: string };

export async function authenticateOpsCredentials(
  emailInput: string,
  password: string,
  env: Record<string, string | undefined> = process.env,
): Promise<OpsAuthenticationResult | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;
  const identity = await getUserIdentityByEmail(email);
  if (identity) {
    if (
      !identity.active ||
      !identity.membershipActive ||
      !isOfficeMembershipRole(identity.role) ||
      !(await verifyPassword(password, identity.passwordHash))
    ) {
      return null;
    }
    return { kind: "user", identity };
  }
  if (
    !env.OPS_STAFF_PASSWORD ||
    !isConfiguredStaffEmail(email, env) ||
    password !== env.OPS_STAFF_PASSWORD
  ) {
    return null;
  }
  return { kind: "legacy", email };
}

export function canManageUsers(
  session: Pick<OpsSessionToken, "email" | "role">,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (
    session.role === "administrator" ||
    (session.role === "estimator" && isConfiguredAdminEmail(session.email, env))
  );
}

export async function getOpsSession(): Promise<OpsSession | null> {
  const secret = process.env.OPS_SESSION_SECRET;
  if (!secret) return null;
  const store = await cookies();
  const token = store.get(OPS_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifyOpsSession(token, secret);
  if (!session) return null;
  if (session.role === "estimator") {
    if (!isConfiguredStaffEmail(session.email)) return null;
    return {
      ...session,
      displayName: session.email,
      legacy: true,
    };
  }
  const identity = await getUserIdentityById(session.userId);
  if (
    !identity ||
    !identity.active ||
    !identity.membershipActive ||
    !isOfficeMembershipRole(identity.role) ||
    identity.email !== session.email ||
    identity.organizationId !== session.organizationId ||
    identity.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }
  return {
    ...session,
    email: identity.email,
    role: identity.role,
    displayName: identity.displayName,
    legacy: false,
  };
}
