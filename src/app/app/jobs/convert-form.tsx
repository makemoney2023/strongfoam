import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertWonWorkToProject } from "./actions";
import { JobFormFields } from "./job-form-fields";

export function ConvertWonWorkForm({
  opportunityId,
  returnTo,
  defaults,
}: {
  opportunityId: string;
  returnTo: string;
  defaults: {
    projectName: string;
    jobName: string;
    scope: string;
    projectManager?: string | null;
  };
}) {
  return (
    <form action={convertWonWorkToProject} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="convert-projectName">
          Project name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="convert-projectName"
          name="projectName"
          className="h-11"
          defaultValue={defaults.projectName}
          required
        />
      </div>
      <JobFormFields
        idPrefix="convert"
        nameLabel="First job"
        defaults={{
          jobName: defaults.jobName,
          scope: defaults.scope,
          projectManager: defaults.projectManager,
        }}
      />
      <div className="sm:col-span-2">
        <SubmitButton
          variant="default"
          className="min-h-11 w-full sm:w-auto"
          pendingLabel="Creating project…"
        >
          Create project and job
        </SubmitButton>
      </div>
    </form>
  );
}
