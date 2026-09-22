import { recordHeartbeat } from "@/lib/ops/background-jobs";

export type WorkerJob = {
  id: string;
  data?: Record<string, unknown>;
};

export type WorkerHandler = (job: WorkerJob | WorkerJob[]) => Promise<void>;

export const handlers: Record<string, WorkerHandler> = {
  "worker-heartbeat": async () => {
    recordHeartbeat(process.env.WORKER_ID ?? "strongfoam-worker");
  },
};
