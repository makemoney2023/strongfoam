"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { OPS_NOTICE_COOKIE, parseOpsNotice } from "@/lib/ops/notice";

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? match[1] : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

export function NoticeToaster() {
  useEffect(() => {
    const raw = readCookie(OPS_NOTICE_COOKIE);
    const notice = parseOpsNotice(raw);
    if (!notice) return;
    clearCookie(OPS_NOTICE_COOKIE);
    if (notice.kind === "error") {
      toast.error(notice.message);
    } else {
      toast.success(notice.message);
    }
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      <div className="sr-only" aria-live="polite" aria-atomic="true" />
    </>
  );
}
