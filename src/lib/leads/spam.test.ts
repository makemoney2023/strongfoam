import { describe, expect, it } from "vitest";
import { assertNotSpam } from "@/lib/leads/spam";

describe("assertNotSpam", () => {
  it("rejects a filled honeypot", () => {
    expect(
      assertNotSpam({
        companyWebsite: "https://spam.test",
        startedAt: 1,
        now: 20_000,
      }),
    ).toBe("honeypot");
  });

  it("rejects fills faster than 8 seconds", () => {
    expect(
      assertNotSpam({ companyWebsite: "", startedAt: 10_000, now: 14_000 }),
    ).toBe("too_fast");
  });

  it("allows a slow empty-honeypot submit", () => {
    expect(
      assertNotSpam({ companyWebsite: "", startedAt: 1_000, now: 10_000 }),
    ).toBe("ok");
  });
});
