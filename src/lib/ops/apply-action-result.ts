"use client";

import { toast } from "sonner";
import type { ActionState } from "@/lib/ops/action-result";

export function applyActionResult(
  result: ActionState | void,
  navigate: { push: (href: string) => void; refresh: () => void },
) {
  if (!result) return;
  if (result.notice?.kind === "error") {
    toast.error(result.notice.message);
  } else if (result.notice?.kind === "success") {
    toast.success(result.notice.message);
  } else if (result.error && !result.fields) {
    toast.error(result.error);
  }

  if (!result.href) return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (result.href === window.location.pathname || result.href === current) {
    navigate.refresh();
    return;
  }
  navigate.push(result.href);
}