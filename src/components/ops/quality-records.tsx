import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  QUALITY_KINDS,
  QUALITY_STATUSES,
  qualityKindLabel,
  qualityStatusLabel,
  type QualityRecord,
} from "@/lib/ops/quality";

export function QualityRecordPanel({
  jobId,
  records,
  canEdit,
  jobClosed,
  recordAction,
}: {
  jobId: string;
  records: QualityRecord[];
  canEdit: boolean;
  jobClosed: boolean;
  recordAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality</CardTitle>
        <CardDescription>
          {canEdit
            ? "Record a deficiency or rework for this job. The same name and kind updates that row. Inspections stay on their own list and out of the workforce score. No price is stored."
            : "Deficiencies and rework on this job. They store no price."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deficiencies or rework on this job.</p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li
                key={record.id}
                className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{record.name}</p>
                    <p className="text-sm text-muted-foreground">{qualityKindLabel(record.kind)}</p>
                    {record.note ? (
                      <p className="text-sm text-muted-foreground">{record.note}</p>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={record.status}
                    label={qualityStatusLabel(record.status)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {canEdit && recordAction && !jobClosed ? (
          <ActionForm action={recordAction} className="grid gap-4">
            <input type="hidden" name="jobId" value={jobId} />
            <div className="space-y-2">
              <Label htmlFor={`quality-kind-${jobId}`}>Kind</Label>
              <NativeSelect
                id={`quality-kind-${jobId}`}
                name="kind"
                defaultValue="deficiency"
                className="h-11"
              >
                {QUALITY_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {qualityKindLabel(kind)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quality-name-${jobId}`}>Name</Label>
              <Input
                id={`quality-name-${jobId}`}
                name="name"
                required
                maxLength={80}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quality-status-${jobId}`}>Status</Label>
              <NativeSelect
                id={`quality-status-${jobId}`}
                name="status"
                defaultValue="open"
                className="h-11"
              >
                {QUALITY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {qualityStatusLabel(status)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quality-note-${jobId}`}>Note</Label>
              <Input
                id={`quality-note-${jobId}`}
                name="note"
                maxLength={500}
                className="h-11"
              />
            </div>
            <SubmitButton pendingLabel="Recording…" className="min-h-11 w-full sm:w-auto">
              Record quality
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
