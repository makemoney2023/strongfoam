import { processBidDocument } from "@/lib/ops/store";
import { createClamAvScanner } from "@/worker/clamav";
import type { WorkerJob } from "@/worker/registry";

async function scannerForWorker() {
  const host = process.env.CLAMAV_HOST?.trim();
  const port = Number(process.env.CLAMAV_PORT);
  if (!host || !Number.isInteger(port) || port <= 0) return null;
  return createClamAvScanner({ host, port });
}

function firstJob(job: WorkerJob | WorkerJob[]): WorkerJob | undefined {
  return Array.isArray(job) ? job[0] : job;
}

export async function handleScanDocument(
  job: WorkerJob | WorkerJob[],
): Promise<void> {
  const current = firstJob(job);
  const data = current?.data ?? {};
  const organizationId = String(data.organizationId ?? "");
  const opportunityId = String(data.opportunityId ?? "");
  const versionId = String(data.documentVersionId ?? data.aggregateId ?? "");
  if (!organizationId || !opportunityId || !versionId) {
    throw new Error("document.scan is missing its document version.");
  }
  const result = await processBidDocument(
    {
      organizationId,
      opportunityId,
      versionId,
    },
    await scannerForWorker(),
  );
  if (!result.ok) throw new Error(result.error);
}

export async function handleExtractDocument(
  job: WorkerJob | WorkerJob[],
): Promise<void> {
  const current = firstJob(job);
  const data = current?.data ?? {};
  const organizationId = String(data.organizationId ?? "");
  const opportunityId = String(data.opportunityId ?? "");
  const versionId = String(data.documentVersionId ?? data.aggregateId ?? "");
  if (!organizationId || !opportunityId || !versionId) {
    throw new Error("document.extract is missing its document version.");
  }
  const result = await processBidDocument({
    organizationId,
    opportunityId,
    versionId,
  });
  if (!result.ok) throw new Error(result.error);
}
