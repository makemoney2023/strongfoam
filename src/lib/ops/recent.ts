import type { SearchHitKind } from "@/lib/ops/search-hits";

export type RecentItem = {
  href: string;
  title: string;
  kind: SearchHitKind;
};

const STORAGE_KEY = "sf-ops-recent";
const MAX_RECENT = 6;

export function readRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.href === "string" &&
        item.href.startsWith("/app/") &&
        typeof item.title === "string",
    );
  } catch {
    return [];
  }
}

export function recordRecentItem(item: RecentItem): void {
  if (typeof window === "undefined") return;
  const next = [
    item,
    ...readRecentItems().filter((existing) => existing.href !== item.href),
  ].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function kindFromPath(pathname: string): SearchHitKind | null {
  if (/^\/app\/opportunities\/[^/]+\/estimates\/[^/]+/.test(pathname)) return "estimate";
  if (pathname.startsWith("/app/companies/")) return "company";
  if (pathname.startsWith("/app/requests/")) return "request";
  if (pathname.startsWith("/app/opportunities/")) return "opportunity";
  if (pathname.startsWith("/app/projects/")) return "project";
  if (pathname.startsWith("/app/jobs/")) return "job";
  if (pathname.startsWith("/app/price-book")) return "price_book";
  if (pathname.startsWith("/app/field/jobs/")) return "job";
  return null;
}
