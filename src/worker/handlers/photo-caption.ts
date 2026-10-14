import { getPlatform } from "@/lib/cloudflare/platform";
import { visionFallbackModel } from "@/lib/ops/photo-caption";
import { runFieldPhotoCaption } from "@/lib/ops/photo-caption-run";
import type { WorkerJob } from "@/worker/registry";

function firstData(job: WorkerJob | WorkerJob[]): Record<string, unknown> {
  const current = Array.isArray(job) ? job[0] : job;
  return current?.data ?? {};
}

export async function handlePhotoCaption(job: WorkerJob | WorkerJob[]): Promise<void> {
  const data = firstData(job);
  const organizationId = String(data.organizationId ?? "");
  const jobId = String(data.jobId ?? "");
  const documentId = String(data.documentId ?? "");
  const userId = String(data.userId ?? "");
  if (!organizationId || !jobId || !documentId || !userId) {
    throw new Error("field.photo-caption is missing its photo.");
  }
  const platform = await getPlatform();
  const fallback = visionFallbackModel({
    AI_GATEWAY_FALLBACK_MODEL:
      platform?.AI_GATEWAY_FALLBACK_MODEL ?? process.env.AI_GATEWAY_FALLBACK_MODEL,
  });
  await runFieldPhotoCaption({
    organizationId,
    jobId,
    documentId,
    userId,
    ai: platform?.AI as Parameters<typeof runFieldPhotoCaption>[0]["ai"],
    dataset: platform?.AI_USAGE,
    gatewayId: platform?.AI_GATEWAY_ID,
    fallbackModel: fallback || undefined,
  });
}
