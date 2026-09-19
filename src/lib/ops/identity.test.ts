import { describe, expect, it } from "vitest";
import {
  parseJobAssignmentInput,
  parseUserInput,
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
