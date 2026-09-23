import { isUuid } from "@/lib/ops/job-workspace";

export const FIELD_NOTE_KINDS = [
  "note",
  "quantity",
  "blocker",
  "deficiency",
  "material_request",
  "daily_report",
] as const;

export type FieldNoteKind = (typeof FIELD_NOTE_KINDS)[number];

export const FIELD_NOTE_LABELS: Record<FieldNoteKind, string> = {
  note: "Field note",
  quantity: "Quantity",
  blocker: "Blocker",
  deficiency: "Deficiency",
  material_request: "Material request",
  daily_report: "Daily report",
};

export const FIELD_QUANTITY_UNITS = [
  "board_feet",
  "sq_ft",
  "linear_ft",
  "bags",
  "hours",
] as const;

export type FieldQuantityUnit = (typeof FIELD_QUANTITY_UNITS)[number];

export const FIELD_QUANTITY_LABELS: Record<FieldQuantityUnit, string> = {
  board_feet: "Board feet",
  sq_ft: "Square feet",
  linear_ft: "Linear feet",
  bags: "Bags",
  hours: "Hours",
};

export const FIELD_ACTIVE_JOB_STATUSES = [
  "scheduled",
  "in_progress",
  "blocked",
  "ready_for_inspection",
] as const;

const MAX_BODY_LENGTH = 4_000;

export type FieldNoteInput = {
  kind: FieldNoteKind;
  body: string;
  workAreaId: string | null;
  taskId: string | null;
  annotationId?: string | null;
  quantity: number | null;
  unit: FieldQuantityUnit | null;
};

export function isFieldNoteKind(value: string): value is FieldNoteKind {
  return FIELD_NOTE_KINDS.includes(value as FieldNoteKind);
}

export function isFieldQuantityUnit(value: string): value is FieldQuantityUnit {
  return FIELD_QUANTITY_UNITS.includes(value as FieldQuantityUnit);
}

function statedFieldQuantity(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
): { ok: true; quantity: number | null; unit: FieldQuantityUnit | null } | { ok: false; error: string; field?: string } {
  const blank =
    quantity == null || (typeof quantity === "string" && quantity.trim() === "");
  if (blank) return { ok: true, quantity: null, unit: null };
  const raw = typeof quantity === "number" ? quantity : Number(quantity.trim());
  if (!Number.isInteger(raw) || raw <= 0) {
    return { ok: false, error: "Enter a whole quantity greater than zero.", field: "quantity" };
  }
  if (raw > 1_000_000) {
    return { ok: false, error: "Quantity is too large.", field: "quantity" };
  }
  const rawUnit = unit?.trim() ?? "";
  if (!isFieldQuantityUnit(rawUnit)) {
    return { ok: false, error: "Choose a quantity unit.", field: "unit" };
  }
  return { ok: true, quantity: raw, unit: rawUnit };
}

export function parseFieldNoteInput(input: {
  kind?: string;
  body?: string;
  workAreaId?: string | null;
  taskId?: string | null;
  annotationId?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
}): { ok: true; value: FieldNoteInput } | { ok: false; error: string; field?: string } {
  const kind = input.kind?.trim() || "note";
  if (!isFieldNoteKind(kind)) {
    return { ok: false, error: "Choose a valid field entry type.", field: "kind" };
  }

  const body = input.body?.trim() ?? "";
  if (!body) {
    return {
      ok: false,
      error:
        kind === "daily_report"
          ? "A daily report note is required."
          : kind === "quantity"
            ? "Describe the completed quantity."
            : kind === "blocker"
              ? "Describe the blocker."
              : kind === "deficiency"
                ? "Describe the deficiency."
              : kind === "material_request"
                ? "Describe the material or clarification needed."
                : "A field note is required.",
      field: "body",
    };
  }
  if (body.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      error: `Field notes must be ${MAX_BODY_LENGTH} characters or fewer.`,
      field: "body",
    };
  }

  const workAreaId = input.workAreaId?.trim() || null;
  if (workAreaId && !isUuid(workAreaId)) {
    return { ok: false, error: "Choose a valid work area.", field: "workAreaId" };
  }
  const taskId = input.taskId?.trim() || null;
  if (taskId && !isUuid(taskId)) {
    return { ok: false, error: "Choose a valid task.", field: "taskId" };
  }
  const annotationId = input.annotationId?.trim() || null;
  if (annotationId && !isUuid(annotationId)) {
    return { ok: false, error: "Choose a valid plan mark.", field: "annotationId" };
  }

  let quantity: number | null = null;
  let unit: FieldQuantityUnit | null = null;
  if (kind === "quantity" || kind === "material_request") {
    const stated = statedFieldQuantity(input.quantity, input.unit);
    if (!stated.ok) return stated;
    if (kind === "quantity" && stated.quantity == null) {
      return { ok: false, error: "Enter a whole quantity greater than zero.", field: "quantity" };
    }
    quantity = stated.quantity;
    unit = stated.unit;
  }

  return {
    ok: true,
    value: {
      kind,
      body,
      workAreaId,
      taskId,
      annotationId,
      quantity,
      unit,
    },
  };
}

export function formatFieldQuantity(
  quantity: number | null,
  unit: string | null,
): string | null {
  if (quantity == null || !unit) return null;
  const label = isFieldQuantityUnit(unit)
    ? FIELD_QUANTITY_LABELS[unit]
    : unit;
  return `${quantity.toLocaleString("en-CA")} ${label.toLowerCase()}`;
}

export function isFieldActiveJobStatus(status: string): boolean {
  return FIELD_ACTIVE_JOB_STATUSES.includes(
    status as (typeof FIELD_ACTIVE_JOB_STATUSES)[number],
  );
}
