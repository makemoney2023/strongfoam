import { describe, expect, it } from "vitest";
import {
  createFieldSessionToken,
  resolveFieldSession,
  signFieldSession,
  verifyFieldSessionToken,
} from "@/lib/ops/field-auth";

describe("field session", () => {
  it("signs a field identity independently from the office session", () => {
    const now = Date.UTC(2026, 8, 19);
    const session = createFieldSessionToken(
      {
        userId: "12121212-1212-4121-8121-121212121212",
        organizationId: "00000000-0000-4000-8000-000000000001",
        email: "field@example.com",
        role: "field_worker",
        sessionVersion: 3,
      },
      now,
    );
    const token = signFieldSession(session, "field-secret");
    expect(verifyFieldSessionToken(token, "field-secret", now)).toEqual(session);
    expect(verifyFieldSessionToken(token, "office-secret", now)).toBeNull();
  });

  it("rejects expired and office-role sessions", () => {
    const expired = signFieldSession(
      {
        userId: "12121212-1212-4121-8121-121212121212",
        organizationId: "00000000-0000-4000-8000-000000000001",
        email: "field@example.com",
        role: "field_worker",
        sessionVersion: 1,
        issuedAt: 1,
        expiresAt: 2,
      },
      "secret",
    );
    expect(verifyFieldSessionToken(expired, "secret", 3)).toBeNull();

    const office = signFieldSession(
      {
        userId: "12121212-1212-4121-8121-121212121212",
        organizationId: "00000000-0000-4000-8000-000000000001",
        email: "office@example.com",
        role: "office",
        sessionVersion: 1,
        issuedAt: 1,
        expiresAt: 10,
      },
      "secret",
    );
    expect(verifyFieldSessionToken(office, "secret", 3)).toBeNull();
  });

  it("rejects a field session after revocation or deactivation", () => {
    const identity = {
      userId: "12121212-1212-4121-8121-121212121212",
      organizationId: "00000000-0000-4000-8000-000000000001",
      email: "field@example.com",
      displayName: "Jordan Field",
      role: "field_worker" as const,
      active: true,
      membershipActive: true,
      sessionVersion: 3,
    };
    const session = createFieldSessionToken(identity, Date.UTC(2026, 8, 19));
    expect(resolveFieldSession(session, identity)?.displayName).toBe(
      "Jordan Field",
    );
    expect(
      resolveFieldSession(session, { ...identity, sessionVersion: 4 }),
    ).toBeNull();
    expect(
      resolveFieldSession(session, { ...identity, membershipActive: false }),
    ).toBeNull();
  });
});
