import { describe, expect, it } from "vitest";
import {
  configuredStaffEmails,
  createOpsSession,
  isConfiguredStaffEmail,
  signOpsSession,
  verifyOpsSession,
} from "@/lib/ops/auth";

const secret = "ops-session-secret-for-tests";

describe("staff email configuration", () => {
  it("normalizes and splits configured emails", () => {
    expect(
      configuredStaffEmails({
        OPS_STAFF_EMAILS: " Alex@StrongFoam.com , estimating@strongfoam.com ",
      }),
    ).toEqual(["alex@strongfoam.com", "estimating@strongfoam.com"]);
  });

  it("accepts only configured staff emails", () => {
    const env = { OPS_STAFF_EMAILS: "estimating@strongfoam.com" };
    expect(isConfiguredStaffEmail("Estimating@StrongFoam.com", env)).toBe(true);
    expect(isConfiguredStaffEmail("visitor@example.com", env)).toBe(false);
  });
});

describe("ops session tokens", () => {
  it("signs and verifies a current session", () => {
    const session = createOpsSession("Estimating@StrongFoam.com", 1_700_000_000_000);
    const token = signOpsSession(session, secret);
    expect(verifyOpsSession(token, secret, 1_700_000_000_000)).toEqual(session);
  });

  it("rejects expired and tampered sessions", () => {
    const session = createOpsSession("estimating@strongfoam.com", 1_700_000_000_000);
    const token = signOpsSession(session, secret);
    expect(verifyOpsSession(token, secret, session.expiresAt + 1)).toBeNull();
    expect(verifyOpsSession(`${token}x`, secret, 1_700_000_000_000)).toBeNull();
  });
});
