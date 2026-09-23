import { ActionForm } from "@/components/ops/action-form";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  equipmentStatusLabel,
  type EquipmentAssignment,
} from "@/lib/ops/equipment";

export function EquipmentPanel({
  jobId,
  assignments,
  canEdit,
  jobClosed,
  assignAction,
  releaseAction,
}: {
  jobId: string;
  assignments: EquipmentAssignment[];
  canEdit: boolean;
  jobClosed: boolean;
  assignAction?: (formData: FormData) => Promise<ActionState>;
  releaseAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
        <CardDescription>
          {canEdit
            ? "Assign a named piece of equipment to this job. Releasing keeps the record. The same name on two open jobs shows on Home. No rate is stored."
            : "Equipment assigned to this job. It stores no rate."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No equipment on this job.</p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{assignment.name}</p>
                    {assignment.note ? (
                      <p className="text-sm text-muted-foreground">{assignment.note}</p>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={assignment.status}
                    label={equipmentStatusLabel(assignment.status)}
                  />
                </div>
                {canEdit && assignment.status === "assigned" && releaseAction ? (
                  <div className="mt-3">
                    <ActionForm action={releaseAction}>
                      <input type="hidden" name="jobId" value={jobId} />
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <SubmitButton
                        variant="outline"
                        pendingLabel="Releasing…"
                        className="min-h-11"
                      >
                        Release
                      </SubmitButton>
                    </ActionForm>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit && assignAction && !jobClosed ? (
          <ActionForm action={assignAction} className="grid gap-4">
            <input type="hidden" name="jobId" value={jobId} />
            <div className="space-y-2">
              <Label htmlFor={`equipment-name-${jobId}`}>Equipment</Label>
              <Input
                id={`equipment-name-${jobId}`}
                name="name"
                required
                maxLength={80}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`equipment-note-${jobId}`}>Note</Label>
              <Input
                id={`equipment-note-${jobId}`}
                name="note"
                maxLength={500}
                className="h-11"
              />
            </div>
            <SubmitButton pendingLabel="Assigning…" className="min-h-11 w-full sm:w-auto">
              Assign equipment
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
