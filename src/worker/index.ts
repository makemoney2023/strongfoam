import { pathToFileURL } from "node:url";
import { PgBoss } from "pg-boss";
import { parseDatabaseConfig } from "@/db/config";
import { recordHeartbeat } from "@/lib/ops/background-jobs";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { handlers, type WorkerHandler } from "@/worker/registry";

const SHUTDOWN_TIMEOUT_MS = 30_000;

export type WorkerBoss = {
  start: () => Promise<unknown>;
  stop: (options?: { graceful?: boolean; timeout?: number }) => Promise<void>;
  work: (name: string, handler: WorkerHandler) => Promise<string>;
  createQueue: (name: string) => Promise<void>;
  schedule?: (name: string, cron: string, data?: object | null) => Promise<void>;
};

export type RunningWorker = {
  workerId: string;
  stop: () => Promise<void>;
};

export async function startWorker(
  boss: WorkerBoss,
  workerId = process.env.WORKER_ID ?? "strongfoam-worker",
): Promise<RunningWorker> {
  await boss.start();
  let active = 0;
  const heartbeat = setInterval(() => {
    const recorded = recordHeartbeat(workerId, new Date(), active);
    void import("@/lib/ops/store")
      .then(({ touchWorkerHeartbeat }) =>
        touchWorkerHeartbeat({
          organizationId:
            process.env.COMMERCIAL_HEARTBEAT_ORGANIZATION_ID?.trim() ||
            STRONG_FOAM_ORGANIZATION_ID,
          workerId,
          at: recorded.at,
        }),
      )
      .catch(() => undefined);
  }, 15_000);
  heartbeat.unref?.();

  for (const [name, handler] of Object.entries(handlers)) {
    await boss.createQueue(name);
    await boss.work(name, async (job) => {
      active += 1;
      try {
        await handler(job);
      } finally {
        active -= 1;
      }
    });
  }
  await boss.schedule?.("data-import.retain", "15 9 * * *", {});

  let stopping = false;
  return {
    workerId,
    async stop() {
      if (stopping) return;
      stopping = true;
      clearInterval(heartbeat);
      await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS });
    },
  };
}

async function main(): Promise<void> {
  const config = parseDatabaseConfig(process.env);
  if (!config.ok) throw new Error(config.error);
  const boss = new PgBoss(config.value.workerUrl);
  const worker = await startWorker(boss);
  const shutdown = () => {
    worker.stop().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error(error);
        process.exit(1);
      },
    );
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
