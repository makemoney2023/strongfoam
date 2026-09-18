import { NextResponse } from "next/server";
import {
  OPS_SESSION_COOKIE,
  OPS_SESSION_TTL_MS,
  createOpsSession,
  isConfiguredStaffEmail,
  signOpsSession,
} from "@/lib/ops/auth";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.OPS_SESSION_SECRET;
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const origin = new URL(request.url).origin;

  if (
    !secret ||
    !process.env.OPS_STAFF_PASSWORD ||
    !isConfiguredStaffEmail(email) ||
    password !== process.env.OPS_STAFF_PASSWORD
  ) {
    return NextResponse.redirect(new URL("/app/login?error=1", origin), 303);
  }

  const response = NextResponse.redirect(new URL("/app/requests", origin), 303);
  response.cookies.set({
    name: OPS_SESSION_COOKIE,
    value: signOpsSession(createOpsSession(email), secret),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OPS_SESSION_TTL_MS / 1000,
  });
  return response;
}
