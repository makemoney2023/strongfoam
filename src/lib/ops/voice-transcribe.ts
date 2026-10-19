import { recordAiUsage, type AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import { demoAiFixturesEnabled, GOLDEN_VOICE_TRANSCRIPT } from "@/lib/ops/demo-ai-fixtures";
import { AI_GATEWAY_ID, CLOUDFLARE_ACCOUNT_ID } from "@/lib/cloudflare/gateway";

export type VoiceTranscriptionResult = {
  transcript: string;
  provider: string;
  model: string;
  confidence: number | null;
};

const DEEPGRAM_MODEL = "nova-3";
export const WHISPER_MODEL = "@cf/openai/whisper";

type DeepgramPrerecordedResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }>;
  };
};

export type VoiceAi = {
  run: (
    model: string,
    input: { audio: string },
    options: { gateway: { id: string } },
  ) => Promise<unknown>;
};

type VoiceEnv = Record<string, string | undefined>;

/** Detect WAV / WebM / MP4 the same way Showdesk labels batch audio. */
function sniffAudioContentType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return "audio/wav";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "audio/webm";
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "audio/mp4";
  }
  return null;
}

function audioContentType(bytes: Uint8Array, declared: string): string {
  const sniffed = sniffAudioContentType(bytes);
  if (sniffed) return sniffed;
  const declaredType = declared.split(";")[0]?.trim().toLowerCase() ?? "";
  if (declaredType.startsWith("audio/")) return declaredType;
  return "audio/webm";
}

/** Showdesk sends English jobsite speech as en-US on Nova-3. */
export function deepgramLanguage(language: string): string {
  const value = language.trim();
  if (!value || value.toLowerCase() === "en" || value.toLowerCase() === "en-us") {
    return "en-US";
  }
  return value;
}

function readConfidence(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function deepgramGatewayUrl(env: VoiceEnv): string {
  const account = env.AI_GATEWAY_ACCOUNT_ID?.trim() || CLOUDFLARE_ACCOUNT_ID;
  const gateway = env.AI_GATEWAY_ID?.trim() || AI_GATEWAY_ID;
  return `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/deepgram/listen`;
}

function manualTranscript(): VoiceTranscriptionResult {
  return { transcript: "", provider: "none", model: "manual", confidence: null };
}

function readWhisperText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { text?: unknown; result?: { text?: unknown } };
  if (typeof record.text === "string") return record.text.trim();
  if (typeof record.result?.text === "string") return record.result.text.trim();
  return "";
}

async function transcribeWithWhisper(args: {
  bytes: Uint8Array;
  ai: VoiceAi;
  env: VoiceEnv;
}): Promise<VoiceTranscriptionResult> {
  const result = await args.ai.run(
    WHISPER_MODEL,
    { audio: Buffer.from(args.bytes).toString("base64") },
    { gateway: { id: args.env.AI_GATEWAY_ID?.trim() || AI_GATEWAY_ID } },
  );
  return {
    transcript: readWhisperText(result),
    provider: "workers-ai",
    model: WHISPER_MODEL,
    confidence: null,
  };
}

export async function transcribeVoiceAudio(args: {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  language: string;
  ai?: VoiceAi;
  env?: VoiceEnv;
  dataset?: AiUsageDataset;
  organizationId?: string;
  fetchImpl?: typeof fetch;
}): Promise<VoiceTranscriptionResult> {
  const env = args.env ?? process.env;
  if (demoAiFixturesEnabled(env)) {
    return {
      transcript: GOLDEN_VOICE_TRANSCRIPT,
      provider: "demo-fixture",
      model: "golden-path-fixture",
      confidence: null,
    };
  }
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  const deepgramKey = env.DEEPGRAM_API_KEY?.trim();
  const started = Date.now();
  const log = (model: string, status: "ok" | "error", outputChars: number, attempts: number) => {
    if (!args.organizationId) return;
    recordAiUsage(args.dataset, {
      organizationId: args.organizationId,
      purpose: "voice_transcribe",
      model,
      status,
      cache: "skip",
      latencyMs: Date.now() - started,
      attempts,
      inputChars: args.bytes.byteLength,
      outputChars,
    });
  };

  if (!gatewayKey || !deepgramKey) {
    if (!args.ai) return manualTranscript();
    try {
      const result = await transcribeWithWhisper({ bytes: args.bytes, ai: args.ai, env });
      log(WHISPER_MODEL, "ok", result.transcript.length, 1);
      return result;
    } catch (error) {
      log(WHISPER_MODEL, "error", 0, 1);
      throw error;
    }
  }

  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: deepgramLanguage(args.language),
    smart_format: "true",
    punctuate: "true",
  });
  const response = await (args.fetchImpl ?? fetch)(`${deepgramGatewayUrl(env)}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramKey}`,
      "cf-aig-authorization": `Bearer ${gatewayKey}`,
      "cf-aig-skip-cache": "true",
      "Content-Type": audioContentType(args.bytes, args.contentType),
    },
    body: Buffer.from(args.bytes),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    log(DEEPGRAM_MODEL, "error", 0, 1);
    if (!args.ai) {
      throw new Error(`Deepgram listen failed (${response.status}): ${detail.slice(0, 200)}`);
    }
    try {
      const result = await transcribeWithWhisper({ bytes: args.bytes, ai: args.ai, env });
      log(WHISPER_MODEL, "ok", result.transcript.length, 2);
      return result;
    } catch (error) {
      log(WHISPER_MODEL, "error", 0, 2);
      throw error instanceof Error
        ? error
        : new Error(`Deepgram listen failed (${response.status}): ${detail.slice(0, 200)}`);
    }
  }

  const payload = (await response.json()) as DeepgramPrerecordedResponse;
  const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alternative?.transcript?.trim() ?? "";
  log(DEEPGRAM_MODEL, "ok", transcript.length, 1);
  return {
    transcript,
    provider: "deepgram",
    model: DEEPGRAM_MODEL,
    confidence: readConfidence(alternative?.confidence),
  };
}
