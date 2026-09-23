import {
  isStatedQuantityUnit,
  statedQuantityUnitLabel,
  type StatedQuantityUnit,
} from "@/lib/ops/quantity-pace";

export const LABOR_KINDS = ["hourly", "piece"] as const;

export type LaborKind = (typeof LABOR_KINDS)[number];

export const LABOR_NOTE_LIMIT = 500;

const MAX_MINUTES = 24 * 60;
const MAX_PIECE_QUANTITY = 1_000_000;

export type LaborEntry = {
  id: string;
  organizationId: string;
  jobId: string;
  userId: string;
  workDate: string;
  kind: LaborKind;
  minutes: number | null;
  quantity: number | null;
  unit: "" | StatedQuantityUnit;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export function parseLaborKind(
  value: string | undefined,
): { ok: true; value: LaborKind } | { ok: false; error: string } {
  if (value === "hourly" || value === "piece") return { ok: true, value };
  return { ok: false, error: "Choose hours or piece work." };
}

export function parseLaborHours(
  value: string | undefined,
): { ok: true; minutes: number } | { ok: false; error: string } {
  const text = value?.trim() ?? "";
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) {
    return { ok: false, error: "Enter hours, such as 8 or 7.5." };
  }
  const hours = Number(text);
  const minutes = Math.round(hours * 60);
  if (!Number.isFinite(hours) || minutes <= 0 || minutes > MAX_MINUTES) {
    return {
      ok: false,
      error: "Hours must be greater than zero and no more than 24.",
    };
  }
  return { ok: true, minutes };
}

export function parsePieceQuantity(input: {
  quantity?: string;
  unit?: string;
}):
  | { ok: true; quantity: number; unit: StatedQuantityUnit }
  | { ok: false; error: string } {
  const unit = input.unit?.trim() ?? "";
  if (!isStatedQuantityUnit(unit)) {
    return { ok: false, error: "Choose bags or square feet." };
  }
  const text = input.quantity?.trim() ?? "";
  if (!/^\d+$/.test(text)) {
    return { ok: false, error: "Enter a whole piece-work quantity greater than zero." };
  }
  const quantity = Number(text);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_PIECE_QUANTITY) {
    return { ok: false, error: "Enter a whole piece-work quantity greater than zero." };
  }
  return { ok: true, quantity, unit };
}

export function parseLaborNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > LABOR_NOTE_LIMIT) {
    return { ok: false, error: `Keep the note under ${LABOR_NOTE_LIMIT} characters.` };
  }
  return { ok: true, value: note };
}

export function formatLaborHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? "minute" : "minutes"}`);
  return parts.join(" ");
}

export function formatPieceWork(quantity: number, unit: StatedQuantityUnit): string {
  if (unit === "sq_ft") return `${quantity} sq ft`;
  return `${quantity} ${quantity === 1 ? "bag" : statedQuantityUnitLabel(unit)}`;
}

export function formatLaborEntry(entry: Pick<LaborEntry, "kind" | "minutes" | "quantity" | "unit">): string {
  if (entry.kind === "hourly" && entry.minutes) return formatLaborHours(entry.minutes);
  if (entry.kind === "piece" && entry.quantity && entry.unit) {
    return formatPieceWork(entry.quantity, entry.unit);
  }
  return "Labor";
}
