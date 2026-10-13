import { recordHeartbeat } from "@/lib/ops/background-jobs";
import {
  runDailyAutopilot,
  runMorningBrief,
  runStaleSweep,
} from "@/lib/ops/automation-run";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { persistQueuedInbound } from "@/worker/inbound-email";
import { handleDraftBidEstimate } from "@/worker/handlers/draft-bid-estimate";
import { handleRetainImport } from "@/worker/handlers/retain-import";
import {
  handleExtractDocument,
  handleScanDocument,
} from "@/worker/handlers/scan-document";

export type WorkerJob = {
  id: string;
  data?: Record<string, unknown>;
};

export type WorkerHandler = (job: WorkerJob | WorkerJob[]) => Promise<void>;

function firstData(job: WorkerJob | WorkerJob[]): Record<string, unknown> {
  const current = Array.isArray(job) ? job[0] : job;
  return current?.data ?? {};
}

export const handlers: Record<string, WorkerHandler> = {
  "worker-heartbeat": async () => {
    const workerId = process.env.WORKER_ID ?? "strongfoam-worker";
    const recorded = recordHeartbeat(workerId);
    try {
      const { touchWorkerHeartbeat } = await import("@/lib/ops/store");
      await touchWorkerHeartbeat({
        organizationId:
          process.env.COMMERCIAL_HEARTBEAT_ORGANIZATION_ID?.trim() ||
          STRONG_FOAM_ORGANIZATION_ID,
        workerId,
        at: recorded.at,
      });
    } catch (error) {
      console.error("Worker heartbeat was not stored.", error);
    }
  },
  "document.scan": handleScanDocument,
  "document.extract": handleExtractDocument,
  "commercial_ai.draft": handleDraftBidEstimate,
  "data-import.retain": handleRetainImport,
  "ops.daily-autopilot": async (job) => {
    await runDailyAutopilot(firstData(job));
  },
  "ops.morning-brief": async (job) => {
    await runMorningBrief(firstData(job));
  },
  "ops.stale-sweep": async (job) => {
    await runStaleSweep(firstData(job));
  },
  "leads.inbound": async (job) => {
    await persistQueuedInbound(firstData(job));
  },
};
