import handler, { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
import { runWithCloudflareRequestContext } from "./.open-next/cloudflare/init.js";
import { StrongfoamAgent as StrongfoamAgentBase } from "./src/lib/cloudflare/agent";
import { dispatchJobBatch, type JobMessage } from "./src/lib/cloudflare/jobs";
import { schedulePlan } from "./src/lib/ops/automation-schedule";
import type { CloudflareBindings } from "./src/lib/cloudflare/platform";
import type { WorkerHandler } from "./src/worker/registry";
import { bucketPut, handleRoutingEmail, type RoutingMessage } from "./src/worker/inbound-email";
import { ProposalFollowupWorkflow } from "./src/worker/proposal-followup-workflow";

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
  async email(message: RoutingMessage, env: unknown, ctx: unknown) {
    await runWithCloudflareRequestContext(
      new Request(`${BACKGROUND_REQUEST_URL}email`),
      env,
      ctx,
      async () => {
        const bindings = env as CloudflareBindings;
        await handleRoutingEmail(message, {
          putObject: bucketPut(bindings),
          enqueue: async (proposal) => {
            if (!bindings.JOBS?.send) return false;
            await bindings.JOBS.send({
              kind: "leads.inbound",
              data: { proposal },
            });
            return true;
          },
          matchProposalReply: async (mail) => {
            const { STRONG_FOAM_ORGANIZATION_ID } = await import("./src/lib/ops/identity");
            const { listOpenProposalRefs } = await import("./src/lib/ops/proposal-followup-store");
            const { proposalReplyMatch } = await import("./src/lib/ops/proposal-followups");
            const open = await listOpenProposalRefs(STRONG_FOAM_ORGANIZATION_ID);
            return proposalReplyMatch({ ...mail, open });
          },
          saveStatusChange: async (draft) => {
            const { saveReviewDraft } = await import("./src/lib/ops/proposal-followup-store");
            await saveReviewDraft(draft);
          },
          classify: async (mail) => {
            const { STRONG_FOAM_ORGANIZATION_ID } = await import("./src/lib/ops/identity");
            const { classifyInboundReply } = await import("./src/lib/ops/proposal-reply-model");
            return classifyInboundReply({
              ...mail,
              ai: bindings.AI,
              env: bindings,
              dataset: bindings.AI_USAGE,
              organizationId: STRONG_FOAM_ORGANIZATION_ID,
            });
          },
        });
      },
    );
  },
};

/** Class export on the Worker entry so Wrangler binds STRONGFOAM_AGENT. */
export class StrongfoamAgent extends StrongfoamAgentBase {}

export { DOQueueHandler, DOShardedTagCache, ProposalFollowupWorkflow };
