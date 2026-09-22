import {
  ESTIMATE_LINE_CATEGORIES,
  type EstimateLineCategory,
} from "@/lib/ops/estimate-calculator";
import {
  ESTIMATE_CLAUSE_KINDS,
  type EstimateClauseKind,
  type EstimateVersionDraft,
} from "@/lib/ops/estimates";

export type WorkspaceDraft = {
  overheadBasisPoints: number;
  markupBasisPoints: number;
  taxBasisPoints: number;
  clauses: EstimateVersionDraft["clauses"];
  alternates: EstimateVersionDraft["alternates"];
  lines: EstimateVersionDraft["lines"];
  jobPackages: EstimateVersionDraft["jobPackages"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberField(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

export function parseWorkspaceDraft(
  value: unknown,
): { ok: true; draft: WorkspaceDraft } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: "The estimate draft could not be read." };
  const overheadBasisPoints = numberField(value.overheadBasisPoints);
  const markupBasisPoints = numberField(value.markupBasisPoints);
  const taxBasisPoints = numberField(value.taxBasisPoints);
  if (overheadBasisPoints == null || markupBasisPoints == null || taxBasisPoints == null) {
    return { ok: false, error: "Overhead, markup, and tax must be whole basis points." };
  }
  if (!Array.isArray(value.clauses) || !Array.isArray(value.alternates)) {
    return { ok: false, error: "The estimate draft could not be read." };
  }
  if (!Array.isArray(value.lines) || !Array.isArray(value.jobPackages)) {
    return { ok: false, error: "The estimate draft could not be read." };
  }
  for (const line of value.lines) {
    if (!isRecord(line)) return { ok: false, error: "The estimate draft could not be read." };
    if (line.clientLineTotalCents != null) {
      return { ok: false, error: "client-total" };
    }
    if (
      typeof line.category !== "string" ||
      !ESTIMATE_LINE_CATEGORIES.includes(line.category as EstimateLineCategory)
    ) {
      return { ok: false, error: "Choose a line category." };
    }
    if (line.method !== "unit" && line.method !== "fixed" && line.method !== "percent") {
      return { ok: false, error: "Choose a pricing method." };
    }
  }
  for (const clause of value.clauses) {
    if (!isRecord(clause) || typeof clause.kind !== "string") {
      return { ok: false, error: "The estimate draft could not be read." };
    }
    if (!ESTIMATE_CLAUSE_KINDS.includes(clause.kind as EstimateClauseKind)) {
      return { ok: false, error: "Choose a clause type." };
    }
  }
  return { ok: true, draft: value as WorkspaceDraft };
}

export function emptyWorkspaceDraft(): WorkspaceDraft {
  return {
    overheadBasisPoints: 0,
    markupBasisPoints: 0,
    taxBasisPoints: 0,
    clauses: [],
    alternates: [],
    lines: [],
    jobPackages: [],
  };
}
