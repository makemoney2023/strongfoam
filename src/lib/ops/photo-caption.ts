import { recordAiUsage, type AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import { demoAiFixturesEnabled, photoCaptionFixture } from "@/lib/ops/demo-ai-fixtures";
import { AI_GATEWAY_ID } from "@/lib/cloudflare/gateway";

export const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const VISION_FALLBACK_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

const CERTIFIED = /certified thickness|certif(?:y|ied)|code compliant|complies with|passes inspection|thickness is certified/i;

export function captionClaimsCertification(text: string): boolean {
  return CERTIFIED.test(text);
}

export function visionFallbackModel(env: { AI_GATEWAY_FALLBACK_MODEL?: string } = {}): string {
  if (env.AI_GATEWAY_FALLBACK_MODEL?.trim() === "off") return "";
  return VISION_FALLBACK_MODEL;
}

export type PhotoContext = {
  jobName: string;
  scope: string;
  areaNames: string[];
  areaIds: string[];
  taskTitle: string | null;
};

export type PhotoDraftSeed = {
  kind: "caption" | "area_tag" | "lot_reading" | "gauge_reading" | "coverage_flag" | "safety_flag";
  body: string;
  workAreaId: string | null;
};

export function photoDraftsFromModel(payload: unknown, context: PhotoContext): PhotoDraftSeed[] {
  if (!payload || typeof payload !== "object") return [];
  const row = payload as {
    caption?: unknown;
    areaId?: unknown;
    lot?: unknown;
    gauge?: unknown;
    coverage?: unknown;
    safety?: unknown;
  };
  const drafts: PhotoDraftSeed[] = [];
  const caption = clip(row.caption);
  if (caption && !captionClaimsCertification(caption)) {
    drafts.push({ kind: "caption", body: caption, workAreaId: null });
  }
  const areaId = typeof row.areaId === "string" ? row.areaId : "";
  if (areaId && context.areaIds.includes(areaId)) {
    const name = context.areaNames[context.areaIds.indexOf(areaId)] ?? "Work area";
    drafts.push({ kind: "area_tag", body: clip(name) || "Work area", workAreaId: areaId });
  }
  const lot = clip(row.lot);
  if (lot) drafts.push({ kind: "lot_reading", body: lot, workAreaId: null });
  const gauge = clip(row.gauge);
  if (gauge && !captionClaimsCertification(gauge)) {
    drafts.push({ kind: "gauge_reading", body: gauge, workAreaId: null });
  }
  const coverage = clip(row.coverage);
  if (coverage && !captionClaimsCertification(coverage)) {
    drafts.push({ kind: "coverage_flag", body: coverage, workAreaId: null });
  }
  const safety = clip(row.safety);
  if (safety && !captionClaimsCertification(safety)) {
    drafts.push({ kind: "safety_flag", body: safety, workAreaId: null });
  }
  return drafts;
}

function clip(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 500);
}

export function photoCaptionPrompt(context: PhotoContext): string {
  return [
    `Job: ${context.jobName}.`,
    context.scope ? `Scope: ${context.scope}` : "",
    context.taskTitle ? `Today's task: ${context.taskTitle}` : "",
    context.areaNames.length ? `Areas: ${context.areaNames.join(", ")}.` : "",
    "Describe only what is visible. Return JSON {caption, areaId, lot, gauge, coverage, safety}.",
    "Do not certify thickness or say the work complies.",
    `areaId must be one of: ${context.areaIds.join(", ") || "none"}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

type VisionAi = {
  run: (
    model: string,
    input: Record<string, unknown>,
    options: { gateway: { id: string } },
  ) => Promise<unknown>;
};

function readJson(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { response?: unknown; description?: unknown };
  if (typeof record.response === "string") {
    try {
      return JSON.parse(record.response);
    } catch {
      return { caption: record.response };
    }
  }
  if (record.response && typeof record.response === "object") return record.response;
  return payload;
}

export async function captionPhoto(args: {
  bytes: Uint8Array;
  contentType: string;
  context: PhotoContext;
  ai?: VisionAi;
  gatewayId?: string;
  fallbackModel?: string;
  usage?: { dataset?: AiUsageDataset; organizationId: string };
}): Promise<PhotoDraftSeed[]> {
  if (demoAiFixturesEnabled()) {
    return photoDraftsFromModel(photoCaptionFixture(args.context), args.context);
  }
  if (!args.ai) return [];
  const image = Buffer.from(args.bytes).toString("base64");
  const prompt = photoCaptionPrompt(args.context);
  const input = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${args.contentType};base64,${image}` } },
        ],
      },
    ],
  };
  const gateway = { id: args.gatewayId?.trim() || AI_GATEWAY_ID };
  const started = Date.now();
  const log = (model: string, status: "ok" | "error", outputChars: number, attempts: number) => {
    if (!args.usage?.organizationId) return;
    recordAiUsage(args.usage.dataset, {
      organizationId: args.usage.organizationId,
      purpose: "photo_caption",
      model,
      status,
      cache: "skip",
      latencyMs: Date.now() - started,
      attempts,
      inputChars: args.bytes.byteLength,
      outputChars,
    });
  };
  try {
    const result = await args.ai.run(VISION_MODEL, input, { gateway });
    const drafts = photoDraftsFromModel(readJson(result), args.context);
    log(VISION_MODEL, "ok", drafts.map((draft) => draft.body).join(" ").length, 1);
    return drafts;
  } catch (error) {
    const fallback = args.fallbackModel?.trim();
    if (!fallback || fallback === VISION_MODEL) {
      log(VISION_MODEL, "error", 0, 1);
      throw error;
    }
    try {
      const result = await args.ai.run(fallback, input, { gateway });
      const drafts = photoDraftsFromModel(readJson(result), args.context);
      log(fallback, "ok", drafts.map((draft) => draft.body).join(" ").length, 2);
      return drafts;
    } catch (fallbackError) {
      log(fallback, "error", 0, 2);
      throw fallbackError;
    }
  }
}
