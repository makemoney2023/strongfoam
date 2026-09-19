"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  captureProjectScheduleBaseline,
  removeProjectScheduleBaseline,
} from "@/app/app/projects/actions";
import type { ProjectScheduleBaseline } from "@/lib/ops/project-schedule";

export function ScheduleBaselineControls({
  projectId,
  baselines,
  selectedBaselineId,
  itemCount,
  returnTo,
}: {
  projectId: string;
  baselines: ProjectScheduleBaseline[];
  selectedBaselineId: string | null;
  itemCount: number;
  returnTo: string;
}) {
  const router = useRouter();
  const selected = baselines.find(
    (baseline) => baseline.id === selectedBaselineId,
  );

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-medium">
        <span>Baseline</span>
        <NativeSelect
          value={selectedBaselineId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            router.push(
              value ? `${returnTo}?scheduleBaseline=${value}` : returnTo,
            );
          }}
          className="h-11 min-w-44"
        >
          <option value="">None</option>
          {baselines.map((baseline) => (
            <option key={baseline.id} value={baseline.id}>
              {baseline.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <FormDialog
        triggerLabel="Capture baseline"
        triggerIcon={<CameraIcon aria-hidden="true" />}
        triggerVariant="outline"
        title="Capture schedule baseline"
        description={`Save immutable dates for ${itemCount} current jobs and tasks.`}
      >
        <ActionForm
          action={captureProjectScheduleBaseline}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-2">
            <Label htmlFor="baseline-name">Baseline name</Label>
            <Input
              id="baseline-name"
              name="name"
              className="h-11"
              maxLength={160}
              placeholder="Approved construction schedule"
              required
            />
            <FieldError name="name" />
          </div>
          <SubmitButton className="min-h-11">Capture baseline</SubmitButton>
        </ActionForm>
      </FormDialog>
      {selected ? (
        <>
          <p className="self-center text-xs text-muted-foreground">
            Captured{" "}
            {new Intl.DateTimeFormat("en-CA", {
              dateStyle: "medium",
            }).format(new Date(selected.capturedAt))}{" "}
            by {selected.capturedBy}
          </p>
          <ConfirmForm
            action={removeProjectScheduleBaseline}
            title="Remove schedule baseline?"
            message={`Remove “${selected.name}”? Its capture data will remain in audit history.`}
            confirmLabel="Remove baseline"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="baselineId" value={selected.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton variant="ghost" className="min-h-11">
              <Trash2Icon aria-hidden="true" />
              Remove
            </SubmitButton>
          </ConfirmForm>
        </>
      ) : null}
    </div>
  );
}
