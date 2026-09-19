import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { FormDialog } from "@/components/ops/form-dialog";
import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addProjectJob } from "./actions";
import { JobFormFields } from "./job-form-fields";

type ProjectOption = {
  id: string;
  name: string;
  projectManager?: string | null;
};

/**
 * "New job" entry point. Jobs always belong to a project, so the dialog either
 * lets the user pick one or explains how to create the first project.
 */
export function NewJobDialog({
  projects,
  project,
  returnTo,
  triggerVariant = "default",
  triggerLabel = "New job",
  triggerClassName,
}: {
  projects?: ProjectOption[];
  /** Pre-select and lock a project (used on the project detail page). */
  project?: ProjectOption;
  returnTo: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const options = project ? [project] : projects ?? [];
  const hasProjects = options.length > 0;

  return (
    <FormDialog
      triggerLabel={triggerLabel}
      triggerIcon={<PlusIcon aria-hidden="true" />}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title={project ? `Add a job to ${project.name}` : "New job"}
      description={
        hasProjects
          ? "A job is one crew's scope of work on a project. The job number is assigned when you save."
          : "Jobs live inside a project, and a project is created the first time an opportunity is marked won."
      }
    >
      {hasProjects ? (
        <ActionForm action={addProjectJob} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="returnTo" value={returnTo} />
          {project ? (
            <>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="projectName" value={project.name} />
            </>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newJob-projectId">
                Project <span aria-hidden="true">*</span>
              </Label>
              <NativeSelect
                id="newJob-projectId"
                name="projectId"
                className="h-11"
                defaultValue={options[0]?.id ?? ""}
                required
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Need a new project? Mark the opportunity won and convert it first.
              </p>
            </div>
          )}
          <JobFormFields
            idPrefix="newJob"
            defaults={{ projectManager: project?.projectManager ?? "" }}
          />
          <div className="sm:col-span-2">
            <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto" pendingLabel="Creating job…">
              Create job
            </SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Review an estimate request and mark it won.</li>
            <li>Open its opportunity and choose “Create project and job”.</li>
            <li>Come back here to add more jobs to that project.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              className="min-h-11"
              nativeButton={false}
              render={<Link href="/app/requests" />}
            >
              Go to requests
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              render={<Link href="/app/opportunities?stage=won" />}
            >
              Won opportunities
            </Button>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
