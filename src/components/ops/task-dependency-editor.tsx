"use client";

import { Link2Icon, Trash2Icon } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addProjectTaskDependency,
  removeProjectTaskDependency,
} from "@/app/app/projects/actions";
import type { ProjectScheduleDependency } from "@/lib/ops/project-schedule";

type DependencyTaskOption = {
  id: string;
  title: string;
  jobNumber: string;
};

export function TaskDependencyEditor({
  projectId,
  task,
  tasks,
  incoming,
  returnTo,
}: {
  projectId: string;
  task: DependencyTaskOption;
  tasks: DependencyTaskOption[];
  incoming: ProjectScheduleDependency[];
  returnTo: string;
}) {
  const predecessors = incoming.flatMap((edge) => {
    const predecessor = tasks.find(
      (candidate) => candidate.id === edge.predecessorTaskId,
    );
    return predecessor ? [{ edge, predecessor }] : [];
  });

  return (
    <FormDialog
      triggerLabel={
        incoming.length > 0 ? `Dependencies (${incoming.length})` : "Dependencies"
      }
      triggerIcon={<Link2Icon aria-hidden="true" />}
      triggerVariant="ghost"
      triggerClassName="shrink-0"
      triggerAriaLabel={`Manage dependencies for ${task.title}`}
      title="Manage dependencies"
      description={`Choose work that must finish before “${task.title}” can start.`}
    >
      <div className="space-y-5">
        <ActionForm
          action={addProjectTaskDependency}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="successorTaskId" value={task.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`dependency-${task.id}-predecessor`}>
              Predecessor
            </Label>
            <NativeSelect
              id={`dependency-${task.id}-predecessor`}
              name="predecessorTaskId"
              className="h-11"
              required
            >
              <option value="">Choose a task</option>
              {tasks
                .filter((candidate) => candidate.id !== task.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.jobNumber} · {candidate.title}
                  </option>
                ))}
            </NativeSelect>
            <FieldError name="predecessorTaskId" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`dependency-${task.id}-lag`}>Lag (days)</Label>
            <Input
              id={`dependency-${task.id}-lag`}
              name="lagDays"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              className="h-11"
            />
            <FieldError name="lagDays" />
          </div>
          <div className="flex items-end">
            <SubmitButton className="min-h-11 w-full sm:w-auto">
              Add dependency
            </SubmitButton>
          </div>
        </ActionForm>

        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">Current predecessors</h3>
          {predecessors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No predecessors.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {predecessors.map(({ edge, predecessor }) => (
                <li
                  key={edge.id}
                  className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {predecessor.jobNumber} · {predecessor.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Finish-to-start · {edge.lagDays} working-day lag
                    </p>
                  </div>
                  <ConfirmForm
                    action={removeProjectTaskDependency}
                    message={`Remove ${predecessor.title} as a predecessor?`}
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="dependencyId"
                      value={edge.id}
                    />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <SubmitButton
                      variant="ghost"
                      className="min-h-11"
                      aria-label={`Remove dependency from ${predecessor.title}`}
                    >
                      <Trash2Icon aria-hidden="true" />
                      Remove
                    </SubmitButton>
                  </ConfirmForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
