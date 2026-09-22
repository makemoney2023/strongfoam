import { describe, expect, it } from "vitest";
import { createOpsSession, createUserOpsSession } from "@/lib/ops/auth";
import { redactAuditPayload, recordAuditEvent } from "@/lib/ops/audit";
import {
  assertSameOrganization,
  resolveCommercialAccess,
} from "@/lib/ops/commercial-authorization";
import { DEMO_OPPORTUNITY_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { getAuthorizedOpportunity } from "@/lib/ops/store";

const adminSession = createUserOpsSession(
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

const officeSession = createUserOpsSession(
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

const fieldSession = {
  userId: "12121212-1212-4121-8121-121212121212",
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  email: "field@strongfoam.demo",
  role: "field_worker" as const,
  sessionVersion: 1,
};

describe("commercial authorization", () => {
  it("lets an administrator approve inside their organization", () => {
    expect(resolveCommercialAccess(adminSession, "estimate.approve")).toEqual({
      ok: true,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
    });
  });

  it("lets office edit an estimate and refuses approval", () => {
    expect(resolveCommercialAccess(officeSession, "estimate.edit").ok).toBe(
      true,
    );
    expect(resolveCommercialAccess(officeSession, "estimate.approve").ok).toBe(
      false,
    );
  });

  it("refuses field access to commercial records", () => {
    expect(resolveCommercialAccess(fieldSession, "estimate.read").ok).toBe(
      false,
    );
  });

  it("rejects a cross-organization match", () => {
    expect(assertSameOrganization("org-a", "org-b").ok).toBe(false);
    expect(assertSameOrganization("org-a", "org-a").ok).toBe(true);
  });

  it("locks a legacy estimator to the seeded organization", () => {
    const legacy = createOpsSession("estimating@strongfoam.com");
    expect(
      resolveCommercialAccess(
        legacy,
        "estimate.edit",
        "11111111-1111-4111-8111-111111111199",
      ),
    ).toEqual({
      ok: true,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
    });
    expect(resolveCommercialAccess(legacy, "estimate.approve").ok).toBe(false);
  });

  it("loads an opportunity only inside its organization", async () => {
    const found = await getAuthorizedOpportunity(
      STRONG_FOAM_ORGANIZATION_ID,
      DEMO_OPPORTUNITY_ID,
    );
    expect(found?.id).toBe(DEMO_OPPORTUNITY_ID);
    expect(
      await getAuthorizedOpportunity(
        "11111111-1111-4111-8111-111111111199",
        DEMO_OPPORTUNITY_ID,
      ),
    ).toBeNull();
  });

  it("ignores a claimed organization on a user session", () => {
    expect(
      resolveCommercialAccess(
        {
          ...officeSession,
          organizationId: "org-a",
        },
        "estimate.read",
        "org-b",
      ),
    ).toEqual({ ok: true, organizationId: "org-a" });
  });
});

describe("audit redaction", () => {
  it("redacts tokens, passwords, file bytes, document text, and provider keys", () => {
    expect(
      redactAuditPayload({
        token: "signed-value",
        password: "hunter2",
        bytes: "AAAA",
        text: "full page transcription",
        providerKey: "sk-live",
        nested: { accessToken: "secret-token", filename: "plan.pdf" },
        filename: "plan.pdf",
        contentHash: "abc",
        contentType: "application/pdf",
      }),
    ).toEqual({
      token: "[redacted]",
      password: "[redacted]",
      bytes: "[redacted]",
      text: "[redacted]",
      providerKey: "[redacted]",
      nested: { accessToken: "[redacted]", filename: "plan.pdf" },
      filename: "plan.pdf",
      contentHash: "abc",
      contentType: "application/pdf",
    });
  });

  it("stores only a redacted insert", async () => {
    const recorded = await recordAuditEvent({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      actor: "admin@strongfoam.demo",
      action: "estimate.read",
      entityType: "opportunity",
      entityId: "99999999-9999-4999-8999-999999999999",
      result: "success",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
      payload: { signedToken: "raw-token", sheet: "A-101" },
    });
    expect(recorded.payload).toEqual({
      signedToken: "[redacted]",
      sheet: "A-101",
    });
    expect(recorded.organizationId).toBe(STRONG_FOAM_ORGANIZATION_ID);
  });
});
