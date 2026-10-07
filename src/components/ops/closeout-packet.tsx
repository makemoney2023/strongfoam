import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  ASSEMBLY_LOCATIONS,
  assemblyLocationLabel,
  type InsulationAssembly,
} from "@/lib/ops/assembly";
import type { CloseoutPacketDraft } from "@/lib/ops/closeout-packet";

export function CloseoutPacketPanel({
  jobId,
  assembly,
  draft,
  draftError,
  canEdit,
  jobClosed,
  recordAction,
  saveAction,
}: {
  jobId: string;
  assembly: InsulationAssembly | null;
  draft: CloseoutPacketDraft | null;
  draftError: string | null;
  canEdit: boolean;
  jobClosed: boolean;
  recordAction?: (formData: FormData) => Promise<ActionState>;
  saveAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Closeout packet</CardTitle>
        <CardDescription>
          Insulation assembly fields for this job. Saving the draft keeps it on the closeout and does not send it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assembly ? (
          <p className="text-sm">
            {assemblyLocationLabel(assembly.location)} · target {assembly.targetRValue} · {assembly.areaSqFt} sq ft · {assembly.bagCount} bags of {assembly.product}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No insulation assembly on this job.</p>
        )}
        {draft ? (
          <p className="rounded-xl bg-muted/30 p-4 text-sm ring-1 ring-foreground/10">{draft.narrative}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {draftError ?? "Record the assembly to draft the packet."}
          </p>
        )}
        {canEdit && recordAction && !jobClosed ? (
          <ActionForm action={recordAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="jobId" value={jobId} />
            <div className="space-y-2">
              <Label htmlFor={`assembly-location-${jobId}`}>Location</Label>
              <NativeSelect id={`assembly-location-${jobId}`} name="location" defaultValue={assembly?.location ?? "wall"} className="h-11">
                {ASSEMBLY_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {assemblyLocationLabel(location)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`assembly-target-${jobId}`}>Target R-value</Label>
              <Input id={`assembly-target-${jobId}`} name="targetRValue" required defaultValue={assembly?.targetRValue ?? ""} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`assembly-area-${jobId}`}>Area (sq ft)</Label>
              <Input id={`assembly-area-${jobId}`} name="areaSqFt" required inputMode="numeric" defaultValue={assembly?.areaSqFt ?? ""} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`assembly-bags-${jobId}`}>Bags</Label>
              <Input id={`assembly-bags-${jobId}`} name="bagCount" required inputMode="numeric" defaultValue={assembly?.bagCount ?? ""} className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`assembly-product-${jobId}`}>Product</Label>
              <Input id={`assembly-product-${jobId}`} name="product" required maxLength={80} defaultValue={assembly?.product ?? ""} className="h-11" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`assembly-rebate-${jobId}`}>Rebate program</Label>
              <Input id={`assembly-rebate-${jobId}`} name="rebateProgram" maxLength={80} defaultValue={assembly?.rebateProgram ?? ""} className="h-11" />
            </div>
            <SubmitButton pendingLabel="Saving…" className="min-h-11 w-full sm:w-auto">
              Save assembly
            </SubmitButton>
          </ActionForm>
        ) : null}
        {canEdit && saveAction && draft && !jobClosed ? (
          <ActionForm action={saveAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <SubmitButton pendingLabel="Saving…" variant="outline" className="min-h-11">
              Save packet draft
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
