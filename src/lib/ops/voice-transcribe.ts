export type VoiceTranscriptionResult = {
  transcript: string;
  provider: string;
  model: string;
  confidence: number | null;
};

const DEEPGRAM_MODEL = "nova-3";

type DeepgramPrerecordedResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }>;
  };
};

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

export async function transcribeVoiceAudio(args: {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  language: string;
}): Promise<VoiceTranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    return {
      transcript: "",
      provider: "none",
      model: "manual",
      confidence: null,
    };
  }

  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: deepgramLanguage(args.language),
    smart_format: "true",
    punctuate: "true",
  });
  const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": audioContentType(args.bytes, args.contentType),
    },
    body: Buffer.from(args.bytes),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Deepgram listen failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as DeepgramPrerecordedResponse;
  const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
  return {
    transcript: alternative?.transcript?.trim() ?? "",
    provider: "deepgram",
    model: DEEPGRAM_MODEL,
    confidence: readConfidence(alternative?.confidence),
  };
}
