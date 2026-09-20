import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOpsSession, clearOpsSessionCookie } = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
  clearOpsSessionCookie: vi.fn(),
}));

vi.mock("@/lib/ops/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/auth")>();
  return {
    ...actual,
    getOpsSession,
    clearOpsSessionCookie,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  changeUserActive,
  createUser,
  revokeUserSessions,
} from "@/app/app/users/actions";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_FIELD_USER_ID,
} from "@/lib/ops/demo-data";

const adminSession = {
  userId: DEMO_ADMIN_USER_ID,
  organizationId: "00000000-0000-4000-8000-000000000001",
  email: DEMO_ADMIN_EMAIL,
  role: "administrator" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Demo Administrator",
  legacy: false,
};

const officeSession = {
  ...adminSession,
  userId: "20202020-2020-4020-8020-202020202020",
  email: "office.only@example.com",
  role: "office" as const,
  displayName: "Office Only",
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("user administration actions", () => {
  beforeEach(() => {
    process.env.OPS_DEMO = "1";
    getOpsSession.mockReset();
    clearOpsSessionCookie.mockReset();
    clearOpsSessionCookie.mockResolvedValue(undefined);
  });

  it("rejects user lifecycle commands from a non-administrator", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    await expect(
      createUser(
        form({
          displayName: "Riley Office",
          email: "riley.blocked@example.com",
          role: "office",
          temporaryPassword: "TemporaryPass1",
        }),
      ),
    ).resolves.toMatchObject({
      error: "Administrator access is required.",
    });
    await expect(
      revokeUserSessions(form({ userId: DEMO_FIELD_USER_ID })),
    ).resolves.toMatchObject({
      error: "Administrator access is required.",
    });
    expect(clearOpsSessionCookie).not.toHaveBeenCalled();
  });

  it("creates a user and immediately revokes the current administrator session", async () => {
    getOpsSession.mockResolvedValue(adminSession);
    const created = await createUser(
      form({
        displayName: "Casey Office",
        email: `casey.office.${Date.now()}@example.com`,
        role: "office",
        temporaryPassword: "TemporaryPass1",
      }),
    );
    expect(created).toMatchObject({
      href: "/app/users",
      notice: { kind: "success" },
    });

    const revoked = await revokeUserSessions(
      form({ userId: DEMO_ADMIN_USER_ID }),
    );
    expect(revoked).toMatchObject({
      href: "/app/login",
      notice: {
        kind: "success",
        message: "Demo Administrator's sessions were revoked.",
      },
    });
    expect(clearOpsSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("prevents an administrator from deactivating their own account", async () => {
    getOpsSession.mockResolvedValue(adminSession);
    await expect(
      changeUserActive(form({ userId: DEMO_ADMIN_USER_ID, active: "false" })),
    ).resolves.toMatchObject({
      error: "You cannot deactivate your own account.",
    });
  });

  it("prevents deactivating the last administrator", async () => {
    process.env.OPS_ADMIN_EMAILS = "bootstrap@example.com";
    getOpsSession.mockResolvedValue({
      email: "bootstrap@example.com",
      role: "estimator",
      issuedAt: 1,
      expiresAt: 2,
      displayName: "bootstrap@example.com",
      legacy: true,
    });
    const { listDemoUsers, setDemoUserActive } = await import(
      "@/lib/ops/demo-store"
    );
    for (const user of listDemoUsers()) {
      if (user.role === "administrator" && user.userId !== DEMO_ADMIN_USER_ID) {
        setDemoUserActive(user.userId, false, DEMO_ADMIN_EMAIL);
      }
    }
    await expect(
      changeUserActive(form({ userId: DEMO_ADMIN_USER_ID, active: "false" })),
    ).resolves.toMatchObject({
      error: "At least one active administrator is required.",
    });
  });
});
