import { isJobImageContentType, isUuid } from "@/lib/ops/job-workspace";

export const PLAN_ANNOTATION_KINDS = [
  "pin",
  "circle",
  "ellipse",
  "polygon",
  "arrow",
  "text",
] as const;
export type PlanAnnotationKind = (typeof PLAN_ANNOTATION_KINDS)[number];

export const PLAN_ANNOTATION_KIND_LABELS: Record<PlanAnnotationKind, string> = {
  pin: "Pin",
  circle: "Circle",
  ellipse: "Ellipse",
  polygon: "Polygon",
  arrow: "Arrow",
  text: "Text",
};

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

export const PLAN_ANNOTATION_STATUS_STROKES: Record<
  PlanAnnotationStatus,
  string
> = {
  planned: "#64748b",
  in_progress: "#0ea5e9",
  completed: "#059669",
  blocked: "#dc2626",
  deficiency: "#f59e0b",
};

export const PLAN_ANNOTATION_TRADES = [
  "spray_foam",
  "fireproofing",
  "intumescent",
  "avb",
  "drywall",
  "flooring",
  "general",
] as const;
export type PlanAnnotationTrade = (typeof PLAN_ANNOTATION_TRADES)[number];

export const PLAN_ANNOTATION_TRADE_LABELS: Record<PlanAnnotationTrade, string> =
  {
    spray_foam: "Spray foam",
    fireproofing: "Fireproofing",
    intumescent: "Intumescent",
    avb: "Air / vapor barrier",
    drywall: "Drywall",
    flooring: "Flooring",
    general: "General",
  };

export type PlanPoint = { x: number; y: number };

export type PlanAnnotationGeometry =
  | { type: "pin" }
  | { type: "text" }
  | { type: "circle"; rx: number; ry: number }
  | { type: "ellipse"; rx: number; ry: number }
  | { type: "polygon"; points: PlanPoint[] }
  | { type: "arrow"; x2: number; y2: number };

export type PlanAnnotationInput = {
  documentId: string;
  pageNumber: number;
  x: number;
  y: number;
  kind: PlanAnnotationKind;
  geometry: PlanAnnotationGeometry;
  status: PlanAnnotationStatus;
  trade: PlanAnnotationTrade | null;
  title: string;
  body: string | null;
  workAreaId: string | null;
  taskId: string | null;
};

export type PlanAnnotationFilter = {
  statuses?: PlanAnnotationStatus[];
  trades?: Array<PlanAnnotationTrade | "unspecified">;
  authors?: string[];
  crewUserIds?: string[];
  from?: string | null;
  to?: string | null;
};

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 2_000;
const MIN_RADIUS = 0.01;
const MAX_POLYGON_POINTS = 48;

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

export function isPlanAnnotationTrade(
  value: string,
): value is PlanAnnotationTrade {
  return PLAN_ANNOTATION_TRADES.includes(value as PlanAnnotationTrade);
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
  return (
    isJobImageContentType(document.contentType) ||
    document.contentType === "application/pdf"
  );
}

export function isPlanPdfContentType(contentType: string): boolean {
  return contentType === "application/pdf";
}

export function parseNormalizedCoordinate(
  value: string | number | null | undefined,
): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return null;
  return Math.round(parsed * 10_000) / 10_000;
}

function parseOptionalNormalized(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  return parseNormalizedCoordinate(value);
}

export function defaultPlanGeometry(
  kind: PlanAnnotationKind,
  point: PlanPoint,
): PlanAnnotationGeometry {
  if (kind === "circle" || kind === "ellipse") {
    return { type: kind, rx: 0.06, ry: 0.06 };
  }
  if (kind === "polygon") {
    return {
      type: "polygon",
      points: [
        point,
        { x: clampUnit(point.x + 0.08), y: point.y },
        { x: clampUnit(point.x + 0.04), y: clampUnit(point.y + 0.08) },
      ],
    };
  }
  if (kind === "arrow") {
    return {
      type: "arrow",
      x2: clampUnit(point.x + 0.12),
      y2: clampUnit(point.y + 0.04),
    };
  }
  return { type: kind };
}

export function parsePlanAnnotationGeometry(
  kind: PlanAnnotationKind,
  raw: unknown,
  origin: PlanPoint,
):
  | { ok: true; value: PlanAnnotationGeometry }
  | { ok: false; error: string; field?: string } {
  const parsed = parseGeometryValue(raw);
  if (parsed && parsed.type !== kind) {
    return { ok: false, error: "Mark geometry does not match the tool.", field: "geometry" };
  }

  if (kind === "pin" || kind === "text") {
    return { ok: true, value: { type: kind } };
  }

  if (kind === "circle" || kind === "ellipse") {
    const rx = parsePositiveRadius(
      parsed && "rx" in parsed ? parsed.rx : undefined,
      0.06,
    );
    const ry = parsePositiveRadius(
      parsed && "ry" in parsed ? parsed.ry : rx,
      rx ?? 0.06,
    );
    if (rx == null || ry == null) {
      return { ok: false, error: "Draw a large enough shape.", field: "geometry" };
    }
    return { ok: true, value: { type: kind, rx, ry } };
  }

  if (kind === "arrow") {
    const x2 =
      parseOptionalNormalized(
        parsed && "x2" in parsed
          ? (parsed.x2 as string | number | null | undefined)
          : undefined,
      ) ?? clampUnit(origin.x + 0.12);
    const y2 =
      parseOptionalNormalized(
        parsed && "y2" in parsed
          ? (parsed.y2 as string | number | null | undefined)
          : undefined,
      ) ?? clampUnit(origin.y + 0.04);
    if (x2 === origin.x && y2 === origin.y) {
      return { ok: false, error: "Drag the arrow to a second point.", field: "geometry" };
    }
    return { ok: true, value: { type: "arrow", x2, y2 } };
  }

  const points = normalizePolygonPoints(
    parsed && "points" in parsed ? parsed.points : undefined,
    origin,
  );
  if (!points) {
    return {
      ok: false,
      error: "A polygon needs at least three points on the sheet.",
      field: "geometry",
    };
  }
  return { ok: true, value: { type: "polygon", points } };
}

export function parsePlanAnnotationInput(input: {
  documentId?: string;
  pageNumber?: string | number;
  x?: string | number;
  y?: string | number;
  kind?: string;
  geometry?: unknown;
  status?: string;
  trade?: string | null;
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

  const geometry = parsePlanAnnotationGeometry(kind, input.geometry, { x, y });
  if (!geometry.ok) return geometry;

  const status = input.status?.trim() || "planned";
  if (!isPlanAnnotationStatus(status)) {
    return { ok: false, error: "Choose a valid work status.", field: "status" };
  }

  const tradeValue = input.trade?.trim() || "";
  if (tradeValue && !isPlanAnnotationTrade(tradeValue)) {
    return { ok: false, error: "Choose a valid trade.", field: "trade" };
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
      geometry: geometry.value,
      status,
      trade: tradeValue ? (tradeValue as PlanAnnotationTrade) : null,
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

export function toPlanMarkView(
  annotation: {
    id: string;
    x: number;
    y: number;
    pageNumber: number;
    kind: string;
    geometry?: unknown;
    title: string;
    body: string | null;
    status: string;
    trade?: string | null;
    taskId: string | null;
    workAreaId: string | null;
    createdBy: string;
    createdAt: Date | string;
  },
  task?: { assigneeUserId: string | null; assignee: string | null } | null,
) {
  const kind = isPlanAnnotationKind(annotation.kind) ? annotation.kind : "pin";
  return {
    id: annotation.id,
    x: annotation.x,
    y: annotation.y,
    pageNumber: annotation.pageNumber,
    kind,
    geometry: normalizeStoredGeometry(kind, annotation.geometry, {
      x: annotation.x,
      y: annotation.y,
    }),
    title: annotation.title,
    body: annotation.body,
    status: isPlanAnnotationStatus(annotation.status)
      ? annotation.status
      : ("planned" as const),
    trade: annotation.trade && isPlanAnnotationTrade(annotation.trade)
      ? annotation.trade
      : null,
    taskId: annotation.taskId,
    workAreaId: annotation.workAreaId,
    createdBy: annotation.createdBy,
    createdAt:
      annotation.createdAt instanceof Date
        ? annotation.createdAt.toISOString()
        : annotation.createdAt,
    crewUserId: task?.assigneeUserId ?? null,
    crewName: task?.assignee ?? null,
  };
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

export function normalizeStoredGeometry(
  kind: string,
  geometry: unknown,
  origin: PlanPoint,
): PlanAnnotationGeometry {
  if (!isPlanAnnotationKind(kind)) return { type: "pin" };
  const parsed = parsePlanAnnotationGeometry(kind, geometry, origin);
  return parsed.ok ? parsed.value : defaultPlanGeometry(kind, origin);
}

export function annotationMatchesFilter(
  annotation: {
    status: PlanAnnotationStatus;
    trade: string | null;
    createdBy: string;
    createdAt: Date | string;
    crewUserId?: string | null;
    pageNumber?: number;
  },
  filter: PlanAnnotationFilter & { pageNumber?: number },
): boolean {
  if (
    filter.pageNumber != null &&
    annotation.pageNumber != null &&
    annotation.pageNumber !== filter.pageNumber
  ) {
    return false;
  }
  if (filter.statuses?.length && !filter.statuses.includes(annotation.status)) {
    return false;
  }
  if (filter.trades?.length) {
    const trade = annotation.trade || "unspecified";
    if (!filter.trades.includes(trade as PlanAnnotationTrade | "unspecified")) {
      return false;
    }
  }
  if (filter.authors?.length && !filter.authors.includes(annotation.createdBy)) {
    return false;
  }
  if (filter.crewUserIds?.length) {
    if (
      !annotation.crewUserId ||
      !filter.crewUserIds.includes(annotation.crewUserId)
    ) {
      return false;
    }
  }
  const createdAt =
    annotation.createdAt instanceof Date
      ? annotation.createdAt
      : new Date(annotation.createdAt);
  if (filter.from) {
    const from = new Date(`${filter.from}T00:00:00`);
    if (!Number.isNaN(from.getTime()) && createdAt < from) return false;
  }
  if (filter.to) {
    const to = new Date(`${filter.to}T23:59:59.999`);
    if (!Number.isNaN(to.getTime()) && createdAt > to) return false;
  }
  return true;
}

export function parseGeometryFormValue(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseGeometryValue(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

function parsePositiveRadius(
  value: unknown,
  fallback: number,
): number | null {
  if (value == null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_RADIUS || parsed > 1) return null;
  return Math.round(parsed * 10_000) / 10_000;
}

function normalizePolygonPoints(
  value: unknown,
  origin: PlanPoint,
): PlanPoint[] | null {
  const raw = Array.isArray(value) ? value : [];
  const points: PlanPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const x = parseNormalizedCoordinate((item as PlanPoint).x);
    const y = parseNormalizedCoordinate((item as PlanPoint).y);
    if (x == null || y == null) continue;
    points.push({ x, y });
    if (points.length >= MAX_POLYGON_POINTS) break;
  }
  if (points.length === 0) {
    points.push(origin);
  } else if (points[0].x !== origin.x || points[0].y !== origin.y) {
    points.unshift(origin);
  }
  return points.length >= 3 ? points : null;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 10_000) / 10_000));
}
