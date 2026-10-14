import { isFieldQuantityUnit, type FieldQuantityUnit } from "@/lib/ops/field-workspace";

export type PrefillTask = {
  id: string;
  jobId: string;
  assigneeUserId: string | null;
  status: string;
  statedUnit: string | null;
  workAreaId: string | null;
  title: string;
};

export type FieldPrefill = {
  jobId: string | null;
  jobName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  workAreaId: string | null;
  quantityUnit: FieldQuantityUnit | null;
  laborUnit: "bags" | "sq_ft" | null;
};

export function fieldPrefill(input: {
  dispatchedJobIds: string[];
  tasks: PrefillTask[];
  userId: string;
  jobNames?: Record<string, string>;
}): FieldPrefill {
  const dispatched = [...new Set(input.dispatchedJobIds.filter(Boolean))];
  const jobId = dispatched.length === 1 ? dispatched[0]! : null;
  const open = input.tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.assigneeUserId === input.userId &&
      (jobId === null || task.jobId === jobId),
  );
  const onJob = jobId ? open.filter((task) => task.jobId === jobId) : [];
  const task = onJob.length === 1 ? onJob[0]! : null;
  const quantityUnit =
    task?.statedUnit && isFieldQuantityUnit(task.statedUnit) ? task.statedUnit : null;
  const laborUnit =
    quantityUnit === "bags" || quantityUnit === "sq_ft" ? quantityUnit : null;
  return {
    jobId,
    jobName: jobId ? input.jobNames?.[jobId] ?? null : null,
    taskId: task?.id ?? null,
    taskTitle: task?.title ?? null,
    workAreaId: task?.workAreaId ?? null,
    quantityUnit,
    laborUnit,
  };
}

export function prefillSaveLabel(action: string, prefill: FieldPrefill): string {
  if (!prefill.jobName) return action;
  return `${action} · ${prefill.jobName}`;
}
