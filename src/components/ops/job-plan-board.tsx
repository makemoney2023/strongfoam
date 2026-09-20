"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PLAN_ANNOTATION_STATUS_LABELS,
  PLAN_ANNOTATION_STATUS_TONES,
  PLAN_ANNOTATION_STATUSES,
  type PlanAnnotationStatus,
} from "@/lib/ops/plan-markup";
import type { ActionState } from "@/lib/ops/action-result";

export type PlanPinView = {
  id: string;
  x: number;
  y: number;
  title: string;
  body: string | null;
  status: PlanAnnotationStatus;
  taskId: string | null;
  workAreaId: string | null;
  createdBy: string;
};

type Option = { id: string; name: string };

export function JobPlanBoard({
  jobId,
  documentId,
  imageUrl,
  pins,
  tasks,
  areas,
  mode,
  returnTo,
  highlightedTaskIds = [],
  placeAction,
  statusAction,
  voidAction,
}: {
  jobId: string;
  documentId: string;
  imageUrl: string;
  pins: PlanPinView[];
  tasks: Option[];
  areas: Option[];
  mode: "office" | "field";
  returnTo: string;
  highlightedTaskIds?: string[];
  placeAction?: (formData: FormData) => Promise<ActionState>;
  statusAction?: (formData: FormData) => Promise<ActionState>;
  voidAction?: (formData: FormData) => Promise<ActionState>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    pins.find((pin) => highlightedTaskIds.includes(pin.taskId ?? ""))?.id ??
      pins[0]?.id ??
      null,
  );
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [mineOnly, setMineOnly] = useState(mode === "field");

  useEffect(() => {
    const handleSuccess = () => {
      setPlacing(false);
      setDraft(null);
    };
    window.addEventListener("ops-action-success", handleSuccess);
    return () => window.removeEventListener("ops-action-success", handleSuccess);
  }, []);

  const visiblePins = useMemo(() => {
    if (!mineOnly || highlightedTaskIds.length === 0) return pins;
    return pins.filter(
      (pin) => !pin.taskId || highlightedTaskIds.includes(pin.taskId),
    );
  }, [highlightedTaskIds, mineOnly, pins]);

  const selected =
    visiblePins.find((pin) => pin.id === selectedId) ??
    (draft ? null : (visiblePins.at(-1) ?? null));

  function handleSheetClick(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (placing && mode === "office") {
      setDraft({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      });
      setSelectedId(null);
      return;
    }
    const next = nearestPin(visiblePins, x, y);
    if (next) setSelectedId(next.id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "office" && placeAction ? (
            <Button
              type="button"
              variant={placing ? "default" : "outline"}
              className="min-h-11"
              onClick={() => {
                setPlacing((value) => !value);
                setDraft(null);
              }}
            >
              {placing ? "Cancel pin" : "Place pin"}
            </Button>
          ) : null}
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
          <p className="text-sm text-muted-foreground">
            {placing
              ? "Tap the room or wall that is done. Then name the mark."
              : mode === "field" && !statusAction
                ? "This previous revision is read-only."
                : "Tap a pin to update the work."}
          </p>
        </div>

        <div className="overflow-auto rounded-xl border bg-muted/30">
          <div className="relative mx-auto block min-w-full touch-pan-x touch-pan-y">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Job plan"
              className="block h-auto w-full max-w-none select-none"
              draggable={false}
            />
            <button
              type="button"
              className="absolute inset-0 z-0 cursor-crosshair"
              onClick={handleSheetClick}
              aria-label={
                placing ? "Place a pin on the plan" : "Select a plan mark"
              }
            />
            {visiblePins.map((pin) => (
              <button
                type="button"
                key={pin.id}
                className={cn(
                  "absolute z-10 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
                  PLAN_ANNOTATION_STATUS_TONES[pin.status],
                  selected?.id === pin.id && "ring-4 ring-foreground/30",
                  highlightedTaskIds.includes(pin.taskId ?? "") &&
                    "size-8 ring-2 ring-sky-300",
                )}
                style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                onClick={() => setSelectedId(pin.id)}
                aria-label={`${pin.title}: ${PLAN_ANNOTATION_STATUS_LABELS[pin.status]}`}
                aria-pressed={selected?.id === pin.id}
              />
            ))}
            {draft ? (
              <span
                className="absolute z-10 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-500 shadow-md"
                style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
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
            <input type="hidden" name="x" value={String(draft.x)} />
            <input type="hidden" name="y" value={String(draft.y)} />
            <div>
              <h2 className="font-semibold">New pin</h2>
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
            <SubmitButton className="min-h-11 w-full" pendingLabel="Placing…">
              Save pin
            </SubmitButton>
          </ActionForm>
        ) : selected ? (
          <div className="space-y-4">
            <div>
              <Badge variant="secondary">
                {PLAN_ANNOTATION_STATUS_LABELS[selected.status]}
              </Badge>
              <h2 className="mt-2 font-semibold">{selected.title}</h2>
              {selected.body ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selected.body}
                </p>
              ) : null}
            </div>
            {mode === "field" && statusAction ? (
              <ActionForm action={statusAction} className="space-y-3">
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
            ) : null}
            {mode === "office" && voidAction ? (
              <ConfirmForm
                action={voidAction}
                confirmLabel="Void pin"
                message={`Void ${selected.title}? The history stays, but the pin leaves the current plan.`}
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="annotationId" value={selected.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <SubmitButton variant="outline" className="min-h-11 w-full">
                  Void pin
                </SubmitButton>
              </ConfirmForm>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {pins.length === 0
              ? "No pins yet. Place one on a room or wall."
              : "Select a pin to review it."}
          </p>
        )}
      </aside>
    </div>
  );
}

function nearestPin(pins: PlanPinView[], x: number, y: number) {
  let match: PlanPinView | null = null;
  let best = 0.045;
  for (const pin of pins) {
    const distance = Math.hypot(pin.x - x, pin.y - y);
    if (distance < best) {
      best = distance;
      match = pin;
    }
  }
  return match;
}
