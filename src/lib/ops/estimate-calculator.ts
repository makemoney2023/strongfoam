export const ESTIMATE_LINE_CATEGORIES = [
  "labor",
  "material",
  "equipment",
  "subcontractor",
  "allowance",
] as const;

export type EstimateLineCategory = (typeof ESTIMATE_LINE_CATEGORIES)[number];

export const ESTIMATE_CALCULATION_ORDER = ["lines", "overhead", "markup", "tax"] as const;

const QUANTITY_SCALE = BigInt(10000);
const BASIS_POINT_SCALE = BigInt(10000);

export class EstimateCalculationError extends Error {
  constructor(
    readonly code:
      | "quantity"
      | "price"
      | "basis-points"
      | "client-total"
      | "alternate"
      | "line",
  ) {
    super(code);
    this.name = "EstimateCalculationError";
  }
}

export type EstimateCalculationLine = {
  key: string;
  category: EstimateLineCategory;
  method: "unit" | "fixed" | "percent";
  quantity: string | null;
  unitPriceCents: number | null;
  basisPoints: number | null;
  basisCategories: EstimateLineCategory[];
  taxable: boolean;
  alternateKey: string | null;
  clientLineTotalCents?: number;
};

export type EstimateCalculationInput = {
  lines: EstimateCalculationLine[];
  alternates: Array<{ key: string; included: boolean }>;
  overheadBasisPoints: number;
  markupBasisPoints: number;
  taxBasisPoints: number;
};

export type CalculatedEstimateLine = EstimateCalculationLine & {
  lineTotalCents: number;
  includedInTotal: boolean;
};

export type EstimateCalculation = {
  lines: CalculatedEstimateLine[];
  baseSubtotalCents: number;
  alternateTotalCents: number;
  overheadCents: number;
  markupCents: number;
  taxCents: number;
  totalCents: number;
};

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < BigInt(0);
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;
  return negative ? -rounded : rounded;
}

export function parseQuantityScaled(quantity: string): bigint {
  const trimmed = quantity.trim();
  if (!/^\d+(\.\d{1,4})?$/.test(trimmed)) {
    throw new EstimateCalculationError("quantity");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  if (whole.length > 10) throw new EstimateCalculationError("quantity");
  return BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(4, "0"));
}

export function formatQuantity(scaled: bigint): string {
  const whole = scaled / QUANTITY_SCALE;
  const fraction = (scaled % QUANTITY_SCALE).toString().padStart(4, "0");
  return `${whole}.${fraction}`;
}

export function calculateUnitLine(input: {
  quantity: string;
  unitPriceCents: number;
}): number {
  if (!Number.isSafeInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
    throw new EstimateCalculationError("price");
  }
  const scaled = parseQuantityScaled(input.quantity);
  return Number(
    roundHalfUp(scaled * BigInt(input.unitPriceCents), QUANTITY_SCALE),
  );
}

export function calculateBasisPoints(amountCents: number, basisPoints: number): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new EstimateCalculationError("price");
  }
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 1_000_000) {
    throw new EstimateCalculationError("basis-points");
  }
  return Number(
    roundHalfUp(BigInt(amountCents) * BigInt(basisPoints), BASIS_POINT_SCALE),
  );
}

function includedAlternate(input: EstimateCalculationInput, key: string | null): boolean {
  if (!key) return true;
  const alternate = input.alternates.find((item) => item.key === key);
  if (!alternate) throw new EstimateCalculationError("alternate");
  return alternate.included;
}

function directTotal(line: EstimateCalculationLine): number {
  if (line.clientLineTotalCents != null) {
    throw new EstimateCalculationError("client-total");
  }
  if (line.method === "unit") {
    if (line.quantity == null || line.unitPriceCents == null) {
      throw new EstimateCalculationError("line");
    }
    return calculateUnitLine({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    });
  }
  if (line.method === "fixed") {
    if (line.unitPriceCents == null) throw new EstimateCalculationError("line");
    if (!Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new EstimateCalculationError("price");
    }
    return line.unitPriceCents;
  }
  throw new EstimateCalculationError("line");
}

export function calculateEstimate(input: EstimateCalculationInput): EstimateCalculation {
  calculateBasisPoints(0, input.overheadBasisPoints);
  calculateBasisPoints(0, input.markupBasisPoints);
  calculateBasisPoints(0, input.taxBasisPoints);

  const direct = input.lines.filter((line) => line.method !== "percent");
  const percent = input.lines.filter((line) => line.method === "percent");
  const directTotals = new Map<string, number>();
  for (const line of direct) directTotals.set(line.key, directTotal(line));

  function categoryBase(line: EstimateCalculationLine): number {
    const scope = line.alternateKey
      ? direct.filter((item) => item.alternateKey === line.alternateKey)
      : direct.filter((item) => includedAlternate(input, item.alternateKey));
    return scope
      .filter((item) => line.basisCategories.includes(item.category))
      .reduce((sum, item) => sum + (directTotals.get(item.key) ?? 0), 0);
  }

  const calculated = input.lines.map((line) => {
    const included = includedAlternate(input, line.alternateKey);
    const lineTotalCents =
      line.method === "percent"
        ? calculateBasisPoints(categoryBase(line), line.basisPoints ?? -1)
        : (directTotals.get(line.key) ?? 0);
    return { ...line, lineTotalCents, includedInTotal: included };
  });

  let baseSubtotalCents = 0;
  let alternateTotalCents = 0;
  let taxableCents = 0;
  for (const line of calculated) {
    if (!line.includedInTotal) continue;
    if (line.alternateKey) alternateTotalCents += line.lineTotalCents;
    else baseSubtotalCents += line.lineTotalCents;
    if (line.taxable) taxableCents += line.lineTotalCents;
  }

  const commercialCents = baseSubtotalCents + alternateTotalCents;
  const overheadCents = calculateBasisPoints(commercialCents, input.overheadBasisPoints);
  const markupCents = calculateBasisPoints(
    commercialCents + overheadCents,
    input.markupBasisPoints,
  );
  const taxableOverhead =
    commercialCents === 0
      ? 0
      : Number(roundHalfUp(BigInt(overheadCents) * BigInt(taxableCents), BigInt(commercialCents)));
  const taxableMarkup =
    commercialCents === 0
      ? 0
      : Number(roundHalfUp(BigInt(markupCents) * BigInt(taxableCents), BigInt(commercialCents)));
  const taxCents = calculateBasisPoints(
    taxableCents + taxableOverhead + taxableMarkup,
    input.taxBasisPoints,
  );

  return {
    lines: calculated,
    baseSubtotalCents,
    alternateTotalCents,
    overheadCents,
    markupCents,
    taxCents,
    totalCents: commercialCents + overheadCents + markupCents + taxCents,
  };
}
