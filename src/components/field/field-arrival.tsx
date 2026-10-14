"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "strongfoam-field-arrival-consent";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("strongfoam-field-arrival", onStoreChange);
  return () => window.removeEventListener("strongfoam-field-arrival", onStoreChange);
}

export function FieldArrival({ jobId }: { jobId: string }) {
  const router = useRouter();
  const remembered = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(CONSENT_KEY) === "1",
    () => false,
  );
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const consent = remembered || allowed;

  async function arrive() {
    setError(null);
    if (!consent) {
      setError("Allow location once on this device.");
      return;
    }
    if (!navigator.geolocation) {
      setError("This browser cannot read location.");
      return;
    }
    setPending(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("location")), {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        });
      });
      window.localStorage.setItem(CONSENT_KEY, "1");
      window.dispatchEvent(new Event("strongfoam-field-arrival"));
      const response = await fetch("/api/field/arrival", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          consent: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "That arrival could not be saved.");
        return;
      }
      router.refresh();
    } catch {
      setError("Location was not available.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <p className="text-sm font-medium">Arrival</p>
      {remembered ? null : (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowed}
            onChange={(event) => setAllowed(event.target.checked)}
          />
          Use location on this device once to draft labor for today. The point is not stored.
        </label>
      )}
      <Button type="button" className="min-h-11" disabled={pending || !consent} onClick={() => void arrive()}>
        {pending ? "Checking…" : "I'm here"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
