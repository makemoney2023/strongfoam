import { describe, expect, it } from "vitest";
import {
  authenticateOpsCredentials,
  canManageUsers,
  configuredStaffEmails,
  configuredAdminEmails,
  createOpsSession,
  createUserOpsSession,
  isConfiguredStaffEmail,
  resolveUserOpsSession,
  signOpsSession,
  verifyOpsSession,
} from "@/lib/ops/auth";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
} from "@/lib/ops/demo-data";

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

  it("limits legacy user administration to configured bootstrap admins", () => {
    const env = {
      OPS_STAFF_EMAILS: "office@example.com,admin@example.com",
      OPS_ADMIN_EMAILS: "admin@example.com",
    };
    expect(configuredAdminEmails(env)).toEqual(["admin@example.com"]);
    expect(canManageUsers(createOpsSession("admin@example.com"), env)).toBe(true);
    expect(canManageUsers(createOpsSession("office@example.com"), env)).toBe(
      false,
    );
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

  it("signs revocable individual administrator sessions", () => {
    const session = createUserOpsSession(
      {
        userId: "10101010-1010-4010-8010-101010101010",
        organizationId: "00000000-0000-4000-8000-000000000001",
        email: "admin@example.com",
        displayName: "Admin",
        passwordHash: "unused",
        active: true,
        membershipActive: true,
        role: "administrator",
        sessionVersion: 4,
      },
      1_700_000_000_000,
    );
    expect(
      verifyOpsSession(
        signOpsSession(session, secret),
        secret,
        1_700_000_000_000,
      ),
    ).toEqual(session);
    expect(canManageUsers(session)).toBe(true);
  });

  it("rejects revoked or deactivated individual sessions", () => {
    const identity = {
      userId: "10101010-1010-4010-8010-101010101010",
      organizationId: "00000000-0000-4000-8000-000000000001",
      email: "admin@example.com",
      displayName: "Admin",
      passwordHash: "unused",
      active: true,
      membershipActive: true,
      role: "administrator" as const,
      sessionVersion: 4,
    };
    const session = createUserOpsSession(identity, 1_700_000_000_000);
    expect(resolveUserOpsSession(session, identity)?.displayName).toBe("Admin");
    expect(
      resolveUserOpsSession(session, { ...identity, sessionVersion: 5 }),
    ).toBeNull();
    expect(
      resolveUserOpsSession(session, { ...identity, active: false }),
    ).toBeNull();
    expect(
      resolveUserOpsSession(session, { ...identity, role: "field_worker" }),
    ).toBeNull();
  });
});

describe("ops credential authentication", () => {
  it("authenticates an individual demo administrator", async () => {
    await expect(
      authenticateOpsCredentials(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, {}),
    ).resolves.toMatchObject({
      kind: "user",
      identity: {
        email: DEMO_ADMIN_EMAIL,
        role: "administrator",
      },
    });
  });

  it("uses the legacy credential only when no user identity exists", async () => {
    await expect(
      authenticateOpsCredentials("legacy@example.com", "SharedPassword123", {
        OPS_STAFF_EMAILS: "legacy@example.com",
        OPS_STAFF_PASSWORD: "SharedPassword123",
      }),
    ).resolves.toEqual({
      kind: "legacy",
      email: "legacy@example.com",
    });
    await expect(
      authenticateOpsCredentials(DEMO_ADMIN_EMAIL, "SharedPassword123", {
        OPS_STAFF_EMAILS: DEMO_ADMIN_EMAIL,
        OPS_STAFF_PASSWORD: "SharedPassword123",
      }),
    ).resolves.toBeNull();
  });
});
