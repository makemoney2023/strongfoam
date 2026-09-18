import { NextResponse } from "next/server";
import { OPS_SESSION_COOKIE } from "@/lib/ops/auth";

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/app/login", origin), 303);
  response.cookies.set({
    name: OPS_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
