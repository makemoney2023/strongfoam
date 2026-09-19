import { NextResponse } from "next/server";
import { FIELD_SESSION_COOKIE } from "@/lib/ops/field-auth";

export async function POST(request: Request): Promise<Response> {
  const response = NextResponse.redirect(
    new URL("/field/login", request.url),
    303,
  );
  response.cookies.set({
    name: FIELD_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
