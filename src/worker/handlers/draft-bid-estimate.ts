import { runCommercialDraftJob } from "@/lib/ops/store";
import type { WorkerJob } from "@/worker/registry";

function firstJob(job: WorkerJob | WorkerJob[]): WorkerJob | undefined {
  return Array.isArray(job) ? job[0] : job;
}

export async function handleDraftBidEstimate(job: WorkerJob | WorkerJob[]): Promise<void> {
  const data = firstJob(job)?.data ?? {};
  const selected = Array.isArray(data.selectedDocumentVersionIds)
    ? data.selectedDocumentVersionIds.map((item) => String(item))
    : [];
  const result = await runCommercialDraftJob({
    organizationId: String(data.organizationId ?? ""),
    opportunityId: String(data.opportunityId ?? ""),
    actorEmail: String(data.actorEmail ?? "commercial-ai"),
    idempotencyKey: String(data.idempotencyKey ?? ""),
    selectedDocumentVersionIds: selected,
    mode: data.mode === "revision" ? "revision" : "new",
  });
  if (!result.ok) throw new Error(result.error);
}
