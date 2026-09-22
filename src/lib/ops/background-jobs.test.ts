import { describe, expect, it } from "vitest";
import { backgroundJobs, outboxEvents } from "@/db/schema";
import {
  checkpointJob,
  claimJob,
  completeJob,
  enqueueBackgroundJob,
  exhaustJob,
  retryJob,
  runCheckpointedHandler,
  writeOutbox,
  type BackgroundJob,
  type DbTransaction,
} from "@/lib/ops/background-jobs";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { startWorker } from "@/worker";

const fixedNow = new Date("2026-09-22T12:00:00.000Z");

function queuedJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    kind: "extract-document",
    aggregateType: "document_version",
    aggregateId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    idempotencyKey: "extract:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    status: "queued",
    attempts: 0,
    maxAttempts: 5,
    checkpoint: null,
    lockedBy: null,
    nextRunAt: null,
    payload: { documentVersionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1" },
    lastError: null,
    ...overrides,
  };
}

describe("background job transitions", () => {
  it("completes a job only for the worker that claimed it", () => {
    const job = queuedJob();
    expect(completeJob(claimJob(job, "worker-1"), "worker-1").status).toBe(
      "completed",
    );
  });

  it("requeues a failed job until the attempt budget is spent", () => {
    const failedJob = queuedJob({
      status: "running",
      attempts: 1,
      lockedBy: "worker-1",
      lastError: "scanner timeout",
    });
    expect(retryJob(failedJob, fixedNow).status).toBe("queued");
    expect(exhaustJob({ ...failedJob, attempts: 5 }).status).toBe(
      "dead_letter",
    );
  });

  it("stores a checkpoint without changing the attempt", () => {
    const job = claimJob(queuedJob(), "worker-1");
    expect(checkpointJob(job, { page: 12 }).checkpoint).toEqual({ page: 12 });
    expect(checkpointJob(job, { page: 12 }).attempts).toBe(job.attempts);
  });

  it("returns the existing job for the same idempotency key", () => {
    const jobs: BackgroundJob[] = [];
    const input = queuedJob();
    const first = enqueueBackgroundJob(jobs, input);
    const second = enqueueBackgroundJob(jobs, {
      ...input,
      id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    });
    expect(second).toBe(first);
    expect(jobs).toHaveLength(1);
  });

  it("resumes after a checkpoint and does not repeat the effect", () => {
    const effects: number[] = [];
    const handler = (job: BackgroundJob): BackgroundJob => {
      const page = Number(job.checkpoint?.page ?? 0);
      if (page < 2) {
        throw Object.assign(new Error("failed after page 2"), {
          checkpoint: { page: 2 },
        });
      }
      effects.push(page + 1);
      return checkpointJob(job, { page: page + 1 });
    };

    const firstPass = runCheckpointedHandler(
      claimJob(queuedJob(), "worker-1"),
      handler,
    );
    expect(firstPass.job.status).toBe("queued");
    expect(firstPass.job.checkpoint).toEqual({ page: 2 });

    const secondPass = runCheckpointedHandler(
      claimJob(firstPass.job, "worker-2"),
      handler,
    );
    expect(secondPass.job.status).toBe("completed");
    expect(secondPass.job.checkpoint).toEqual({ page: 3 });
    expect(effects).toEqual([3]);

    let exhausted = queuedJob({
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd9",
      idempotencyKey: "extract:other",
      attempts: 5,
      status: "running",
      lastError: "still failing",
    });
    exhausted = retryJob(exhausted, fixedNow);
    expect(exhausted.status).toBe("dead_letter");
    expect(effects).toEqual([3]);
  });
});

describe("worker process", () => {
  it("registers handlers and stops without claiming more work", async () => {
    const registered: string[] = [];
    let stopped = false;
    const worker = await startWorker({
      start: async () => undefined,
      stop: async () => {
        stopped = true;
      },
      createQueue: async (name) => {
        registered.push(name);
      },
      work: async (name) => {
        registered.push(`work:${name}`);
        return "worker";
      },
    });
    await worker.stop();
    await worker.stop();
    expect(stopped).toBe(true);
    expect(registered).toContain("worker-heartbeat");
    expect(registered).toContain("work:worker-heartbeat");
  });
});

describe("transactional outbox", () => {
  it("writes the outbox event and queued job through the same transaction", async () => {
    const statements: Array<{ table: unknown; values: Record<string, unknown> }> =
      [];
    const tx = {
      insert(table: unknown) {
        return {
          values(values: Record<string, unknown>) {
            statements.push({ table, values });
            return {
              onConflictDoNothing() {
                return Promise.resolve();
              },
            };
          },
        };
      },
    } as unknown as DbTransaction;

    await writeOutbox(tx, {
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      kind: "scan-document",
      aggregateType: "document_version",
      aggregateId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
      idempotencyKey: "scan:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
      payload: { documentVersionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1" },
    });

    expect(statements.map((statement) => statement.table)).toEqual([
      outboxEvents,
      backgroundJobs,
    ]);
    expect(statements[1]?.values.status).toBe("queued");
    expect(statements[1]?.values.idempotencyKey).toBe(
      "scan:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    );
  });
});
