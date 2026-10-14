import { isObjectStorage } from "@/lib/cloudflare/objects";
import type { AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import { getPlatform } from "@/lib/cloudflare/platform";
import { readStoredFile } from "@/lib/leads/adapters";
import { saveFieldDraft } from "@/lib/ops/field-draft-store";
import {
  captionPhoto,
  visionFallbackModel,
  type PhotoContext,
  type PhotoDraftSeed,
} from "@/lib/ops/photo-caption";
import {
  getJob,
  getJobDocumentDownload,
  listJobDocuments,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";

type VisionAi = Parameters<typeof captionPhoto>[0]["ai"];

export async function photoContextForJob(
  jobId: string,
  userId: string,
): Promise<PhotoContext | null> {
  const job = await getJob(jobId);
  if (!job) return null;
  const [areas, tasks] = await Promise.all([listWorkAreas(jobId), listJobTasks(jobId)]);
  const open = tasks.filter(
    (task) => task.status !== "done" && task.assigneeUserId === userId,
  );
  const task = open.length === 1 ? open[0] : null;
  return {
    jobName: job.name,
    scope: job.scope ?? "",
    areaNames: areas.map((area) => area.name),
    areaIds: areas.map((area) => area.id),
    taskTitle: task?.title ?? null,
  };
}

async function loadPhotoBytes(
  jobId: string,
  documentId: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const document = (await listJobDocuments(jobId)).find((item) => item.id === documentId);
  if (!document || document.kind !== "photo") return null;
  if (isObjectStorage(document.storage)) {
    const stored = await readStoredFile(document.pathname);
    if (!stored) return null;
    return { bytes: stored.body, contentType: document.contentType || stored.contentType };
  }
  const download = await getJobDocumentDownload(jobId, documentId);
  if (!download || download.kind !== "bytes") return null;
  return { bytes: download.bytes, contentType: download.contentType };
}

export async function storePhotoDrafts(args: {
  organizationId: string;
  jobId: string;
  documentId: string;
  userId: string;
  seeds: PhotoDraftSeed[];
}): Promise<number> {
  let stored = 0;
  for (const seed of args.seeds) {
    const draft = await saveFieldDraft({
      organizationId: args.organizationId,
      jobId: args.jobId,
      userId: args.userId,
      kind: seed.kind,
      body: seed.body,
      quote: seed.body,
      quantity: null,
      unit: null,
      workAreaId: seed.workAreaId,
      taskId: null,
      documentId: args.documentId,
      voiceNoteId: null,
      effect: null,
      source: "photo",
    });
    if (draft) stored += 1;
  }
  return stored;
}

export async function runFieldPhotoCaption(args: {
  organizationId: string;
  jobId: string;
  documentId: string;
  userId: string;
  bytes?: Uint8Array;
  contentType?: string;
  ai?: VisionAi;
  dataset?: AiUsageDataset;
  gatewayId?: string;
  fallbackModel?: string;
}): Promise<number> {
  const context = await photoContextForJob(args.jobId, args.userId);
  if (!context) return 0;
  const photo = args.bytes
    ? { bytes: args.bytes, contentType: args.contentType || "image/jpeg" }
    : await loadPhotoBytes(args.jobId, args.documentId);
  if (!photo) return 0;
  const seeds = await captionPhoto({
    bytes: photo.bytes,
    contentType: photo.contentType,
    context,
    ai: args.ai,
    gatewayId: args.gatewayId,
    fallbackModel: args.fallbackModel,
    usage: { dataset: args.dataset, organizationId: args.organizationId },
  });
  return storePhotoDrafts({ ...args, seeds });
}

export async function scheduleFieldPhotoCaption(args: {
  organizationId: string;
  jobId: string;
  documentId: string;
  userId: string;
  bytes?: Uint8Array;
  contentType?: string;
}): Promise<void> {
  try {
    const platform = await getPlatform();
    if (platform?.JOBS) {
      await platform.JOBS.send({
        kind: "field.photo-caption",
        data: {
          organizationId: args.organizationId,
          jobId: args.jobId,
          documentId: args.documentId,
          userId: args.userId,
        },
      });
      return;
    }
    const fallback = visionFallbackModel({
      AI_GATEWAY_FALLBACK_MODEL: platform?.AI_GATEWAY_FALLBACK_MODEL ?? process.env.AI_GATEWAY_FALLBACK_MODEL,
    });
    await runFieldPhotoCaption({
      ...args,
      ai: platform?.AI as VisionAi,
      dataset: platform?.AI_USAGE,
      gatewayId: platform?.AI_GATEWAY_ID,
      fallbackModel: fallback || undefined,
    });
  } catch (error) {
    console.error("Photo caption was not drafted.", error);
  }
}
