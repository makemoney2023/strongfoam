import {
  PLAN_ANNOTATION_KIND_LABELS,
  PLAN_ANNOTATION_STATUS_LABELS,
  PLAN_ANNOTATION_TRADE_LABELS,
  annotationMatchesFilter,
  type PlanAnnotationFilter,
  type PlanAnnotationGeometry,
  type PlanAnnotationKind,
  type PlanAnnotationStatus,
  type PlanAnnotationTrade,
} from "@/lib/ops/plan-markup";

export type PlanExportMark = {
  id: string;
  title: string;
  body: string | null;
  status: PlanAnnotationStatus;
  kind: PlanAnnotationKind;
  geometry: PlanAnnotationGeometry;
  trade: PlanAnnotationTrade | null;
  createdBy: string;
  createdAt: Date | string;
  crewUserId?: string | null;
  crewName?: string | null;
  pageNumber: number;
  x: number;
  y: number;
};

export type PlanCloseoutRow = {
  title: string;
  kind: string;
  status: string;
  trade: string;
  author: string;
  crew: string;
  note: string;
  page: number;
};

export function selectExportMarks(
  marks: PlanExportMark[],
  filter: PlanAnnotationFilter & { pageNumber?: number },
): PlanExportMark[] {
  return marks.filter((mark) => annotationMatchesFilter(mark, filter));
}

export function buildPlanCloseout(args: {
  jobLabel: string;
  sheetName: string;
  revision: number;
  exportedAt: Date;
  marks: PlanExportMark[];
}): {
  heading: string;
  subtitle: string;
  rows: PlanCloseoutRow[];
} {
  return {
    heading: `${args.jobLabel} plan closeout`,
    subtitle: `${args.sheetName} · revision ${args.revision} · ${args.marks.length} mark${
      args.marks.length === 1 ? "" : "s"
    } · ${args.exportedAt.toISOString().slice(0, 10)}`,
    rows: args.marks.map((mark) => ({
      title: mark.title,
      kind: PLAN_ANNOTATION_KIND_LABELS[mark.kind],
      status: PLAN_ANNOTATION_STATUS_LABELS[mark.status],
      trade: mark.trade
        ? PLAN_ANNOTATION_TRADE_LABELS[mark.trade]
        : "Unspecified",
      author: mark.createdBy,
      crew: mark.crewName || "Unassigned",
      note: mark.body || "",
      page: mark.pageNumber,
    })),
  };
}
