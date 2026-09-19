"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { kindFromPath, recordRecentItem } from "@/lib/ops/recent";

export function RecentVisit({ title }: { title: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const kind = kindFromPath(pathname);
    if (!kind || !title.trim()) return;
    recordRecentItem({ href: pathname, title, kind });
  }, [pathname, title]);

  return null;
}
