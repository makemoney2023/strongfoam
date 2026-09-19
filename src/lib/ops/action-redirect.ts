import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encodeOpsNotice, OPS_NOTICE_COOKIE, type OpsNotice } from "@/lib/ops/notice";

async function setOpsNotice(notice: OpsNotice): Promise<void> {
  const jar = await cookies();
  jar.set(OPS_NOTICE_COOKIE, encodeOpsNotice(notice), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function succeed(path: string, message = "Saved."): Promise<never> {
  await setOpsNotice({ kind: "success", message });
  redirect(path);
}

export async function fail(path: string, error: string): Promise<never> {
  await setOpsNotice({ kind: "error", message: error });
  redirect(path);
}
