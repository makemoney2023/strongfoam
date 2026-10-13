import { describe, expect, it, vi } from "vitest";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  buildLeadInsertValues,
  createCloudflareMailer,
  createRateLimiter,
  requireEnv,
  UpstashRateLimiter,
} from "@/lib/leads/adapters";
import { MemoryRateLimiter } from "@/lib/leads/rate-limit";

describe("requireEnv", () => {
  it("throws for a missing variable", () => {
    expect(() => requireEnv("SOME_MISSING_TEST_VAR")).toThrow(
      "SOME_MISSING_TEST_VAR is not set",
    );
  });

  it("returns the value when present", () => {
    process.env.SOME_PRESENT_TEST_VAR = "value";
    expect(requireEnv("SOME_PRESENT_TEST_VAR")).toBe("value");
    delete process.env.SOME_PRESENT_TEST_VAR;
  });
});

describe("createRateLimiter", () => {
  it("returns a MemoryRateLimiter when Upstash env is absent", () => {
    expect(createRateLimiter({})).toBeInstanceOf(MemoryRateLimiter);
  });

  it("returns an UpstashRateLimiter when Upstash env is present", () => {
    const limiter = createRateLimiter({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });
    expect(limiter).toBeInstanceOf(UpstashRateLimiter);
  });
});

describe("buildLeadInsertValues", () => {
  const now = 1_700_000_000_000;

  function fullPayload() {
    return {
      projectType: "commercial_ici" as const,
      city: "Kitchener",
      province: "ON" as const,
      services: ["spray-foam"] as const,
      role: "gc" as const,
      buildingType: "",
      timeline: "0_3_months" as const,
      drawingsReady: "no" as const,
      notes: "",
      company: "Acme",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@gc.example",
      phone: "519-555-0100",
      consent: true as const,
      draftId: "11111111-1111-4111-8111-111111111111",
      uploadPaths: ["leads/11111111-1111-4111-8111-111111111111/plan.pdf"],
    };
  }

  it("maps a full-path payload onto Drizzle insert values", () => {
    const values = buildLeadInsertValues(
      {
        status: "qualified",
        bookingStatus: "offered",
        notifyStatus: "pending",
        email: "alex@gc.example",
        idempotencyKey: "abc123",
        payload: fullPayload(),
      },
      now,
    );

    expect(values).toMatchObject({
      status: "qualified",
      bookingStatus: "offered",
      notifyStatus: "pending",
      email: "alex@gc.example",
      phone: "519-555-0100",
      firstName: "Alex",
      lastName: "Lee",
      company: "Acme",
      projectType: "commercial_ici",
      city: "Kitchener",
      province: "ON",
      services: ["spray-foam"],
      recommendedServices: ["spray-foam"],
      idempotencyKey: "abc123",
      files: [{ pathname: "leads/11111111-1111-4111-8111-111111111111/plan.pdf" }],
      workflowStatus: "new",
      assignedTo: null,
      nextAction: null,
      nextActionDueAt: null,
      lostReason: null,
    });
    expect(values.consentAt).toEqual(new Date(now));
  });

  it("defaults services to an empty array for the short-path payload", () => {
    const values = buildLeadInsertValues({
      status: "secondary",
      bookingStatus: "none",
      notifyStatus: "pending",
      email: "sam@home.example",
      idempotencyKey: "xyz789",
      payload: {
        projectType: "residential_other" as const,
        city: "Ottawa",
        province: "ON" as const,
        notes: "",
        company: "",
        services: [] as const,
        firstName: "Sam",
        lastName: "Home",
        email: "sam@home.example",
        phone: "519-555-0200",
        consent: true as const,
        draftId: "22222222-2222-4222-8222-222222222222",
        uploadPaths: [],
      },
    });

    expect(values.services).toEqual([]);
    expect(values.recommendedServices).toEqual([]);
    expect(values.files).toEqual([]);
  });

  it("maps a general inquiry onto the existing lead columns without project fields", () => {
    const values = buildLeadInsertValues(
      {
        status: "secondary",
        bookingStatus: "none",
        notifyStatus: "pending",
        email: "alex@example.com",
        idempotencyKey: "general-1",
        payload: {
          intakeType: "general",
          message: "Please call about a partnership question.",
          company: "Example Co",
          firstName: "Alex",
          lastName: "Lee",
          email: "alex@example.com",
          phone: "519-555-0100",
          consent: true,
          startedAt: now,
          draftId: "11111111-1111-4111-8111-111111111111",
          uploadPaths: [],
        },
      },
      now,
    );

    expect(values).toMatchObject({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      status: "secondary",
      bookingStatus: "none",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@example.com",
      phone: "519-555-0100",
      company: "Example Co",
      projectType: "general_inquiry",
      city: "",
      province: "not_applicable",
      services: [],
      recommendedServices: [],
      files: [],
      answers: {
        intakeType: "general",
        message: "Please call about a partnership question.",
      },
    });
  });
});

describe("createCloudflareMailer", () => {
  it("sends the trimmed recipient array through the EMAIL binding", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "email-1" });
    const mailer = createCloudflareMailer(
      { LEAD_NOTIFY_TO: " estimating@strongfoam.com, office@strongfoam.com, estimating@strongfoam.com " },
      {
        EMAIL: { send },
        EMAIL_FROM: "Strong Foam <estimates@strongfoam.com>",
      },
    );

    await mailer.sendEstimating({
      intakeType: "general",
      status: "secondary",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@example.com",
      company: "",
      city: "",
      services: [],
      reasons: ["general_inquiry"],
      fileLinks: [],
      calendlyOffered: false,
      message: "Hello",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["estimating@strongfoam.com", "office@strongfoam.com"],
        from: "Strong Foam <estimates@strongfoam.com>",
        subject: "General inquiry · Alex Lee",
      }),
    );
  });

  it("rejects an empty notification list before sending", async () => {
    const send = vi.fn();
    const mailer = createCloudflareMailer(
      { LEAD_NOTIFY_TO: " , " },
      { EMAIL: { send } },
    );

    await expect(
      mailer.sendEstimating({
        intakeType: "estimate",
        status: "qualified",
        firstName: "Alex",
        lastName: "Lee",
        email: "alex@gc.example",
        company: "Acme",
        city: "Kitchener",
        services: ["spray-foam"],
        reasons: [],
        fileLinks: [],
        calendlyOffered: true,
      }),
    ).rejects.toThrow(/recipient/i);
    expect(send).not.toHaveBeenCalled();
  });
});
