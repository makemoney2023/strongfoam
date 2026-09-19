export const OPS_NOTICE_COOKIE = "sf-ops-notice";

export type OpsNotice = {
  kind: "success" | "error";
  message: string;
};

let noticeSeq = 0;

export function encodeOpsNotice(notice: OpsNotice): string {
  noticeSeq += 1;
  return encodeURIComponent(
    JSON.stringify({
      kind: notice.kind,
      message: notice.message,
      issuedAt: Date.now(),
      seq: noticeSeq,
    }),
  );
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
