import { describe, expect, it } from "vitest";
import {
  parseCompanyInput,
  parseContactInput,
  parseOpportunityUpdate,
  parseProjectUpdate,
  parseSiteInput,
} from "@/lib/ops/records";

describe("CRM record parsers", () => {
  it("requires a company name and a valid email when provided", () => {
    expect(parseCompanyInput({ name: "" }).ok).toBe(false);
    expect(parseCompanyInput({ name: "Acme", email: "not-an-email" }).ok).toBe(
      false,
    );
    expect(
      parseCompanyInput({
        name: "Acme Construction",
        email: "office@acme.example",
        city: "Kitchener",
        province: "ON",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Acme Construction",
        email: "office@acme.example",
        phone: null,
        city: "Kitchener",
        province: "ON",
      },
    });
  });

  it("requires contact names and a valid email", () => {
    expect(parseContactInput({ firstName: "Alex" }).ok).toBe(false);
    expect(
      parseContactInput({
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@acme.example",
        phone: "519-555-0100",
        role: "GC",
      }).ok,
    ).toBe(true);
  });

  it("requires a site name, city, and province", () => {
    expect(parseSiteInput({ name: "Podium", city: "Kitchener" }).ok).toBe(false);
    expect(
      parseSiteInput({
        name: "Podium",
        city: "Kitchener",
        province: "ON",
      }),
    ).toEqual({
      ok: true,
      value: { name: "Podium", city: "Kitchener", province: "ON" },
    });
  });

  it("validates opportunity and project updates", () => {
    expect(parseOpportunityUpdate({ name: "Acme", stage: "quoted" }).ok).toBe(
      false,
    );
    expect(
      parseOpportunityUpdate({
        name: "Acme podium",
        stage: "proposal",
        owner: "Alex Rivera",
      }).ok,
    ).toBe(true);
    expect(parseProjectUpdate({ name: "Acme", status: "archived" }).ok).toBe(
      false,
    );
    expect(
      parseProjectUpdate({
        name: "Acme podium",
        status: "on_hold",
        projectManager: "Alex Rivera",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Acme podium",
        status: "on_hold",
        projectManager: "Alex Rivera",
      },
    });
  });
});
