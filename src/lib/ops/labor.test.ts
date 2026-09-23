import { describe, expect, it } from "vitest";
import {
  formatLaborEntry,
  formatLaborHours,
  parseLaborHours,
  parseLaborKind,
  parsePieceQuantity,
} from "@/lib/ops/labor";
import { resolveLaborAccess } from "@/lib/ops/labor-authorization";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

describe("labor measures", () => {
  it("accepts piece work in bags or square feet and hours up to 24", () => {
    expect(parseLaborKind("piece")).toEqual({ ok: true, value: "piece" });
    expect(parsePieceQuantity({ quantity: "40", unit: "bags" })).toEqual({
      ok: true,
      quantity: 40,
      unit: "bags",
    });
    expect(parsePieceQuantity({ quantity: "12", unit: "sq_ft" }).ok).toBe(true);
    expect(parsePieceQuantity({ quantity: "0", unit: "bags" }).ok).toBe(false);
    expect(parsePieceQuantity({ quantity: "4", unit: "each" }).ok).toBe(false);
    expect(parseLaborHours("7.5")).toEqual({ ok: true, minutes: 450 });
    expect(parseLaborHours("24")).toEqual({ ok: true, minutes: 1440 });
    expect(parseLaborHours("0").ok).toBe(false);
    expect(parseLaborHours("24.5").ok).toBe(false);
    expect(formatLaborHours(450)).toBe("7 hours 30 minutes");
    expect(
      formatLaborEntry({ kind: "piece", minutes: null, quantity: 1, unit: "bags" }),
    ).toBe("1 bag");
  });

  it("lets a field member record labor and keeps pay out of the permission", () => {
    const org = STRONG_FOAM_ORGANIZATION_ID;
    expect(resolveLaborAccess({ role: "field_worker", organizationId: org }, "labor.edit").ok).toBe(true);
    expect(resolveLaborAccess({ role: "office", organizationId: org }, "labor.edit").ok).toBe(true);
    expect(resolveLaborAccess({ role: "estimator" }, "labor.read").ok).toBe(true);
  });
});
