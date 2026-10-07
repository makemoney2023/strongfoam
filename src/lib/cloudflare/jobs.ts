import type { WorkerHandler, WorkerJob } from "@/worker/registry";

export type JobMessage = {
  kind: string;
  data?: Record<string, unknown>;
};

export type QueueJobMessage = {
  body: JobMessage;
  ack: () => void;
  retry: () => void;
};

export async function dispatchJobMessage(
  message: JobMessage,
  handlers: Record<string, WorkerHandler>,
): Promise<void> {
  const handler = handlers[message.kind];
  if (!handler) throw new Error(`Unknown background job: ${message.kind}`);
  const job: WorkerJob = { id: message.kind, data: message.data };
  await handler(job);
}

export async function dispatchJobBatch(
  messages: QueueJobMessage[],
  handlers: Record<string, WorkerHandler>,
): Promise<void> {
  for (const message of messages) {
    try {
      await dispatchJobMessage(message.body, handlers);
      message.ack();
    } catch (error) {
      console.error(error);
      message.retry();
    }
  }
}
