import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/ops/action-result";

describe("safeReturnTo", () => {
  it("keeps office and field return paths", () => {
    expect(safeReturnTo("/app/users", "/app")).toBe("/app/users");
    expect(safeReturnTo("/field/jobs/bbbb/plan", "/field")).toBe(
      "/field/jobs/bbbb/plan",
    );
    expect(safeReturnTo("/field", "/app")).toBe("/field");
  });

  it("rejects off-site or unexpected paths", () => {
    expect(safeReturnTo("https://example.com/app", "/app/users")).toBe(
      "/app/users",
    );
    expect(safeReturnTo("/login", "/app/login")).toBe("/app/login");
  });
});
