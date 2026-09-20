"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { NativeSelect } from "@/components/ops/native-select";
import { PlanSheet, type PlanSheetHandle } from "@/components/ops/plan-sheet";
import { downloadMarkedUpPlan } from "@/components/ops/plan-marked-up-export";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  arrowHeadPoints,
  clampUnit,
  hitTestMark,
  polygonPath,
  visualCircleRadii,
} from "@/lib/ops/plan-geometry";
import {
  annotationMatchesFilter,
  PLAN_ANNOTATION_KIND_LABELS,
  PLAN_ANNOTATION_KINDS,
  PLAN_ANNOTATION_STATUS_LABELS,
  PLAN_ANNOTATION_STATUS_STROKES,
  PLAN_ANNOTATION_STATUS_TONES,
  PLAN_ANNOTATION_STATUSES,
  PLAN_ANNOTATION_TRADE_LABELS,
  PLAN_ANNOTATION_TRADES,
  type PlanAnnotationFilter,
  type PlanAnnotationGeometry,
  type PlanAnnotationKind,
  type PlanAnnotationStatus,
  type PlanAnnotationTrade,
} from "@/lib/ops/plan-markup";
import type { ActionState } from "@/lib/ops/action-result";

export type PlanMarkView = {
  id: string;
  x: number;
  y: number;
  pageNumber: number;
  kind: PlanAnnotationKind;
  geometry: PlanAnnotationGeometry;
  title: string;
  body: string | null;
  status: PlanAnnotationStatus;
  trade: PlanAnnotationTrade | null;
  taskId: string | null;
  workAreaId: string | null;
  createdBy: string;
  createdAt: string;
  crewUserId: string | null;
  crewName: string | null;
};

type Option = { id: string; name: string };
type TaskOption = Option & {
  assigneeUserId: string | null;
  assignee: string | null;
};

type DraftMark = {
  kind: PlanAnnotationKind;
  x: number;
  y: number;
  geometry: PlanAnnotationGeometry;
};

const DRAW_TOOLS = PLAN_ANNOTATION_KINDS;

export function JobPlanBoard({
  jobId,
  documentId,
  imageUrl,
  contentType,
  sheetName,
  revision,
  jobLabel,
  pins,
  tasks,
  areas,
  mode,
  returnTo,
  highlightedTaskIds = [],
  editableTaskIds = highlightedTaskIds,
  placeAction,
  statusAction,
  voidAction,
}: {
  jobId: string;
  documentId: string;
  imageUrl: string;
  contentType: string;
  sheetName: string;
  revision: number;
  jobLabel: string;
  pins: PlanMarkView[];
  tasks: TaskOption[];
  areas: Option[];
  mode: "office" | "field";
  returnTo: string;
  highlightedTaskIds?: string[];
  editableTaskIds?: string[];
  placeAction?: (formData: FormData) => Promise<ActionState>;
  statusAction?: (formData: FormData) => Promise<ActionState>;
  voidAction?: (formData: FormData) => Promise<ActionState>;
}) {
  const sheetRef = useRef<PlanSheetHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    pins.find((pin) => highlightedTaskIds.includes(pin.taskId ?? ""))?.id ??
      pins[0]?.id ??
      null,
  );
  const [tool, setTool] = useState<PlanAnnotationKind | "select">("select");
  const [draft, setDraft] = useState<DraftMark | null>(null);
  const [mineOnly, setMineOnly] = useState(mode === "field");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<PlanAnnotationFilter>({});
  const dragRef = useRef<{
    kind: PlanAnnotationKind;
    origin: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const handleSuccess = () => {
      setDraft(null);
      setTool("select");
    };
    window.addEventListener("ops-action-success", handleSuccess);
    return () => window.removeEventListener("ops-action-success", handleSuccess);
  }, []);

  const pagePins = useMemo(
    () => pins.filter((pin) => pin.pageNumber === pageNumber),
    [pageNumber, pins],
  );
  const filteredPins = useMemo(() => {
    return pagePins.filter((pin) => {
      if (mineOnly && highlightedTaskIds.length > 0) {
        if (pin.taskId && !highlightedTaskIds.includes(pin.taskId)) return false;
      }
      return annotationMatchesFilter(pin, filters);
    });
  }, [filters, highlightedTaskIds, mineOnly, pagePins]);

  const selected =
    filteredPins.find((pin) => pin.id === selectedId) ??
    (draft ? null : (filteredPins.at(-1) ?? null));
  const canEditSelected =
    !selected?.taskId || editableTaskIds.includes(selected.taskId);
  const authors = useMemo(
    () => [...new Set(pins.map((pin) => pin.createdBy))].sort(),
    [pins],
  );
  const crews = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pin of pins) {
      if (pin.crewUserId) seen.set(pin.crewUserId, pin.crewName || pin.crewUserId);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [pins]);

  function pointFromEvent(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clampUnit((event.clientX - rect.left) / rect.width),
      y: clampUnit((event.clientY - rect.top) / rect.height),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const point = pointFromEvent(event);
    if (tool === "select" || mode !== "office" || !placeAction) {
      const next = hitTestMark(filteredPins, point);
      if (next) setSelectedId(next.id);
      return;
    }
    if (tool === "polygon") {
      setDraft((current) => {
        if (!current || current.kind !== "polygon") {
          return {
            kind: "polygon",
            x: point.x,
            y: point.y,
            geometry: { type: "polygon", points: [point] },
          };
        }
        const points =
          current.geometry.type === "polygon" ? current.geometry.points : [point];
        return {
          ...current,
          geometry: { type: "polygon", points: [...points, point] },
        };
      });
      setSelectedId(null);
      return;
    }
    if (tool === "pin" || tool === "text") {
      setDraft({
        kind: tool,
        x: point.x,
        y: point.y,
        geometry: { type: tool },
      });
      setSelectedId(null);
      return;
    }
    dragRef.current = { kind: tool, origin: point };
    setDraft({
      kind: tool,
      x: point.x,
      y: point.y,
      geometry: geometryFromDrag(tool, point, point, sheetRef.current?.aspect ?? 1),
    });
    setSelectedId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || !draft) return;
    const point = pointFromEvent(event);
    setDraft({
      kind: dragRef.current.kind,
      x: dragRef.current.origin.x,
      y: dragRef.current.origin.y,
      geometry: geometryFromDrag(
        dragRef.current.kind,
        dragRef.current.origin,
        point,
        sheetRef.current?.aspect ?? 1,
      ),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const sheetPng = (await sheetRef.current?.capturePng()) ?? null;
      await downloadMarkedUpPlan({
        jobLabel,
        sheetName,
        revision,
        marks: filteredPins,
        sheetPng,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "office" && placeAction
            ? (["select", ...DRAW_TOOLS] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={tool === item ? "default" : "outline"}
                  className="min-h-11"
                  onClick={() => {
                    setTool(item);
                    setDraft(null);
                  }}
                >
                  {item === "select"
                    ? "Select"
                    : PLAN_ANNOTATION_KIND_LABELS[item]}
                </Button>
              ))
            : null}
          {mode === "field" && highlightedTaskIds.length > 0 ? (
            <Button
              type="button"
              variant={mineOnly ? "default" : "outline"}
              className="min-h-11"
              onClick={() => setMineOnly((value) => !value)}
            >
              {mineOnly ? "Showing my work" : "Show all marks"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? "Exporting…" : "Export visible marks"}
          </Button>
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
              >
                Previous page
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pageNumber} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pageNumber >= pageCount}
                onClick={() =>
                  setPageNumber((value) => Math.min(pageCount, value + 1))
                }
              >
                Next page
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {tool !== "select" && mode === "office"
              ? tool === "polygon"
                ? "Tap each corner. Three points are required."
                : `Tap or drag to place a ${PLAN_ANNOTATION_KIND_LABELS[tool].toLowerCase()}.`
              : mode === "field" && !statusAction
                ? "This previous revision is read-only."
                : "Tap a mark to update the work."}
          </p>
        </div>

        <LayerFilters
          filters={filters}
          authors={authors}
          crews={crews}
          onChange={setFilters}
        />

        <div className="overflow-auto rounded-xl border bg-muted/30">
          <PlanSheet
            ref={sheetRef}
            src={imageUrl}
            contentType={contentType}
            pageNumber={pageNumber}
            onPageCount={setPageCount}
          >
            <button
              type="button"
              className="absolute inset-0 z-0 cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label={
                tool === "select" ? "Select a plan mark" : "Draw a plan mark"
              }
            />
            <svg
              className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
            >
              {filteredPins.map((mark) => (
                <MarkShape
                  key={mark.id}
                  mark={mark}
                  selected={selected?.id === mark.id}
                  highlighted={highlightedTaskIds.includes(mark.taskId ?? "")}
                />
              ))}
              {draft ? <MarkShape mark={{ ...draft, id: "draft", status: "planned" }} selected /> : null}
            </svg>
            {filteredPins.map((mark) => (
              <button
                type="button"
                key={`${mark.id}-hit`}
                className="absolute z-20 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                style={{
                  left: `${mark.x * 100}%`,
                  top: `${mark.y * 100}%`,
                  background: PLAN_ANNOTATION_STATUS_STROKES[mark.status],
                }}
                onClick={() => setSelectedId(mark.id)}
                aria-label={`${mark.title}: ${PLAN_ANNOTATION_STATUS_LABELS[mark.status]}`}
                aria-pressed={selected?.id === mark.id}
              />
            ))}
          </PlanSheet>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          {PLAN_ANNOTATION_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  PLAN_ANNOTATION_STATUS_TONES[status],
                )}
              />
              {PLAN_ANNOTATION_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-4 rounded-xl border bg-background p-4">
        {draft && placeAction ? (
          <ActionForm action={placeAction} className="space-y-3">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="pageNumber" value={String(pageNumber)} />
            <input type="hidden" name="x" value={String(draft.x)} />
            <input type="hidden" name="y" value={String(draft.y)} />
            <input type="hidden" name="kind" value={draft.kind} />
            <input
              type="hidden"
              name="geometry"
              value={JSON.stringify(draft.geometry)}
            />
            <div>
              <h2 className="font-semibold">
                New {PLAN_ANNOTATION_KIND_LABELS[draft.kind].toLowerCase()}
              </h2>
              <p className="text-sm text-muted-foreground">
                Link it to a task so the crew can tap complete.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-title">Title</Label>
              <Input id="pin-title" name="title" required maxLength={160} />
              <FieldError name="title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-trade">Trade</Label>
              <NativeSelect id="pin-trade" name="trade" defaultValue="">
                <option value="">Unspecified</option>
                {PLAN_ANNOTATION_TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {PLAN_ANNOTATION_TRADE_LABELS[trade]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-task">Task</Label>
              <NativeSelect id="pin-task" name="taskId" defaultValue="">
                <option value="">No linked task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-area">Work area</Label>
              <NativeSelect id="pin-area" name="workAreaId" defaultValue="">
                <option value="">Whole job</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-status">Status</Label>
              <NativeSelect id="pin-status" name="status" defaultValue="planned">
                {PLAN_ANNOTATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PLAN_ANNOTATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {draft.kind === "polygon" &&
            draft.geometry.type === "polygon" &&
            draft.geometry.points.length < 3 ? (
              <p className="text-sm text-muted-foreground">
                Add at least three points before saving.
              </p>
            ) : (
              <SubmitButton className="min-h-11 w-full" pendingLabel="Placing…">
                Save mark
              </SubmitButton>
            )}
          </ActionForm>
        ) : selected ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {PLAN_ANNOTATION_STATUS_LABELS[selected.status]}
                </Badge>
                <Badge variant="outline">
                  {PLAN_ANNOTATION_KIND_LABELS[selected.kind]}
                </Badge>
                {selected.trade ? (
                  <Badge variant="outline">
                    {PLAN_ANNOTATION_TRADE_LABELS[selected.trade]}
                  </Badge>
                ) : null}
              </div>
              <h2 className="mt-2 font-semibold">{selected.title}</h2>
              {selected.body ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selected.body}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {selected.createdBy}
                {selected.crewName ? ` · ${selected.crewName}` : ""}
              </p>
            </div>
            {mode === "field" && statusAction && canEditSelected ? (
              <ActionForm
                key={selected.id}
                action={statusAction}
                className="space-y-3"
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="annotationId" value={selected.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-2">
                  <Label htmlFor="field-status">What changed?</Label>
                  <NativeSelect
                    id="field-status"
                    name="status"
                    defaultValue="completed"
                  >
                    <option value="completed">Complete</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="deficiency">Deficiency</option>
                    <option value="planned">Not started</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-note">Optional note</Label>
                  <Textarea
                    id="field-note"
                    name="body"
                    rows={3}
                    placeholder="Photo taken, quantity, or why it is blocked."
                  />
                </div>
                <SubmitButton className="min-h-11 w-full" pendingLabel="Saving…">
                  Update mark
                </SubmitButton>
              </ActionForm>
            ) : mode === "field" && statusAction ? (
              <p className="text-sm text-muted-foreground">
                This mark is assigned to another crew member and is read-only.
              </p>
            ) : null}
            {mode === "office" && voidAction ? (
              <ConfirmForm
                action={voidAction}
                confirmLabel="Void mark"
                message={`Void ${selected.title}? The history stays, but the mark leaves the current plan.`}
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="annotationId" value={selected.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <SubmitButton variant="outline" className="min-h-11 w-full">
                  Void / erase
                </SubmitButton>
              </ConfirmForm>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {pins.length === 0
              ? "No marks yet. Place a pin, circle, polygon, arrow, or text label."
              : "Select a mark to review it."}
          </p>
        )}
      </aside>
    </div>
  );
}

function LayerFilters({
  filters,
  authors,
  crews,
  onChange,
}: {
  filters: PlanAnnotationFilter;
  authors: string[];
  crews: Array<{ id: string; name: string }>;
  onChange: (value: PlanAnnotationFilter) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border bg-background p-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="space-y-1 text-xs font-medium">
        Status
        <NativeSelect
          className="h-10"
          value={filters.statuses?.[0] ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              statuses: event.target.value
                ? [event.target.value as PlanAnnotationStatus]
                : undefined,
            })
          }
        >
          <option value="">All statuses</option>
          {PLAN_ANNOTATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PLAN_ANNOTATION_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium">
        Trade
        <NativeSelect
          className="h-10"
          value={filters.trades?.[0] ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              trades: event.target.value
                ? [event.target.value as PlanAnnotationTrade | "unspecified"]
                : undefined,
            })
          }
        >
          <option value="">All trades</option>
          {PLAN_ANNOTATION_TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {PLAN_ANNOTATION_TRADE_LABELS[trade]}
            </option>
          ))}
          <option value="unspecified">Unspecified</option>
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium">
        Author
        <NativeSelect
          className="h-10"
          value={filters.authors?.[0] ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              authors: event.target.value ? [event.target.value] : undefined,
            })
          }
        >
          <option value="">All authors</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium">
        Crew
        <NativeSelect
          className="h-10"
          value={filters.crewUserIds?.[0] ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              crewUserIds: event.target.value ? [event.target.value] : undefined,
            })
          }
        >
          <option value="">All crew</option>
          {crews.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium">
        From
        <Input
          type="date"
          className="h-10"
          value={filters.from ?? ""}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value || null })
          }
        />
      </label>
      <label className="space-y-1 text-xs font-medium sm:col-start-2 xl:col-start-5">
        To
        <Input
          type="date"
          className="h-10"
          value={filters.to ?? ""}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value || null })
          }
        />
      </label>
    </div>
  );
}

function MarkShape({
  mark,
  selected,
  highlighted = false,
}: {
  mark: {
    id: string;
    x: number;
    y: number;
    kind?: PlanAnnotationKind;
    geometry: PlanAnnotationGeometry;
    status?: PlanAnnotationStatus;
  };
  selected?: boolean;
  highlighted?: boolean;
}) {
  const color =
    PLAN_ANNOTATION_STATUS_STROKES[mark.status ?? "planned"] ?? "#64748b";
  const width = selected || highlighted ? 0.012 : 0.008;
  if (mark.geometry.type === "circle" || mark.geometry.type === "ellipse") {
    return (
      <ellipse
        cx={mark.x}
        cy={mark.y}
        rx={mark.geometry.rx}
        ry={mark.geometry.ry}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={width}
      />
    );
  }
  if (mark.geometry.type === "polygon") {
    return (
      <path
        d={`${polygonPath(mark.geometry.points)} Z`}
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeWidth={width}
      />
    );
  }
  if (mark.geometry.type === "arrow") {
    return (
      <g>
        <line
          x1={mark.x}
          y1={mark.y}
          x2={mark.geometry.x2}
          y2={mark.geometry.y2}
          stroke={color}
          strokeWidth={width}
        />
        <polygon points={arrowHeadPoints({ x: mark.x, y: mark.y }, { x: mark.geometry.x2, y: mark.geometry.y2 })} fill={color} />
      </g>
    );
  }
  if (mark.geometry.type === "text") {
    return (
      <text
        x={mark.x}
        y={mark.y}
        fill={color}
        fontSize="0.045"
        style={{ fontFamily: "sans-serif" }}
      >
        Aa
      </text>
    );
  }
  return (
    <circle
      cx={mark.x}
      cy={mark.y}
      r={selected ? 0.018 : 0.014}
      fill={color}
      stroke="#fff"
      strokeWidth={0.006}
    />
  );
}

function geometryFromDrag(
  kind: PlanAnnotationKind,
  origin: { x: number; y: number },
  edge: { x: number; y: number },
  aspect: number,
): PlanAnnotationGeometry {
  if (kind === "circle") {
    const radii = visualCircleRadii(origin, edge, aspect);
    return { type: "circle", ...radii };
  }
  if (kind === "ellipse") {
    return {
      type: "ellipse",
      rx: Math.max(0.01, Math.abs(edge.x - origin.x)),
      ry: Math.max(0.01, Math.abs(edge.y - origin.y)),
    };
  }
  if (kind === "arrow") {
    return { type: "arrow", x2: edge.x, y2: edge.y };
  }
  return { type: kind === "text" ? "text" : "pin" };
}
