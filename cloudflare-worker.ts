import handler, { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
import { StrongfoamAgent } from "./src/lib/cloudflare/agent";
import { dispatchJobBatch, type JobMessage } from "./src/lib/cloudflare/jobs";
import type { WorkerHandler } from "./src/worker/registry";

type QueueMessage = {
  body: JobMessage;
  ack: () => void;
  retry: () => void;
};

async function handlers(): Promise<Record<string, WorkerHandler>> {
  const registry = await import("./src/worker/registry");
  return registry.handlers;
}

export default {
  fetch: handler.fetch,
  async queue(batch: { messages: QueueMessage[] }) {
    await dispatchJobBatch(batch.messages, await handlers());
  },
  async scheduled() {
    const retain = (await handlers())["data-import.retain"];
    if (!retain) throw new Error("data-import.retain is not registered.");
    await retain({ id: "data-import.retain", data: {} });
  },
};

export { DOQueueHandler, DOShardedTagCache, StrongfoamAgent };
