import { describe, expect, it } from "vitest";
import {
  draftCrmFromRequest,
  emailsMatch,
  findCompanyMatches,
  findContactMatches,
  namesMatch,
  normalizeName,
  normalizePhone,
  parseCrmConversion,
  phonesMatch,
  requiresDuplicateDecision,
} from "@/lib/ops/crm";

const request = {
  company: "Acme Construction",
  firstName: "Alex",
  lastName: "Lee",
  email: "Alex@acme-gc.example",
  phone: "519-555-0100",
  city: "Kitchener",
  province: "ON",
  projectType: "commercial_ici",
  services: ["spray-foam"],
  assignedTo: "Alex Rivera",
  answers: { role: "gc" },
  sourcePath: "/request-estimate",
};

describe("CRM conversion drafts", () => {
  it("fills company, contact, site, and opportunity from a request", () => {
    const draft = draftCrmFromRequest(request);
    expect(draft.companyName).toBe("Acme Construction");
    expect(draft.email).toBe("alex@acme-gc.example");
    expect(draft.role).toContain("General contractor");
    expect(draft.siteName).toBe("Kitchener jobsite");
    expect(draft.opportunityName).toContain("Acme Construction");
    expect(draft.opportunityName).toContain("Kitchener");
    expect(draft.stage).toBe("qualification");
    expect(draft.owner).toBe("Alex Rivera");
  });

  it("uses the contact name when the company field is blank", () => {
    expect(
      draftCrmFromRequest({ ...request, company: "  " }).companyName,
    ).toBe("Alex Lee");
  });
});

describe("CRM matching", () => {
  it("normalizes legal suffixes and phone digits", () => {
    expect(normalizeName("Acme Construction Ltd.")).toBe("acme construction");
    expect(normalizePhone("+1 (519) 555-0100")).toBe("5195550100");
    expect(namesMatch("Acme Construction", "ACME Construction Inc")).toBe(true);
    expect(emailsMatch("Alex@acme-gc.example", "alex@acme-gc.example")).toBe(
      true,
    );
    expect(phonesMatch("519-555-0100", "15195550100")).toBe(true);
  });

  it("finds likely company and contact duplicates", () => {
    expect(
      findCompanyMatches("Acme Construction", [
        { id: "co-1", name: "Acme Construction Ltd" },
        { id: "co-2", name: "Northland Drywall" },
      ]),
    ).toEqual([{ id: "co-1", name: "Acme Construction Ltd", reason: "name" }]);

    expect(
      findContactMatches("alex@acme-gc.example", "519-555-0100", [
        {
          id: "ct-1",
          firstName: "Alex",
          lastName: "Lee",
          email: "alex@acme-gc.example",
          phone: "519-555-0199",
        },
        {
          id: "ct-2",
          firstName: "Sam",
          lastName: "Home",
          email: "sam@home.example",
          phone: "519-555-0200",
        },
      ]),
    ).toEqual([
      {
        id: "ct-1",
        name: "Alex Lee",
        email: "alex@acme-gc.example",
        reason: "email",
      },
    ]);
  });

  it("requires an explicit link or create-new decision for duplicates", () => {
    const companyMatches = [
      { id: "co-1", name: "Acme Construction Ltd", reason: "name" as const },
    ];
    expect(
      requiresDuplicateDecision({
        companyMatches,
        contactMatches: [],
        linkCompanyId: null,
        linkContactId: null,
        createNew: false,
      }),
    ).toMatch(/similar company/i);
    expect(
      requiresDuplicateDecision({
        companyMatches,
        contactMatches: [],
        linkCompanyId: "co-1",
        linkContactId: null,
        createNew: false,
      }),
    ).toBeNull();
    expect(
      requiresDuplicateDecision({
        companyMatches,
        contactMatches: [],
        linkCompanyId: null,
        linkContactId: null,
        createNew: true,
      }),
    ).toBeNull();
  });
});

describe("parseCrmConversion", () => {
  it("accepts a complete conversion payload", () => {
    const parsed = parseCrmConversion({
      companyName: "Acme Construction",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@acme-gc.example",
      phone: "519-555-0100",
      city: "Kitchener",
      province: "ON",
      opportunityName: "Acme Construction · Kitchener",
      stage: "qualification",
      linkCompanyId: "66666666-6666-4666-8666-666666666666",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.linkCompanyId).toBe(
      "66666666-6666-4666-8666-666666666666",
    );
    expect(parsed.value.createNew).toBe(false);
  });

  it("rejects missing company or invalid email", () => {
    expect(parseCrmConversion({ firstName: "Alex", lastName: "Lee" }).ok).toBe(
      false,
    );
    expect(
      parseCrmConversion({
        companyName: "Acme",
        firstName: "Alex",
        lastName: "Lee",
        email: "not-an-email",
        city: "Kitchener",
        province: "ON",
        opportunityName: "Acme",
      }).ok,
    ).toBe(false);
  });
});
