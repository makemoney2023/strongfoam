"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { clearOpsNotice } from "@/app/app/clear-notice-action";
import { OPS_NOTICE_COOKIE, parseOpsNotice, type OpsNotice } from "@/lib/ops/notice";

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? match[1] : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

function showNotice(notice: OpsNotice) {
  if (notice.kind === "error") {
    toast.error(notice.message);
    return;
  }
  toast.success(notice.message);
}

const shownNoticeKeys = new Set<string>();

export function NoticeToaster({
  notice,
  noticeKey,
}: {
  notice?: OpsNotice | null;
  noticeKey?: string | null;
}) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    function consume(next: OpsNotice | null, key: string | null) {
      if (!next || !key || lastKey.current === key || shownNoticeKeys.has(key)) return;
      lastKey.current = key;
      shownNoticeKeys.add(key);
      clearCookie(OPS_NOTICE_COOKIE);
      showNotice(next);
      void clearOpsNotice();
    }

    const raw = readCookie(OPS_NOTICE_COOKIE);
    consume(parseOpsNotice(raw) ?? notice ?? null, raw ?? noticeKey ?? null);
  }, [notice, noticeKey]);

  return <Toaster position="top-right" />;
}
