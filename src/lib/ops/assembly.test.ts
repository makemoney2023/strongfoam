import { describe, expect, it } from "vitest";
import { parseAssembly } from "@/lib/ops/assembly";

describe("insulation assembly", () => {
  it("requires a location, target R-value, area, bags, and product", () => {
    expect(parseAssembly({ location: "porch" })).toMatchObject({ ok: false });
    const parsed = parseAssembly({
      location: "attic",
      targetRValue: " R-50 ",
      areaSqFt: "1200",
      bagCount: "40",
      product: " Open cell ",
      rebateProgram: "Enbridge",
    });
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value).toMatchObject({
      location: "attic",
      targetRValue: "R-50",
      areaSqFt: 1200,
      bagCount: 40,
      product: "Open cell",
      rebateProgram: "Enbridge",
    });
    expect(parseAssembly({
      location: "attic",
      targetRValue: "R-50",
      areaSqFt: "0",
      bagCount: "40",
      product: "Open cell",
    })).toMatchObject({ ok: false });
  });
});
