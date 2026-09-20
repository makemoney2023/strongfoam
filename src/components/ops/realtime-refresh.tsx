"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RealtimeRefresh({ url }: { url: string }) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const loginPath = url.startsWith("/api/field")
    ? "/field/login"
    : "/app/login";

  useEffect(() => {
    const source = new EventSource(url);
    const refresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 150);
    };
    source.addEventListener("ready", () => setConnected(true));
    source.addEventListener("job", refresh);
    source.addEventListener("assignments", refresh);
    source.addEventListener("unauthorized", () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      setConnected(false);
      router.replace(loginPath);
    });
    source.onerror = () => setConnected(false);
    return () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [loginPath, router, url]);

  return (
    <span className="sr-only" aria-live="polite">
      {connected ? "Live updates connected." : "Live updates reconnecting."}
    </span>
  );
}
