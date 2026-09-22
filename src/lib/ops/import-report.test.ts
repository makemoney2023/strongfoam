import { describe, expect, it } from "vitest";
import { reconciliationCsv } from "@/lib/ops/import-report";

describe("import reconciliation report", () => {
  it("writes the review columns and neutralizes spreadsheet formulas", () => {
    const csv = reconciliationCsv([
      {
        sheet: "Companies",
        sourceRow: 2,
        entityType: "company",
        sourceKey: "acme",
        operation: "create",
        status: "valid",
        targetId: "11111111-1111-4111-8111-111111111111",
        message: "Ready",
      },
      {
        sheet: "Companies",
        sourceRow: 3,
        entityType: "company",
        sourceKey: "=cmd()",
        operation: "skip",
        status: "error",
        targetId: "",
        message: "+sum(A1)",
      },
    ]);
    expect(csv.split("\n")[0]).toBe(
      "sheet,source_row,entity_type,source_key,operation,status,target_id,message",
    );
    expect(csv).toContain("acme,create,valid,11111111-1111-4111-8111-111111111111,Ready");
    expect(csv).toContain(`"'=cmd()"`);
    expect(csv).toContain(`"'+sum(A1)"`);
    expect(csv).not.toContain("unit_price");
    expect(csv).not.toContain("password");
  });
});
