"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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

export function NoticeToaster() {
  const pathname = usePathname();
  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    function consume() {
      const raw = readCookie(OPS_NOTICE_COOKIE);
      if (!raw || raw === lastRaw.current) return;
      const notice = parseOpsNotice(raw);
      lastRaw.current = raw;
      clearCookie(OPS_NOTICE_COOKIE);
      if (!notice) return;
      showNotice(notice);
    }

    consume();
    const id = window.setInterval(consume, 250);
    return () => window.clearInterval(id);
  }, [pathname]);

  return <Toaster position="top-right" />;
}
