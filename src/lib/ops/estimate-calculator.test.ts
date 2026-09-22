import { describe, expect, it } from "vitest";
import {
  EstimateCalculationError,
  calculateBasisPoints,
  calculateEstimate,
  calculateUnitLine,
} from "@/lib/ops/estimate-calculator";

describe("estimate calculator", () => {
  it("rounds unit lines and basis points half up", () => {
    expect(calculateUnitLine({ quantity: "2.5000", unitPriceCents: 18500 })).toBe(46250);
    expect(calculateBasisPoints(46250, 1250)).toBe(5781);
    expect(calculateBasisPoints(1, 5000)).toBe(1);
  });

  it("rejects negative quantity, excessive precision, and a client total", () => {
    expect(() => calculateUnitLine({ quantity: "-1.0000", unitPriceCents: 100 })).toThrow(
      EstimateCalculationError,
    );
    expect(() => calculateUnitLine({ quantity: "1.00001", unitPriceCents: 100 })).toThrow(
      "quantity",
    );
    expect(() =>
      calculateEstimate({
        overheadBasisPoints: 0,
        markupBasisPoints: 0,
        taxBasisPoints: 0,
        alternates: [],
        lines: [
          {
            key: "fixed",
            category: "allowance",
            method: "fixed",
            quantity: null,
            unitPriceCents: 1000,
            basisPoints: null,
            basisCategories: [],
            taxable: false,
            alternateKey: null,
            clientLineTotalCents: 1,
          },
        ],
      }),
    ).toThrow("client-total");
  });

  it("prices allowances and included alternates, and leaves excluded alternates out", () => {
    const result = calculateEstimate({
      overheadBasisPoints: 0,
      markupBasisPoints: 0,
      taxBasisPoints: 0,
      alternates: [
        { key: "in", included: true },
        { key: "out", included: false },
      ],
      lines: [
        {
          key: "foam",
          category: "material",
          method: "unit",
          quantity: "2.5000",
          unitPriceCents: 18500,
          basisPoints: null,
          basisCategories: [],
          taxable: true,
          alternateKey: null,
        },
        {
          key: "allowance",
          category: "allowance",
          method: "fixed",
          quantity: null,
          unitPriceCents: 1000,
          basisPoints: null,
          basisCategories: [],
          taxable: false,
          alternateKey: null,
        },
        {
          key: "markup",
          category: "material",
          method: "percent",
          quantity: null,
          unitPriceCents: null,
          basisPoints: 1250,
          basisCategories: ["material"],
          taxable: false,
          alternateKey: null,
        },
        {
          key: "included",
          category: "labor",
          method: "fixed",
          quantity: null,
          unitPriceCents: 2000,
          basisPoints: null,
          basisCategories: [],
          taxable: false,
          alternateKey: "in",
        },
        {
          key: "excluded",
          category: "labor",
          method: "fixed",
          quantity: null,
          unitPriceCents: 9000,
          basisPoints: null,
          basisCategories: [],
          taxable: true,
          alternateKey: "out",
        },
      ],
    });

    expect(result.lines.find((line) => line.key === "excluded")?.lineTotalCents).toBe(9000);
    expect(result.baseSubtotalCents).toBe(46250 + 1000 + 5781);
    expect(result.alternateTotalCents).toBe(2000);
    expect(result.totalCents).toBe(46250 + 1000 + 5781 + 2000);
  });

  it("applies overhead, then markup, then tax on the taxable share", () => {
    const result = calculateEstimate({
      overheadBasisPoints: 1000,
      markupBasisPoints: 0,
      taxBasisPoints: 5000,
      alternates: [],
      lines: [
        {
          key: "taxable",
          category: "material",
          method: "fixed",
          quantity: null,
          unitPriceCents: 10000,
          basisPoints: null,
          basisCategories: [],
          taxable: true,
          alternateKey: null,
        },
      ],
    });

    expect(result.overheadCents).toBe(1000);
    expect(result.markupCents).toBe(0);
    expect(result.taxCents).toBe(5500);
    expect(result.totalCents).toBe(16500);
  });
});
