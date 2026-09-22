import { backgroundJobs, outboxEvents } from "@/db/schema";

export const BACKGROUND_JOB_STATUSES = [
  "queued",
  "running",
  "retry_wait",
  "completed",
  "dead_letter",
  "cancelled",
] as const;

export type BackgroundJobStatus = (typeof BACKGROUND_JOB_STATUSES)[number];

export const BACKGROUND_JOB_ATTEMPT_LIMIT = 5;

export type BackgroundJob = {
  id: string;
  organizationId: string;
  kind: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  status: BackgroundJobStatus;
  attempts: number;
  maxAttempts: number;
  checkpoint: Record<string, unknown> | null;
  lockedBy: string | null;
  nextRunAt: Date | null;
  payload: Record<string, unknown>;
  lastError: string | null;
};

export type OutboxEventInput = {
  organizationId: string;
  kind: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export type DbTransaction = {
  insert: (table: unknown) => {
    values: (values: Record<string, unknown>) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
};

export function claimJob(job: BackgroundJob, workerId: string): BackgroundJob {
  if (job.status !== "queued" && job.status !== "retry_wait") {
    throw new Error("Only queued work can be claimed.");
  }
  return {
    ...job,
    status: "running",
    lockedBy: workerId,
    attempts: job.attempts + 1,
    lastError: null,
  };
}

export function completeJob(job: BackgroundJob, workerId: string): BackgroundJob {
  if (job.status !== "running" || job.lockedBy !== workerId) {
    throw new Error("Only the worker that claimed this job can complete it.");
  }
  return { ...job, status: "completed", lockedBy: null };
}

export function checkpointJob(
  job: BackgroundJob,
  checkpoint: Record<string, unknown>,
): BackgroundJob {
  return {
    ...job,
    checkpoint: { ...(job.checkpoint ?? {}), ...checkpoint },
  };
}

export function exhaustJob(job: BackgroundJob): BackgroundJob {
  return { ...job, status: "dead_letter", lockedBy: null };
}

export function retryJob(job: BackgroundJob, now: Date): BackgroundJob {
  if (job.attempts >= job.maxAttempts) return exhaustJob(job);
  const delayMs = Math.min(30_000 * 2 ** Math.max(job.attempts - 1, 0), 15 * 60_000);
  return {
    ...job,
    status: "queued",
    lockedBy: null,
    nextRunAt: new Date(now.getTime() + delayMs),
  };
}

export function enqueueBackgroundJob(
  jobs: BackgroundJob[],
  job: BackgroundJob,
): BackgroundJob {
  const existing = jobs.find(
    (item) =>
      item.organizationId === job.organizationId &&
      item.idempotencyKey === job.idempotencyKey,
  );
  if (existing) return existing;
  jobs.push(job);
  return job;
}

export function runCheckpointedHandler(
  job: BackgroundJob,
  handler: (job: BackgroundJob) => BackgroundJob,
  now = new Date(),
): { job: BackgroundJob } {
  try {
    const updated = handler(job);
    return { job: completeJob(updated, job.lockedBy ?? "") };
  } catch (error) {
    const checkpoint =
      error &&
      typeof error === "object" &&
      "checkpoint" in error &&
      error.checkpoint &&
      typeof error.checkpoint === "object"
        ? (error.checkpoint as Record<string, unknown>)
        : null;
    const checkpointed = checkpoint ? checkpointJob(job, checkpoint) : job;
    return {
      job: retryJob(
        {
          ...checkpointed,
          lastError:
            error instanceof Error ? error.message : "Background job failed.",
        },
        now,
      ),
    };
  }
}

export async function writeOutbox(
  tx: DbTransaction,
  event: OutboxEventInput,
): Promise<void> {
  await tx
    .insert(outboxEvents)
    .values({
      organizationId: event.organizationId,
      kind: event.kind,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
    })
    .onConflictDoNothing();
  await tx
    .insert(backgroundJobs)
    .values({
      organizationId: event.organizationId,
      kind: event.kind,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      idempotencyKey: event.idempotencyKey,
      status: "queued",
      attempts: 0,
      maxAttempts: BACKGROUND_JOB_ATTEMPT_LIMIT,
      checkpoint: null,
      lockedBy: null,
      nextRunAt: null,
      payload: event.payload,
      lastError: null,
    })
    .onConflictDoNothing();
}

export type WorkerHeartbeat = {
  workerId: string;
  at: Date;
  active: number;
};

export function recordHeartbeat(
  workerId: string,
  at = new Date(),
  active = 0,
): WorkerHeartbeat {
  return { workerId, at, active };
}
