import { createHash } from "node:crypto";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { SERVICE_LABELS } from "@/lib/ops/workflow";

export const PRICE_BOOK_TRADES = [
  "spray-foam",
  "fireproofing",
  "intumescent",
  "avb",
  "spf-roofing",
] as const;

export type PriceBookTrade = (typeof PRICE_BOOK_TRADES)[number];

export const PRICE_BOOK_UNITS = ["bags", "sq_ft", "hour", "each"] as const;

export type PriceBookUnit = (typeof PRICE_BOOK_UNITS)[number];

const MAX_NAME_LENGTH = 160;
const MAX_UNIT_PRICE_CENTS = 100_000_000;

export type PriceBookItemInput = {
  trade: PriceBookTrade;
  name: string;
  unit: PriceBookUnit;
  unitPriceCents: number;
  active: boolean;
};

export type PriceBookListFilters = {
  q?: string;
  trade?: string;
  includeInactive?: boolean;
};

export function isPriceBookTrade(value: string): value is PriceBookTrade {
  return PRICE_BOOK_TRADES.includes(value as PriceBookTrade);
}

export function isPriceBookUnit(value: string): value is PriceBookUnit {
  return PRICE_BOOK_UNITS.includes(value as PriceBookUnit);
}

export function priceBookTradeLabel(trade: string): string {
  return SERVICE_LABELS[trade] ?? trade;
}

export function priceBookUnitLabel(unit: string): string {
  if (unit === "bags") return "Bags";
  if (unit === "sq_ft") return "Square feet";
  if (unit === "hour") return "Hours";
  if (unit === "each") return "Each";
  return unit;
}

export function formatUnitPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export function parseUnitPriceCents(
  raw: string,
): { ok: true; cents: number } | { ok: false } {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false };
  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > MAX_UNIT_PRICE_CENTS) return { ok: false };
  return { ok: true, cents };
}

export function parsePriceBookItem(input: {
  trade?: string | null;
  name?: string | null;
  unit?: string | null;
  unitPrice?: string | null;
  active?: string | boolean | null;
}):
  | { ok: true; value: PriceBookItemInput }
  | { ok: false; error: string; field: "trade" | "name" | "unit" | "unitPrice" } {
  const trade = String(input.trade ?? "").trim();
  const name = String(input.name ?? "").trim();
  const unit = String(input.unit ?? "").trim();
  if (!isPriceBookTrade(trade)) {
    return { ok: false, error: "Choose a trade.", field: "trade" };
  }
  if (!name) {
    return { ok: false, error: "A price-book name is required.", field: "name" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "That name is too long.", field: "name" };
  }
  if (!isPriceBookUnit(unit)) {
    return { ok: false, error: "Choose bags, square feet, hours, or each.", field: "unit" };
  }
  const price = parseUnitPriceCents(String(input.unitPrice ?? ""));
  if (!price.ok) {
    return {
      ok: false,
      error: "Enter a unit price in Canadian dollars, with at most two decimal places.",
      field: "unitPrice",
    };
  }
  const active =
    typeof input.active === "boolean"
      ? input.active
      : input.active === "1" || input.active === "on" || input.active === "true";
  return {
    ok: true,
    value: {
      trade,
      name,
      unit,
      unitPriceCents: price.cents,
      active,
    },
  };
}

export type PriceRevisionDraft = {
  itemId: string;
  organizationId: string;
  trade: PriceBookTrade;
  description: string;
  unit: PriceBookUnit;
  unitPriceCents: number;
  createdBy: string;
};

export type ApprovedPriceRevision = PriceRevisionDraft & {
  id: string;
  versionNumber: number;
  status: "approved";
  effectiveAt: Date;
  approvedBy: string;
  approvedAt: Date;
  contentHash: string;
};

const approvedRevisions = new Map<string, ApprovedPriceRevision[]>();

export function priceRevisionContentHash(input: {
  itemId: string;
  versionNumber: number;
  trade: string;
  description: string;
  unit: string;
  unitPriceCents: number;
}): string {
  return createHash("sha256")
    .update(
      [
        input.itemId,
        String(input.versionNumber),
        input.trade,
        input.description,
        input.unit,
        String(input.unitPriceCents),
      ].join("\n"),
    )
    .digest("hex");
}

export function draftRevision(
  overrides: Partial<PriceRevisionDraft> = {},
): PriceRevisionDraft {
  return {
    itemId: overrides.itemId ?? "11111111-1111-4111-8111-111111111199",
    organizationId: overrides.organizationId ?? STRONG_FOAM_ORGANIZATION_ID,
    trade: overrides.trade ?? "spray-foam",
    description: overrides.description ?? "Closed-cell spray foam",
    unit: overrides.unit ?? "bags",
    unitPriceCents: overrides.unitPriceCents ?? 0,
    createdBy: overrides.createdBy ?? "office@strongfoam.demo",
  };
}

export function approvePriceRevision(
  draft: PriceRevisionDraft,
  approver = "admin@strongfoam.demo",
): ApprovedPriceRevision {
  const existing = approvedRevisions.get(draft.itemId) ?? [];
  const versionNumber =
    existing.reduce((max, revision) => Math.max(max, revision.versionNumber), 0) + 1;
  const approvedAt = new Date();
  const approved: ApprovedPriceRevision = {
    ...draft,
    id: crypto.randomUUID(),
    versionNumber,
    status: "approved",
    effectiveAt: approvedAt,
    approvedBy: approver,
    approvedAt,
    contentHash: priceRevisionContentHash({
      itemId: draft.itemId,
      versionNumber,
      trade: draft.trade,
      description: draft.description,
      unit: draft.unit,
      unitPriceCents: draft.unitPriceCents,
    }),
  };
  approvedRevisions.set(draft.itemId, [...existing, approved]);
  return approved;
}

export function updateApprovedRevision(revision: {
  status: string;
}): { ok: false; error: "immutable" } {
  void revision;
  return { ok: false, error: "immutable" };
}

export function listApprovedPriceRevisions(itemId: string): ApprovedPriceRevision[] {
  return approvedRevisions.get(itemId) ?? [];
}
