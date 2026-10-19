import { completeThroughGateway, type WorkersAi } from "@/lib/cloudflare/gateway";
import { modelForTask } from "@/lib/cloudflare/model-routing";
import type { AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import { isFieldQuantityUnit, type FieldQuantityUnit } from "@/lib/ops/field-workspace";
import { saveFieldDraft } from "@/lib/ops/field-draft-store";
import { demoAiFixturesEnabled, GOLDEN_VOICE_TRANSCRIPT, voiceExtractionFixture } from "@/lib/ops/demo-ai-fixtures";
import { quoteIsGrounded } from "@/lib/ops/field-drafts";
import { getJob } from "@/lib/ops/store";
import { getPlatform } from "@/lib/cloudflare/platform";

export const VOICE_DRAFT_KINDS = [
  "daily_report",
  "quantity",
  "blocker",
  "material_request",
] as const;

export type VoiceDraftKind = (typeof VOICE_DRAFT_KINDS)[number];

export type VoiceDraftCard = {
  kind: VoiceDraftKind;
  quote: string;
  body: string;
  quantity: number | null;
  unit: FieldQuantityUnit | null;
};

function isKind(value: string): value is VoiceDraftKind {
  return (VOICE_DRAFT_KINDS as readonly string[]).includes(value);
}

function numberInQuote(quantity: number, quote: string): boolean {
  return quote.includes(String(quantity));
}

export function voiceDraftsFromModel(transcript: string, payload: unknown): VoiceDraftCard[] {
  const source = transcript.trim();
  if (!source || !payload || typeof payload !== "object") return [];
  const cards = (payload as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return [];
  const kept: VoiceDraftCard[] = [];
  for (const card of cards) {
    if (!card || typeof card !== "object") continue;
    const row = card as { kind?: unknown; quote?: unknown; quantity?: unknown; unit?: unknown };
    const kind = typeof row.kind === "string" ? row.kind : "";
    const quote = typeof row.quote === "string" ? row.quote.trim() : "";
    if (!isKind(kind) || !quoteIsGrounded(quote, source)) continue;
    if (kind === "quantity") {
      const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
      const unit = typeof row.unit === "string" ? row.unit : "";
      if (!Number.isInteger(quantity) || quantity <= 0 || !isFieldQuantityUnit(unit)) continue;
      if (!numberInQuote(quantity, quote)) continue;
      kept.push({ kind, quote, body: quote, quantity, unit });
      continue;
    }
    kept.push({ kind, quote, body: quote, quantity: null, unit: null });
  }
  return kept;
}

export function voiceDraftsFromTranscript(transcript: string): VoiceDraftCard[] {
  const source = transcript.trim();
  if (!source) return [];
  const sentences = source.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  const cards: VoiceDraftCard[] = [];
  for (const sentence of sentences) {
    const quantity = sentence.match(/(\d{1,7})\s*(bags|square feet|sq ft|board feet|linear feet)/i);
    if (quantity) {
      const amount = Number(quantity[1]);
      const raw = quantity[2]!.toLowerCase();
      const unit: FieldQuantityUnit =
        raw === "bags" ? "bags" : raw.includes("board") ? "board_feet" : raw.includes("linear") ? "linear_ft" : "sq_ft";
      cards.push({ kind: "quantity", quote: sentence, body: sentence, quantity: amount, unit });
      continue;
    }
    if (/\b(blocked|blocker|hold|waiting|can't|cannot|down)\b/i.test(sentence)) {
      cards.push({ kind: "blocker", quote: sentence, body: sentence, quantity: null, unit: null });
      continue;
    }
    if (/\b(need|material|out of|short on)\b/i.test(sentence)) {
      cards.push({ kind: "material_request", quote: sentence, body: sentence, quantity: null, unit: null });
    }
  }
  if (cards.length === 0) {
    cards.push({ kind: "daily_report", quote: source, body: source, quantity: null, unit: null });
  } else if (!cards.some((card) => card.kind === "daily_report")) {
    cards.push({ kind: "daily_report", quote: source, body: source, quantity: null, unit: null });
  }
  return cards;
}

export async function extractVoiceDraftCards(args: {
  transcript: string;
  ai?: WorkersAi;
  env?: Record<string, string | undefined>;
  organizationId: string;
  dataset?: AiUsageDataset;
}): Promise<VoiceDraftCard[]> {
  const transcript = args.transcript.trim();
  if (!transcript) return [];
  const env = args.env ?? process.env;
  if (demoAiFixturesEnabled(env)) {
    const payload =
      transcript === GOLDEN_VOICE_TRANSCRIPT ? voiceExtractionFixture(transcript) : { cards: [] };
    const grounded = voiceDraftsFromModel(transcript, payload);
    return grounded.length > 0 ? grounded : voiceDraftsFromTranscript(transcript);
  }
  const route = modelForTask("classify", env);
  const configured = Boolean(args.ai) || Boolean(env.AI_GATEWAY_API_KEY?.trim());
  if (!configured) return voiceDraftsFromTranscript(transcript);
  try {
    const content = await completeThroughGateway({
      ai: args.ai,
      env,
      model: route.model,
      json: true,
      messages: [
        {
          role: "system",
          content:
            "Split a field voice transcript into JSON {\"cards\":[{\"kind\":\"daily_report|quantity|blocker|material_request\",\"quote\":\"exact substring\",\"quantity\":null,\"unit\":null}]}. Quotes must be copied from the transcript. Do not invent quantities.",
        },
        { role: "user", content: transcript },
      ],
      policy: {
        fallbackModel: route.fallbackModel,
        timeoutMs: route.timeoutMs,
        maxAttempts: route.maxAttempts,
        retryDelayMs: route.retryDelayMs,
        backoff: route.backoff,
        cache: { skip: true },
        metadata: { purpose: "voice_draft", organizationId: args.organizationId },
      },
      usage: {
        dataset: args.dataset,
        organizationId: args.organizationId,
        purpose: "voice_draft",
      },
    });
    const parsed = JSON.parse(content) as unknown;
    const grounded = voiceDraftsFromModel(transcript, parsed);
    return grounded.length > 0 ? grounded : voiceDraftsFromTranscript(transcript);
  } catch {
    return voiceDraftsFromTranscript(transcript);
  }
}

export async function storeTranscriptDrafts(input: {
  transcript: string;
  jobId: string;
  actor: string;
  voiceNoteId: string;
}): Promise<void> {
  const job = await getJob(input.jobId);
  if (!job) return;
  const platform = await getPlatform();
  const cards = await extractVoiceDraftCards({
    transcript: input.transcript,
    ai: platform?.AI,
    organizationId: job.organizationId,
    dataset: platform?.AI_USAGE,
    env: {
      ...process.env,
      AI_GATEWAY_ID: platform?.AI_GATEWAY_ID ?? process.env.AI_GATEWAY_ID,
      AI_GATEWAY_API_KEY:
        (platform as { AI_GATEWAY_API_KEY?: string } | null)?.AI_GATEWAY_API_KEY ??
        process.env.AI_GATEWAY_API_KEY,
    },
  });
  for (const card of cards) {
    await saveFieldDraft({
      organizationId: job.organizationId,
      jobId: input.jobId,
      userId: input.actor,
      kind: card.kind,
      body: card.body,
      quote: card.quote,
      quantity: card.quantity,
      unit: card.unit,
      workAreaId: null,
      taskId: null,
      documentId: null,
      voiceNoteId: input.voiceNoteId,
      effect: null,
      source: "voice",
    });
  }
}
