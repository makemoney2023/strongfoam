import { retainDueImports } from "@/lib/ops/import-store";
import type { WorkerJob } from "@/worker/registry";

function firstJob(job: WorkerJob | WorkerJob[]): WorkerJob | undefined {
  return Array.isArray(job) ? job[0] : job;
}

export async function handleRetainImport(job: WorkerJob | WorkerJob[]): Promise<void> {
  const data = firstJob(job)?.data ?? {};
  const organizationId = String(data.organizationId ?? "");
  if (!organizationId) {
    throw new Error("data-import.retain is missing its organization.");
  }
  await retainDueImports(organizationId, new Date());
}
