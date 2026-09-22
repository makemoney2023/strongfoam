"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { searchOpsAction } from "@/app/app/search-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { recordRecentItem, readRecentItems, type RecentItem } from "@/lib/ops/recent";
import { SEARCH_KIND_LABELS, type SearchHit } from "@/lib/ops/search-hits";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const results = useMemo(
    () => (query.trim() ? hits : recent.map((item) => ({
      kind: item.kind,
      id: item.href,
      href: item.href,
      title: item.title,
      subtitle: "Recent",
    }))),
    [hits, query, recent],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActive(0);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        setRecent(readRecentItems());
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const next = await searchOpsAction(q);
      if (!cancelled) {
        setHits(next);
        setActive(0);
        setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  function go(href: string, item?: { title: string; kind: SearchHit["kind"] }) {
    if (item) recordRecentItem({ href, title: item.title, kind: item.kind });
    close();
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-start gap-2 text-muted-foreground md:min-h-8 md:w-56"
        onClick={() => {
          setRecent(readRecentItems());
          setOpen(true);
        }}
        aria-keyshortcuts="Control+K Meta+K"
      >
        <SearchIcon aria-hidden="true" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="gap-3 sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Jump to a company, request, project, job, or price-book item. Recent records appear
              when the box is empty.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies, contacts, requests, jobs, price book…"
            className="h-11"
            aria-controls={listId}
            aria-autocomplete="list"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && results[active]) {
                event.preventDefault();
                const item = results[active];
                go(item.href, item);
              }
            }}
          />
          <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading
                  ? "Searching…"
                  : query.trim()
                    ? "No matching records."
                    : "No recent records yet."}
              </li>
            ) : (
              results.map((item, index) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={cn(
                      "flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-left",
                      index === active ? "bg-muted" : "hover:bg-muted/70",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item.href, item)}
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {SEARCH_KIND_LABELS[item.kind]} · {item.subtitle}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
