import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/ops/auth";
import { verifyPassword } from "@/lib/ops/credentials";
import {
  FIELD_SESSION_COOKIE,
  FIELD_SESSION_TTL_MS,
  createFieldSessionToken,
  fieldSessionSecret,
  signFieldSession,
} from "@/lib/ops/field-auth";
import { isFieldMembershipRole } from "@/lib/ops/identity";
import { getFieldIdentityByEmail } from "@/lib/ops/store";

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const secret = fieldSessionSecret();
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const identity = email ? await getFieldIdentityByEmail(email) : null;

  if (
    !secret ||
    !identity ||
    !identity.active ||
    !identity.membershipActive ||
    !isFieldMembershipRole(identity.role) ||
    !(await verifyPassword(password, identity.passwordHash))
  ) {
    return NextResponse.redirect(new URL("/field/login?error=1", origin), 303);
  }

  const token = createFieldSessionToken({
    userId: identity.userId,
    organizationId: identity.organizationId,
    email: identity.email,
    role: identity.role,
    sessionVersion: identity.sessionVersion,
  });
  const response = NextResponse.redirect(new URL("/field", origin), 303);
  response.cookies.set({
    name: FIELD_SESSION_COOKIE,
    value: signFieldSession(token, secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIELD_SESSION_TTL_MS / 1000,
  });
  return response;
}
