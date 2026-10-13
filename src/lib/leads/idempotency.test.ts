import { describe, expect, it } from "vitest";
import { parseLeadPayload } from "@/lib/leads/schema";
import { idempotencyKey } from "@/lib/leads/idempotency";

function payload(overrides: Record<string, unknown> = {}) {
  const parsed = parseLeadPayload({
    intakeType: "estimate",
    projectType: "commercial_ici",
    city: "Kitchener",
    province: "ON",
    services: ["spray-foam"],
    role: "gc",
    timeline: "0_3_months",
    drawingsReady: "no",
    company: "Acme",
    companyWebsite: "",
    startedAt: 99,
    draftId: "11111111-1111-4111-8111-111111111111",
    uploadPaths: ["leads/11111111-1111-4111-8111-111111111111/a.pdf"],
    firstName: "Alex",
    lastName: "Lee",
    email: "Alex@GC.example",
    phone: "519-555-0100",
    consent: true,
    ...overrides,
  });
  if (!parsed.ok) throw new Error("fixture invalid");
  return parsed.data;
}

describe("idempotencyKey", () => {
  it("is stable across file paths and startedAt", () => {
    const a = idempotencyKey(payload());
    const b = idempotencyKey(
      payload({
        startedAt: 1,
        uploadPaths: [],
        draftId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when email or city changes", () => {
    const a = idempotencyKey(payload());
    const b = idempotencyKey(payload({ email: "other@gc.example" }));
    const c = idempotencyKey(payload({ city: "London" }));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("replays an identical general inquiry and ignores estimate fields", () => {
    const general = {
      intakeType: "general",
      message: "Partnership question",
      company: "Example Co",
      companyWebsite: "",
      startedAt: 10,
      draftId: "11111111-1111-4111-8111-111111111111",
      firstName: "Alex",
      lastName: "Lee",
      email: "Alex@Example.com",
      phone: "519-555-0100",
      consent: true,
    };
    const first = parseLeadPayload(general);
    const second = parseLeadPayload({
      ...general,
      startedAt: 99,
      draftId: "22222222-2222-4222-8222-222222222222",
      projectType: "commercial_ici",
      city: "Kitchener",
    });
    const changed = parseLeadPayload({ ...general, message: "Different question" });
    if (!first.ok || !second.ok || !changed.ok) throw new Error("fixture invalid");

    expect(idempotencyKey(first.data)).toBe(idempotencyKey(second.data));
    expect(idempotencyKey(first.data)).not.toBe(idempotencyKey(changed.data));
    expect(idempotencyKey(first.data)).not.toBe(idempotencyKey(payload()));
  });
});
