import { describe, expect, it } from "vitest";
import {
  isOfficeMembershipRole,
  parseJobAssignmentInput,
  parsePasswordResetInput,
  parseUserInput,
  parseUserUpdateInput,
} from "@/lib/ops/identity";

describe("application identity", () => {
  it("normalizes a provisioned field user", () => {
    expect(
      parseUserInput({
        displayName: "  Jordan   Field ",
        email: " JORDAN@EXAMPLE.COM ",
        role: "field_worker",
        temporaryPassword: "StrongField123",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Jordan Field",
        email: "jordan@example.com",
        role: "field_worker",
        temporaryPassword: "StrongField123",
      },
    });
  });

  it("rejects weak temporary passwords", () => {
    expect(
      parseUserInput({
        displayName: "Jordan Field",
        email: "jordan@example.com",
        role: "field_worker",
        temporaryPassword: "short",
      }),
    ).toMatchObject({ ok: false, field: "temporaryPassword" });
  });

  it("validates user edits and password resets independently", () => {
    expect(
      parseUserUpdateInput({
        displayName: "  Alex   Rivera ",
        email: " ALEX@EXAMPLE.COM ",
        role: "administrator",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Alex Rivera",
        email: "alex@example.com",
        role: "administrator",
      },
    });
    expect(
      parsePasswordResetInput({ temporaryPassword: "ResetPassword123" }),
    ).toEqual({
      ok: true,
      value: { temporaryPassword: "ResetPassword123" },
    });
    expect(
      parsePasswordResetInput({ temporaryPassword: "too-short" }),
    ).toMatchObject({ ok: false, field: "temporaryPassword" });
  });

  it("separates Office roles from Field roles", () => {
    expect(isOfficeMembershipRole("administrator")).toBe(true);
    expect(isOfficeMembershipRole("office")).toBe(true);
    expect(isOfficeMembershipRole("field_worker")).toBe(false);
  });

  it("requires a stable user id for a job assignment", () => {
    expect(
      parseJobAssignmentInput({
        userId: "12121212-1212-4121-8121-121212121212",
        role: "technician",
      }),
    ).toEqual({
      ok: true,
      value: {
        userId: "12121212-1212-4121-8121-121212121212",
        role: "technician",
      },
    });
    expect(
      parseJobAssignmentInput({ userId: "Jordan", role: "technician" }),
    ).toMatchObject({ ok: false, field: "userId" });
  });
});
