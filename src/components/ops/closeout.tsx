import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  CLOSEOUT_STATUSES,
  closeoutStatusLabel,
  type Closeout,
} from "@/lib/ops/closeout";

export function CloseoutPanel({
  jobId,
  closeout,
  canEdit,
  jobClosed,
  recordAction,
}: {
  jobId: string;
  closeout: Closeout | null;
  canEdit: boolean;
  jobClosed: boolean;
  recordAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Closeout</CardTitle>
        <CardDescription>
          {canEdit
            ? "Record whether this job is preparing, ready, or signed. Signing waits until every inspection has passed. No price is stored, and this does not send the packet."
            : "Closeout on this job. It stores no price and does not send a packet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {closeout ? (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
            <div>
              <p className="font-medium">{closeoutStatusLabel(closeout.status)}</p>
              {closeout.note ? (
                <p className="text-sm text-muted-foreground">{closeout.note}</p>
              ) : null}
              {closeout.packetText ? (
                <p className="mt-2 text-sm text-muted-foreground">{closeout.packetText}</p>
              ) : null}
            </div>
            <StatusBadge status={closeout.status} label={closeoutStatusLabel(closeout.status)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No closeout on this job.</p>
        )}

        {canEdit && recordAction && !jobClosed ? (
          <ActionForm action={recordAction} className="grid gap-4">
            <input type="hidden" name="jobId" value={jobId} />
            <div className="space-y-2">
              <Label htmlFor={`closeout-status-${jobId}`}>Status</Label>
              <NativeSelect
                id={`closeout-status-${jobId}`}
                name="status"
                defaultValue={closeout?.status ?? "preparing"}
                className="h-11"
              >
                {CLOSEOUT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {closeoutStatusLabel(status)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`closeout-note-${jobId}`}>Note</Label>
              <Input
                id={`closeout-note-${jobId}`}
                name="note"
                maxLength={500}
                defaultValue={closeout?.note ?? ""}
                className="h-11"
              />
            </div>
            <SubmitButton pendingLabel="Recording…" className="min-h-11 w-full sm:w-auto">
              Record closeout
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
