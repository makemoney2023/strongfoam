"use client";

import { useEffect } from "react";

const DB_NAME = "strongfoam-field";
const STORE = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueFieldDraft(detail: {
  id: string;
  draft: Record<string, unknown>;
}): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id: detail.id, kind: "draft", draft: detail.draft });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const registration = await navigator.serviceWorker?.getRegistration();
  const sync = registration as (ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }) | undefined;
  await sync?.sync?.register("field-outbox").catch(() => undefined);
  registration?.active?.postMessage({ type: "flush" });
}

export function FieldOutbox() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/field-sw.js").catch(() => undefined);
    const flush = () => navigator.serviceWorker.controller?.postMessage({ type: "flush" });
    const onQueue = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; draft?: Record<string, unknown> }>).detail;
      if (!detail?.id || !detail.draft) return;
      void queueFieldDraft({ id: detail.id, draft: detail.draft });
    };
    window.addEventListener("online", flush);
    window.addEventListener("strongfoam-field-queue", onQueue);
    flush();
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("strongfoam-field-queue", onQueue);
    };
  }, []);
  return null;
}
