import { describe, expect, it } from "vitest";
import { buildEstimatingEmail, buildVisitorEmail } from "@/lib/leads/email";

const base = {
  intakeType: "estimate" as const,
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

  it("uses a general-inquiry subject and does not offer a booking", () => {
    const internal = buildEstimatingEmail({
      ...base,
      intakeType: "general",
      status: "secondary",
      company: "",
      city: "",
      services: [],
      reasons: ["general_inquiry"],
      fileLinks: [],
      calendlyOffered: false,
      message: "Can you call about a partnership?",
    });
    const visitor = buildVisitorEmail({
      ...base,
      intakeType: "general",
      status: "secondary",
      calendlyOffered: false,
      message: "Can you call about a partnership?",
    });

    expect(internal.subject).toBe("General inquiry · Alex Lee");
    expect(internal.text).toContain("Can you call about a partnership?");
    expect(internal.text).toContain("Calendly offered: no");
    expect(visitor.subject).toBe("Strong Foam received your inquiry");
    expect(visitor.text.toLowerCase()).toContain("reply");
    expect(visitor.text.toLowerCase()).not.toContain("thanks page");
  });
});
