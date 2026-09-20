import { NextResponse } from "next/server";
import {
  OPS_SESSION_COOKIE,
  OPS_SESSION_TTL_MS,
  authenticateOpsCredentials,
  createOpsSession,
  createUserOpsSession,
  signOpsSession,
} from "@/lib/ops/auth";
import { requestOrigin } from "@/lib/ops/request-origin";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.OPS_SESSION_SECRET;
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const origin = requestOrigin(request);

  const authentication = secret
    ? await authenticateOpsCredentials(email, password)
    : null;
  if (!secret || !authentication) {
    return NextResponse.redirect(new URL("/app/login?error=1", origin), 303);
  }
  const session =
    authentication.kind === "user"
      ? createUserOpsSession(authentication.identity)
      : createOpsSession(authentication.email);

  const response = NextResponse.redirect(new URL("/app", origin), 303);
  response.cookies.set({
    name: OPS_SESSION_COOKIE,
    value: signOpsSession(session, secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OPS_SESSION_TTL_MS / 1000,
  });
  return response;
}
