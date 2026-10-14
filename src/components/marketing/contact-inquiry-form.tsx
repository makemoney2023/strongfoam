"use client";

import Link from "next/link";

import { useState, type FormEvent } from "react";
import { TurnstileField, readTurnstileToken } from "@/components/marketing/turnstile-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactInquiryForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [draftId] = useState(() => crypto.randomUUID());
  const [companyWebsite, setCompanyWebsite] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeType: "general",
          message: String(form.get("message") ?? ""),
          company: String(form.get("company") ?? ""),
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          consent: form.get("consent") === "on",
          companyWebsite,
          startedAt,
          draftId,
          uploadPaths: [],
          turnstileToken: readTurnstileToken(),
        }),
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { thanksPath?: string };
      if (!data.thanksPath) throw new Error("failed");
      window.location.assign(data.thanksPath);
    } catch {
      setError("Could not send. Retry.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contact-first-name">First name</Label>
          <Input id="contact-first-name" name="firstName" autoComplete="given-name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-last-name">Last name</Label>
          <Input id="contact-last-name" name="lastName" autoComplete="family-name" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-phone">Phone</Label>
        <Input id="contact-phone" name="phone" type="tel" autoComplete="tel" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-company">Company (optional)</Label>
        <Input id="contact-company" name="company" autoComplete="organization" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" required maxLength={2000} />
      </div>
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input id="contact-consent" name="consent" type="checkbox" required className="mt-1" />
        <span>Strong Foam may use these details to reply to this inquiry.</span>
      </label>
      <input
        type="text"
        name="companyWebsite"
        tabIndex={-1}
        autoComplete="off"
        value={companyWebsite}
        onChange={(event) => setCompanyWebsite(event.target.value)}
        className="sr-only"
        aria-hidden="true"
      />
      <TurnstileField />
      <p className="form-legal-note">
          By submitting, you agree we may use your details to respond as described in our 
          <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      {error ? <p className="text-sm text-[color:var(--sf-red)]">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
