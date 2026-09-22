import { describe, expect, it } from "vitest";
import { createOpsSession, createUserOpsSession } from "@/lib/ops/auth";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const admin = createUserOpsSession(
  {
    userId: "10101010-1010-4010-8010-101010101010",
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    email: "admin@strongfoam.demo",
    displayName: "Admin",
    passwordHash: "unused",
    active: true,
    membershipActive: true,
    role: "administrator",
    sessionVersion: 1,
  },
  1_700_000_000_000,
);

const office = createUserOpsSession(
  {
    userId: "20202020-2020-4020-8020-202020202020",
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    email: "office@strongfoam.demo",
    displayName: "Office",
    passwordHash: "unused",
    active: true,
    membershipActive: true,
    role: "office",
    sessionVersion: 1,
  },
  1_700_000_000_000,
);

const field = {
  userId: "12121212-1212-4121-8121-121212121212",
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  email: "field@strongfoam.demo",
  role: "field_worker" as const,
  sessionVersion: 1,
};

describe("import authorization", () => {
  it("lets an administrator prepare and commit", () => {
    expect(resolveImportAccess(admin, "data.import.prepare").ok).toBe(true);
    expect(resolveImportAccess(admin, "data.import.commit").ok).toBe(true);
  });

  it("lets office prepare and refuses commit", () => {
    expect(resolveImportAccess(office, "data.import.prepare").ok).toBe(true);
    expect(resolveImportAccess(office, "data.import.commit").ok).toBe(false);
  });

  it("refuses field access", () => {
    expect(resolveImportAccess(field, "data.import.prepare").ok).toBe(false);
    expect(resolveImportAccess(field, "data.import.commit").ok).toBe(false);
  });

  it("keeps the session organization when a form claims another", () => {
    expect(
      resolveImportAccess(
        admin,
        "data.import.prepare",
        "11111111-1111-4111-8111-111111111199",
      ),
    ).toEqual({
      ok: true,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
    });
  });

  it("lets a configured legacy administrator commit and other staff prepare", () => {
    const legacyAdmin = createOpsSession("owner@strongfoam.example");
    const legacyOffice = createOpsSession("office@strongfoam.example");
    const env = {
      OPS_ADMIN_EMAILS: "owner@strongfoam.example",
      OPS_STAFF_EMAILS: "owner@strongfoam.example,office@strongfoam.example",
    };
    expect(resolveImportAccess(legacyAdmin, "data.import.commit", null, env).ok).toBe(
      true,
    );
    expect(resolveImportAccess(legacyOffice, "data.import.prepare", null, env).ok).toBe(
      true,
    );
    expect(resolveImportAccess(legacyOffice, "data.import.commit", null, env).ok).toBe(
      false,
    );
  });
});
