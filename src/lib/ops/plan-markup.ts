import { isJobImageContentType, isUuid } from "@/lib/ops/job-workspace";

export const PLAN_ANNOTATION_KINDS = ["pin"] as const;
export type PlanAnnotationKind = (typeof PLAN_ANNOTATION_KINDS)[number];

export const PLAN_ANNOTATION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "blocked",
  "deficiency",
] as const;
export type PlanAnnotationStatus = (typeof PLAN_ANNOTATION_STATUSES)[number];

export const PLAN_ANNOTATION_STATUS_LABELS: Record<
  PlanAnnotationStatus,
  string
> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  deficiency: "Deficiency",
};

export const PLAN_ANNOTATION_STATUS_TONES: Record<
  PlanAnnotationStatus,
  string
> = {
  planned: "bg-slate-500",
  in_progress: "bg-sky-500",
  completed: "bg-emerald-600",
  blocked: "bg-red-600",
  deficiency: "bg-amber-500",
};

export type PlanAnnotationInput = {
  documentId: string;
  pageNumber: number;
  x: number;
  y: number;
  kind: PlanAnnotationKind;
  status: PlanAnnotationStatus;
  title: string;
  body: string | null;
  workAreaId: string | null;
  taskId: string | null;
};

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 2_000;

export function isPlanAnnotationKind(
  value: string,
): value is PlanAnnotationKind {
  return PLAN_ANNOTATION_KINDS.includes(value as PlanAnnotationKind);
}

export function isPlanAnnotationStatus(
  value: string,
): value is PlanAnnotationStatus {
  return PLAN_ANNOTATION_STATUSES.includes(value as PlanAnnotationStatus);
}

export function planSheetKey(document: {
  id: string;
  sheetKey?: string | null;
}): string {
  return document.sheetKey || document.id;
}

export function isCurrentPlanDocument(document: {
  kind: string;
  supersededAt?: Date | null;
}): boolean {
  return document.kind === "plan" && !document.supersededAt;
}

export function canMarkupPlanDocument(document: { contentType: string }): boolean {
  return isJobImageContentType(document.contentType);
}

export function parseNormalizedCoordinate(
  value: string | number | null | undefined,
): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return null;
  return Math.round(parsed * 10_000) / 10_000;
}

export function parsePlanAnnotationInput(input: {
  documentId?: string;
  pageNumber?: string | number;
  x?: string | number;
  y?: string | number;
  kind?: string;
  status?: string;
  title?: string;
  body?: string;
  workAreaId?: string | null;
  taskId?: string | null;
}):
  | { ok: true; value: PlanAnnotationInput }
  | { ok: false; error: string; field?: string } {
  const documentId = input.documentId?.trim() ?? "";
  if (!isUuid(documentId)) {
    return { ok: false, error: "Choose a plan sheet.", field: "documentId" };
  }

  const pageNumber = Number(input.pageNumber ?? 1);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return { ok: false, error: "Choose a valid sheet page.", field: "pageNumber" };
  }

  const x = parseNormalizedCoordinate(input.x);
  const y = parseNormalizedCoordinate(input.y);
  if (x == null) {
    return { ok: false, error: "Tap a location on the plan.", field: "x" };
  }
  if (y == null) {
    return { ok: false, error: "Tap a location on the plan.", field: "y" };
  }

  const kind = input.kind?.trim() || "pin";
  if (!isPlanAnnotationKind(kind)) {
    return { ok: false, error: "Choose a valid mark type.", field: "kind" };
  }

  const status = input.status?.trim() || "planned";
  if (!isPlanAnnotationStatus(status)) {
    return { ok: false, error: "Choose a valid work status.", field: "status" };
  }

  const title = input.title?.trim().replace(/\s+/g, " ") ?? "";
  if (!title) {
    return { ok: false, error: "Give this mark a short title.", field: "title" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Mark titles must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      field: "title",
    };
  }

  const body = input.body?.trim() || null;
  if (body && body.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      error: `Notes must be ${MAX_BODY_LENGTH} characters or fewer.`,
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

  return {
    ok: true,
    value: {
      documentId,
      pageNumber,
      x,
      y,
      kind,
      status,
      title,
      body,
      workAreaId,
      taskId,
    },
  };
}

export function parsePlanAnnotationStatusInput(input: {
  status?: string;
  body?: string;
}):
  | { ok: true; value: { status: PlanAnnotationStatus; body: string | null } }
  | { ok: false; error: string; field?: string } {
  const status = input.status?.trim() ?? "";
  if (!isPlanAnnotationStatus(status)) {
    return { ok: false, error: "Choose a valid work status.", field: "status" };
  }
  const body = input.body?.trim() || null;
  if (body && body.length > MAX_BODY_LENGTH) {
    return {
      ok: false,
      error: `Notes must be ${MAX_BODY_LENGTH} characters or fewer.`,
      field: "body",
    };
  }
  return { ok: true, value: { status, body } };
}

export function officePlanHref(jobId: string, documentId?: string): string {
  return documentId
    ? `/app/jobs/${jobId}/plan?documentId=${documentId}`
    : `/app/jobs/${jobId}/plan`;
}

export function fieldPlanHref(jobId: string, documentId?: string): string {
  return documentId
    ? `/field/jobs/${jobId}/plan?documentId=${documentId}`
    : `/field/jobs/${jobId}/plan`;
}
