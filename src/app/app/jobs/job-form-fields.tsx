import { FieldError } from "@/components/ops/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Shared job fields used when converting won work, adding a job to a project, or creating from the jobs list. */
export function JobFormFields({
  idPrefix,
  nameLabel = "Job name",
  defaults = {},
}: {
  idPrefix: string;
  nameLabel?: string;
  defaults?: {
    jobName?: string;
    scope?: string;
    projectManager?: string | null;
    foreman?: string | null;
    plannedStartAt?: string;
    plannedEndAt?: string;
  };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("jobName")}>
          {nameLabel} <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={id("jobName")}
          name="jobName"
          className="h-11"
          defaultValue={defaults.jobName ?? ""}
          maxLength={160}
          required
        />
        <FieldError name="jobName" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("scope")}>Scope</Label>
        <Textarea
          id={id("scope")}
          name="scope"
          rows={3}
          defaultValue={defaults.scope ?? ""}
          placeholder="What the crew is doing on site"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("projectManager")}>Project manager</Label>
        <Input
          id={id("projectManager")}
          name="projectManager"
          className="h-11"
          defaultValue={defaults.projectManager ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("foreman")}>Foreman</Label>
        <Input
          id={id("foreman")}
          name="foreman"
          className="h-11"
          defaultValue={defaults.foreman ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("plannedStartAt")}>Planned start</Label>
        <Input
          id={id("plannedStartAt")}
          name="plannedStartAt"
          type="datetime-local"
          className="h-11"
          defaultValue={defaults.plannedStartAt ?? ""}
        />
        <FieldError name="plannedStartAt" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("plannedEndAt")}>Planned end</Label>
        <Input
          id={id("plannedEndAt")}
          name="plannedEndAt"
          type="datetime-local"
          className="h-11"
          defaultValue={defaults.plannedEndAt ?? ""}
        />
        <FieldError name="plannedEndAt" />
      </div>
    </>
  );
}
