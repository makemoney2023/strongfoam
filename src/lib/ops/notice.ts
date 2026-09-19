import { cookies } from "next/headers";

export const OPS_NOTICE_COOKIE = "sf-ops-notice";

export type OpsNotice = {
  kind: "success" | "error";
  message: string;
};

export function encodeOpsNotice(notice: OpsNotice): string {
  return encodeURIComponent(JSON.stringify(notice));
}

export function parseOpsNotice(value?: string | null): OpsNotice | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<OpsNotice>;
    if (
      (parsed.kind === "success" || parsed.kind === "error") &&
      typeof parsed.message === "string" &&
      parsed.message.trim()
    ) {
      return { kind: parsed.kind, message: parsed.message.trim() };
    }
  } catch {
    return null;
  }
  return null;
}

export async function setOpsNotice(notice: OpsNotice): Promise<void> {
  const jar = await cookies();
  jar.set(OPS_NOTICE_COOKIE, encodeOpsNotice(notice), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}
