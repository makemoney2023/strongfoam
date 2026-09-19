"use client";

import { AlertTriangleIcon } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleProjectScheduleItem } from "@/app/app/projects/actions";

export type ReschedulePreview = {
  entityType: "job" | "task";
  entityId: string;
  jobId: string;
  label: string;
  expectedUpdatedAt: string;
  before: {
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    dueAt: string | null;
  };
  after: {
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    dueAt: string | null;
  };
  warnings: string[];
};

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function datetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function DateField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`reschedule-${name}`}>{label}</Label>
      <Input
        id={`reschedule-${name}`}
        name={name}
        type="datetime-local"
        className="h-11"
        defaultValue={datetimeLocal(value)}
      />
      <FieldError name={name} />
    </div>
  );
}

export function ScheduleRescheduleDialog({
  projectId,
  returnTo,
  preview,
  onOpenChange,
}: {
  projectId: string;
  returnTo: string;
  preview: ReschedulePreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={preview !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {preview ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm reschedule</DialogTitle>
              <DialogDescription>
                Review the exact before-and-after dates for “{preview.label}”.
                No schedule change is saved until you confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Before
                </p>
                <p className="mt-1 text-sm">
                  Start: {formatDate(preview.before.plannedStartAt)}
                  <br />
                  Completion: {formatDate(preview.before.plannedEndAt)}
                  <br />
                  Due: {formatDate(preview.before.dueAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Proposed
                </p>
                <p className="mt-1 text-sm">
                  Start: {formatDate(preview.after.plannedStartAt)}
                  <br />
                  Completion: {formatDate(preview.after.plannedEndAt)}
                  <br />
                  Due: {formatDate(preview.after.dueAt)}
                </p>
              </div>
            </div>
            {preview.warnings.map((warning) => (
              <Alert key={warning}>
                <AlertTriangleIcon aria-hidden="true" />
                <AlertTitle>Review schedule warning</AlertTitle>
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
            <ActionForm
              action={rescheduleProjectScheduleItem}
              className="grid gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="hidden"
                name="entityType"
                value={preview.entityType}
              />
              <input type="hidden" name="jobId" value={preview.jobId} />
              <input
                type="hidden"
                name="taskId"
                value={
                  preview.entityType === "task" ? preview.entityId : ""
                }
              />
              <input
                type="hidden"
                name="expectedUpdatedAt"
                value={preview.expectedUpdatedAt}
              />
              <input type="hidden" name="returnTo" value={returnTo} />
              <DateField
                name="plannedStartAt"
                label="Planned start"
                value={preview.after.plannedStartAt}
              />
              <DateField
                name="plannedEndAt"
                label="Planned completion"
                value={preview.after.plannedEndAt}
              />
              {preview.entityType === "task" ? (
                <DateField
                  name="dueAt"
                  label="Due date"
                  value={preview.after.dueAt}
                />
              ) : (
                <input type="hidden" name="dueAt" value="" />
              )}
              <DialogFooter className="sm:col-span-2">
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <SubmitButton className="min-h-11" pendingLabel="Saving…">
                  Confirm reschedule
                </SubmitButton>
              </DialogFooter>
            </ActionForm>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
