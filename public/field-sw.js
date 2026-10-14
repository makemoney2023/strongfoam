const DB_NAME = "strongfoam-field";
const STORE = "outbox";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function openDb() {
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

async function readAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function removeIds(db, ids) {
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flush() {
  const db = await openDb();
  const items = await readAll(db);
  if (!items.length) return;
  const response = await fetch("/api/field/sync", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) return;
  const payload = await response.json();
  const drop = [...(payload.acked || []), ...(payload.rejected || [])];
  if (drop.length) await removeIds(db, drop);
}

self.addEventListener("sync", (event) => {
  if (event.tag === "field-outbox") event.waitUntil(flush());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "flush") event.waitUntil(flush());
});
