import { describe, expect, it } from "vitest";
import { buildEstimatingEmail, buildVisitorEmail } from "@/lib/leads/email";

const base = {
  status: "qualified" as const,
  firstName: "Alex",
  lastName: "Lee",
  email: "alex@gc.example",
  company: "Acme GC",
  city: "Kitchener",
  services: ["spray-foam"],
  reasons: [] as string[],
  fileLinks: ["https://example.test/file"],
  calendlyOffered: true,
};

describe("lead emails", () => {
  it("puts status, company, and city in the estimating subject", () => {
    const email = buildEstimatingEmail(base);
    expect(email.subject).toBe(
      "New estimate · qualified · Acme GC · Kitchener",
    );
    expect(email.text).toContain("spray-foam");
    expect(email.text).toContain("https://example.test/file");
    expect(email.text).toContain("Calendly offered: yes");
  });

  it("tells secondary visitors estimating will follow up", () => {
    const email = buildVisitorEmail({
      ...base,
      status: "secondary",
      calendlyOffered: false,
    });
    expect(email.text.toLowerCase()).toContain("follow up");
    expect(email.text.toLowerCase()).not.toContain("booked");
  });

  it("mentions booking on the thanks page for qualified visitors", () => {
    const email = buildVisitorEmail(base);
    expect(email.text.toLowerCase()).toContain("thanks page");
  });
});
