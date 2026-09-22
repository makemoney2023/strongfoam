import { describe, expect, it } from "vitest";
import {
  addDemoPriceBookItem,
  listDemoPriceBookItems,
  updateDemoPriceBookItem,
} from "@/lib/ops/demo-store";
import {
  formatUnitPrice,
  parsePriceBookItem,
  parseUnitPriceCents,
} from "@/lib/ops/price-book";

describe("price book", () => {
  it("parses a Canadian dollar unit price into cents", () => {
    expect(parseUnitPriceCents("$1,850.50")).toEqual({ ok: true, cents: 185050 });
    expect(parseUnitPriceCents("0")).toEqual({ ok: true, cents: 0 });
    expect(parseUnitPriceCents("12.345").ok).toBe(false);
    expect(parseUnitPriceCents("-4").ok).toBe(false);
  });

  it("requires a trade, name, and unit", () => {
    const parsed = parsePriceBookItem({
      trade: "spray-foam",
      name: "  Closed-cell spray foam  ",
      unit: "bags",
      unitPrice: "185.00",
      active: "1",
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        trade: "spray-foam",
        name: "Closed-cell spray foam",
        unit: "bags",
        unitPriceCents: 18500,
        active: true,
      },
    });
    expect(parsePriceBookItem({ trade: "roofing", name: "Kit", unit: "each", unitPrice: "1" }).ok).toBe(
      false,
    );
    expect(formatUnitPrice(18500)).toContain("185.00");
    expect(formatUnitPrice(18500)).not.toMatch(/USD/);
  });

  it("lists seeded items and hides a retired item until asked", () => {
    const active = listDemoPriceBookItems();
    expect(active.some((item) => item.name === "Closed-cell spray foam")).toBe(true);
    expect(active.some((item) => !item.active)).toBe(false);
    const all = listDemoPriceBookItems({ includeInactive: true });
    expect(all.some((item) => item.name === "Legacy sample kit" && !item.active)).toBe(true);
    expect(listDemoPriceBookItems({ trade: "avb" }).map((item) => item.name)).toEqual([
      "Air and vapor barrier",
    ]);
  });

  it("adds and updates an item in the demo book", () => {
    const created = addDemoPriceBookItem({
      createdBy: "admin@strongfoam.demo",
      trade: "spf-roofing",
      name: "Silicone roof coating",
      unit: "sq_ft",
      unitPriceCents: 640,
      active: true,
    });
    expect(listDemoPriceBookItems({ q: "Silicone" })).toEqual([
      expect.objectContaining({ id: created.id, unitPriceCents: 640 }),
    ]);
    const updated = updateDemoPriceBookItem(created.id, {
      trade: "spf-roofing",
      name: "Silicone roof coating",
      unit: "sq_ft",
      unitPriceCents: 700,
      active: false,
    });
    expect(updated?.unitPriceCents).toBe(700);
    expect(listDemoPriceBookItems({ q: "Silicone" })).toEqual([]);
    expect(listDemoPriceBookItems({ q: "Silicone", includeInactive: true })[0]?.active).toBe(false);
  });
});
