"use client";

import { useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/ops/submit-button";
import { manualStatusLabel } from "@/lib/ops/field-drafts";

export function EffectSubmit({
  watch,
  fallback,
  pendingLabel,
  children,
}: {
  watch: string;
  fallback: string;
  pendingLabel?: string;
  children: ReactNode;
}) {
  const [label, setLabel] = useState(fallback);
  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      onChange={(event) => {
        const form = event.currentTarget.closest("form");
        if (!form) return;
        const value = String(new FormData(form).get(watch) ?? "");
        setLabel(manualStatusLabel(value) ?? fallback);
      }}
    >
      {children}
      <div className="sm:col-span-2">
        <SubmitButton variant="default" className="min-h-11 w-full" pendingLabel={pendingLabel}>
          {label}
        </SubmitButton>
      </div>
    </div>
  );
}
