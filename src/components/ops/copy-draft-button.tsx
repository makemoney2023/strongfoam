"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyDraftButton({ text }: { text: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied");
    } catch {
      setMessage("Copy this list from the lines above.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={!text.trim()}
        onClick={copy}
      >
        Copy pick list
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
