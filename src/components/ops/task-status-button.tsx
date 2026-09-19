"use client";

import { useOptimistic, useTransition } from "react";
import { SubmitButton } from "@/components/ops/submit-button";
import type { TaskStatus } from "@/lib/ops/collaboration";

export function TaskStatusButton({
  action,
  jobId,
  requestId,
  taskId,
  status,
  returnTo,
  completeLabel = "Complete",
  reopenLabel = "Reopen",
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  jobId?: string;
  requestId?: string;
  taskId: string;
  status: TaskStatus;
  returnTo?: string;
  completeLabel?: string;
  reopenLabel?: string;
  className?: string;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const next = optimisticStatus === "done" ? "open" : "done";

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          setOptimisticStatus(next);
          await action(formData);
        });
      }}
    >
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      {requestId ? <input type="hidden" name="id" value={requestId} /> : null}
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={next} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <SubmitButton
        className={className ?? "min-h-11 md:min-h-8"}
        pendingLabel={optimisticStatus === "done" ? "Reopening…" : "Completing…"}
      >
        {optimisticStatus === "done" ? reopenLabel : completeLabel}
      </SubmitButton>
    </form>
  );
}
