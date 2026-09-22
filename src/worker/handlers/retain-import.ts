import { retainDueImports } from "@/lib/ops/import-store";
import type { WorkerJob } from "@/worker/registry";

function firstJob(job: WorkerJob | WorkerJob[]): WorkerJob | undefined {
  return Array.isArray(job) ? job[0] : job;
}

export async function handleRetainImport(job: WorkerJob | WorkerJob[]): Promise<void> {
  const data = firstJob(job)?.data ?? {};
  const organizationId = String(data.organizationId ?? "").trim();
  await retainDueImports(organizationId || undefined, new Date());
}
