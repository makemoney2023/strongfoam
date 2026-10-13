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
      intakeType: "estimate",
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
    if (parsed.ok && parsed.data.intakeType === "estimate") {
      expect(parsed.data.services).toEqual([]);
    }
  });

  it("rejects commercial_ici with no services", () => {
    const parsed = parseLeadPayload({
      intakeType: "estimate",
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
      intakeType: "estimate",
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
      intakeType: "estimate",
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
      intakeType: "estimate",
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
      intakeType: "estimate",
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

  it("accepts a general inquiry with only its required branch fields", () => {
    const parsed = parseLeadPayload({
      intakeType: "general",
      message: "  Please call about a partnership question.  ",
      company: "  Example Co  ",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      ...contact,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual({
        intakeType: "general",
        message: "Please call about a partnership question.",
        company: "Example Co",
        startedAt: 1,
        draftId: "11111111-1111-4111-8111-111111111111",
        uploadPaths: [],
        ...contact,
      });
    }
  });

  it("requires separate names, valid contact fields, consent, timing, draft, and message for general inquiries", () => {
    const base = {
      intakeType: "general",
      message: "Question",
      companyWebsite: "",
      startedAt: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      ...contact,
    };

    for (const field of [
      "firstName",
      "lastName",
      "email",
      "phone",
      "message",
      "consent",
      "companyWebsite",
      "startedAt",
      "draftId",
    ] as const) {
      const candidate = { ...base };
      delete candidate[field];
      expect(parseLeadPayload(candidate).ok, field).toBe(false);
    }

    expect(parseLeadPayload({ ...base, email: "invalid" }).ok).toBe(false);
    expect(parseLeadPayload({ ...base, consent: false }).ok).toBe(false);
  });

  it("rejects an unknown or missing intake branch", () => {
    expect(
      parseLeadPayload({
        intakeType: "other",
        message: "Question",
        companyWebsite: "",
        startedAt: 1,
        draftId: "11111111-1111-4111-8111-111111111111",
        ...contact,
      }).ok,
    ).toBe(false);
    expect(
      parseLeadPayload({
        projectType: "residential_other",
        city: "Kitchener",
        province: "ON",
        companyWebsite: "",
        startedAt: 1,
        draftId: "11111111-1111-4111-8111-111111111111",
        uploadPaths: [],
        ...contact,
      }).ok,
    ).toBe(false);
  });
});
