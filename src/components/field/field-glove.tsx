"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const KEY = "strongfoam-field-glove";
const EVENT = "strongfoam-field-glove-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
}

function snapshot() {
  const on = window.localStorage.getItem(KEY) === "1";
  document.documentElement.dataset.fieldGlove = on ? "on" : "off";
  return on;
}

export function FieldGloveToggle() {
  const on = useSyncExternalStore(subscribe, snapshot, () => false);

  function toggle() {
    window.localStorage.setItem(KEY, on ? "0" : "1");
    document.documentElement.dataset.fieldGlove = on ? "off" : "on";
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <Button
      type="button"
      variant={on ? "default" : "outline"}
      className="min-h-11"
      onClick={toggle}
      aria-pressed={on}
    >
      {on ? "Gloves on" : "Gloves"}
    </Button>
  );
}
