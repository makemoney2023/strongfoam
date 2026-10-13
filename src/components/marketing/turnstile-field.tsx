"use client";

import { TURNSTILE_SCRIPT_URL, turnstileSiteKey } from "@/lib/leads/turnstile";

export function readTurnstileToken(root: ParentNode = document): string {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    '[name="cf-turnstile-response"]',
  );
  return field?.value.trim() ?? "";
}

export function TurnstileField({
  siteKey = turnstileSiteKey(),
}: {
  siteKey?: string;
}) {
  if (!siteKey) return null;
  return (
    <div className="grid gap-2">
      <script src={TURNSTILE_SCRIPT_URL} async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </div>
  );
}
