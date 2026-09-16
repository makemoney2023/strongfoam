import { describe, expect, it } from "vitest";
import { parseLeadPayload } from "@/lib/leads/schema";

const contact = {
  firstName: "Alex",
  lastName: "Lee",
  email: "alex@gc.example",
  phone: "519-555-0100",
  consent: true,
};

describe("parseLeadPayload", () => {
  it("accepts a short residential path without services", () => {
    const parsed = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      notes: "Attic foam",
      company: "",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.services).toEqual([]);
    }
  });

  it("rejects commercial_ici with no services", () => {
    const parsed = parseLeadPayload({
      projectType: "commercial_ici",
      city: "London",
      province: "ON",
      services: [],
      role: "gc",
      timeline: "0_3_months",
      drawingsReady: "later",
      company: "Acme GC",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
    });
    expect(parsed.ok).toBe(false);
  });

  it("rejects missing consent and bad email", () => {
    const missingConsent = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
      consent: false,
    });
    expect(missingConsent.ok).toBe(false);

    const badEmail = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
      email: "not-an-email",
    });
    expect(badEmail.ok).toBe(false);
  });

  it("accepts full ICI path with a service", () => {
    const parsed = parseLeadPayload({
      projectType: "commercial_ici",
      city: "Kitchener",
      province: "ON",
      services: ["spray-foam", "avb"],
      role: "gc",
      buildingType: "MUR tower",
      timeline: "now_tendering",
      drawingsReady: "yes",
      company: "Acme GC",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: ["leads/11111111-1111-4111-8111-111111111111/spec.pdf"],
      ...contact,
    });
    expect(parsed.ok).toBe(true);
  });

  it("strips the companyWebsite honeypot after parsing", () => {
    const parsed = parseLeadPayload({
      projectType: "residential_other",
      city: "Kitchener",
      province: "ON",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: [],
      ...contact,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).not.toHaveProperty("companyWebsite");
    }
  });
});
