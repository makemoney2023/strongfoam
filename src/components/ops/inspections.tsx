import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  INSPECTION_RESULTS,
  inspectionResultLabel,
  type Inspection,
} from "@/lib/ops/inspection";

export function InspectionPanel({
  jobId,
  inspections,
  canEdit,
  jobClosed,
  recordAction,
}: {
  jobId: string;
  inspections: Inspection[];
  canEdit: boolean;
  jobClosed: boolean;
  recordAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspections</CardTitle>
        <CardDescription>
          {canEdit
            ? "Record a pass or fail for this job. The same name updates that inspection. Home lists open and failed results. No price is stored."
            : "Inspections on this job. They store no price."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {inspections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inspections on this job.</p>
        ) : (
          <ul className="space-y-3">
            {inspections.map((inspection) => (
              <li
                key={inspection.id}
                className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{inspection.name}</p>
                    {inspection.note ? (
                      <p className="text-sm text-muted-foreground">{inspection.note}</p>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={inspection.result}
                    label={inspectionResultLabel(inspection.result)}
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
              <Label htmlFor={`inspection-name-${jobId}`}>Inspection</Label>
              <Input
                id={`inspection-name-${jobId}`}
                name="name"
                required
                maxLength={80}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`inspection-result-${jobId}`}>Result</Label>
              <NativeSelect
                id={`inspection-result-${jobId}`}
                name="result"
                defaultValue="open"
                className="h-11"
              >
                {INSPECTION_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {inspectionResultLabel(result)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`inspection-note-${jobId}`}>Note</Label>
              <Input
                id={`inspection-note-${jobId}`}
                name="note"
                maxLength={500}
                className="h-11"
              />
            </div>
            <SubmitButton pendingLabel="Recording…" className="min-h-11 w-full sm:w-auto">
              Record inspection
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
