import handler, { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
import { runWithCloudflareRequestContext } from "./.open-next/cloudflare/init.js";
import { StrongfoamAgent } from "./src/lib/cloudflare/agent";
import { dispatchJobBatch, type JobMessage } from "./src/lib/cloudflare/jobs";
import { schedulePlan } from "./src/lib/ops/automation-schedule";
import type { WorkerHandler } from "./src/worker/registry";

type QueueMessage = {
  body: JobMessage;
  ack: () => void;
  retry: () => void;
};

const BACKGROUND_REQUEST_URL = "https://strongfoam.background/";

async function handlers(): Promise<Record<string, WorkerHandler>> {
  const registry = await import("./src/worker/registry");
  return registry.handlers;
}

export default {
  fetch: handler.fetch,
  async queue(batch: { messages: QueueMessage[] }, env: unknown, ctx: unknown) {
    await runWithCloudflareRequestContext(
      new Request(`${BACKGROUND_REQUEST_URL}queue`),
      env,
      ctx,
      async () => dispatchJobBatch(batch.messages, await handlers()),
    );
  },
  async scheduled(controller: { cron?: string }, env: unknown, ctx: unknown) {
    await runWithCloudflareRequestContext(
      new Request(`${BACKGROUND_REQUEST_URL}scheduled`),
      env,
      ctx,
      async () => {
        const plan = schedulePlan(controller?.cron ?? "");
        const registry = await handlers();
        const queue = (env as { JOBS?: { send(message: { kind: string; data?: Record<string, unknown> }): Promise<void> } } | null)
          ?.JOBS;
        for (const message of plan) {
          if (queue?.send) {
            await queue.send(message);
            continue;
          }
          const handler = registry[message.kind];
          if (!handler) throw new Error(`${message.kind} is not registered.`);
          await handler({ id: message.kind, data: message.data });
        }
      },
    );
  },
};

export { DOQueueHandler, DOShardedTagCache, StrongfoamAgent };
