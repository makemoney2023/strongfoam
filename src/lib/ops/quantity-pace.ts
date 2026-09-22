export const STATED_QUANTITY_UNITS = ["bags", "sq_ft"] as const;

export type StatedQuantityUnit = (typeof STATED_QUANTITY_UNITS)[number];

const MAX_STATED_QUANTITY = 1_000_000;

export function isStatedQuantityUnit(value: string): value is StatedQuantityUnit {
  return STATED_QUANTITY_UNITS.includes(value as StatedQuantityUnit);
}

export function statedQuantityUnitLabel(unit: StatedQuantityUnit): string {
  return unit === "bags" ? "bags" : "sq ft";
}

export function parseStatedQuantity(input: {
  statedQuantity?: string | number | null;
  statedUnit?: string | null;
}):
  | {
      ok: true;
      statedQuantity: number | null;
      statedUnit: StatedQuantityUnit | null;
    }
  | { ok: false; error: string; field: "statedQuantity" | "statedUnit" } {
  const rawQuantity = String(input.statedQuantity ?? "").trim();
  const rawUnit = String(input.statedUnit ?? "").trim();
  if (!rawQuantity && !rawUnit) {
    return { ok: true, statedQuantity: null, statedUnit: null };
  }
  if (!rawQuantity) {
    return {
      ok: false,
      error: "Enter a whole stated quantity greater than zero.",
      field: "statedQuantity",
    };
  }
  if (!rawUnit || !isStatedQuantityUnit(rawUnit)) {
    return {
      ok: false,
      error: "Choose bags or square feet.",
      field: "statedUnit",
    };
  }
  const quantity = Number(rawQuantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      ok: false,
      error: "Enter a whole stated quantity greater than zero.",
      field: "statedQuantity",
    };
  }
  if (quantity > MAX_STATED_QUANTITY) {
    return {
      ok: false,
      error: "Stated quantity is too large.",
      field: "statedQuantity",
    };
  }
  return { ok: true, statedQuantity: quantity, statedUnit: rawUnit };
}

export function statedTaskWrite(input: {
  statedQuantity?: number | null;
  statedUnit?: string | null;
}): { statedQuantity: number | null; statedUnit: StatedQuantityUnit | null } | undefined {
  if (input.statedQuantity === undefined && input.statedUnit === undefined) {
    return undefined;
  }
  if (
    input.statedQuantity == null ||
    input.statedUnit == null ||
    !isStatedQuantityUnit(input.statedUnit)
  ) {
    return { statedQuantity: null, statedUnit: null };
  }
  return { statedQuantity: input.statedQuantity, statedUnit: input.statedUnit };
}

export function formatStatedQuantity(
  quantity: number | null,
  unit: string | null,
): string | null {
  if (quantity == null || !unit || !isStatedQuantityUnit(unit)) return null;
  return `${quantity.toLocaleString("en-CA")} ${statedQuantityUnitLabel(unit)} remaining`;
}

export type QuantityPaceWarning = {
  jobId: string;
  jobName: string;
  unit: StatedQuantityUnit;
  installed: number;
  statedRemaining: number;
};

export function listQuantityPaceWarnings(input: {
  jobs: Array<{ id: string; name: string }>;
  tasks: Array<{
    jobId: string;
    status: string;
    statedQuantity?: number | null;
    statedUnit?: string | null;
  }>;
  quantities: Array<{
    jobId: string;
    quantity: number | null;
    unit: string | null;
  }>;
}): QuantityPaceWarning[] {
  const warnings: QuantityPaceWarning[] = [];
  for (const job of input.jobs) {
    for (const unit of STATED_QUANTITY_UNITS) {
      const statedRemaining = input.tasks.reduce((sum, task) => {
        if (task.jobId !== job.id || task.status === "done") return sum;
        if (task.statedUnit !== unit || task.statedQuantity == null || task.statedQuantity <= 0) {
          return sum;
        }
        return sum + task.statedQuantity;
      }, 0);
      if (statedRemaining <= 0) continue;
      const installed = input.quantities.reduce((sum, note) => {
        if (
          note.jobId !== job.id ||
          note.unit !== unit ||
          note.quantity == null ||
          note.quantity <= 0
        ) {
          return sum;
        }
        return sum + note.quantity;
      }, 0);
      if (installed <= statedRemaining) continue;
      warnings.push({
        jobId: job.id,
        jobName: job.name,
        unit,
        installed,
        statedRemaining,
      });
    }
  }
  return warnings.sort(
    (a, b) => a.jobName.localeCompare(b.jobName) || a.unit.localeCompare(b.unit),
  );
}

export function quantityPaceLabel(
  warning: QuantityPaceWarning,
  options?: { includeJob?: boolean },
): string {
  const unit = statedQuantityUnitLabel(warning.unit);
  const sentence = `${warning.installed.toLocaleString("en-CA")} ${unit} installed is ahead of ${warning.statedRemaining.toLocaleString("en-CA")} ${unit} still stated on open tasks`;
  if (options?.includeJob === false) return `Quantity pace: ${sentence}.`;
  return `Quantity pace: ${sentence}: ${warning.jobName}`;
}
