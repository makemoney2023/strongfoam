import { after } from "next/server";
import { revalidatePath } from "next/cache";

export type VoiceTranscriptionResult = {
  transcript: string;
  provider: string;
  model: string;
  confidence: number | null;
};

export async function transcribeVoiceAudio(args: {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  language: string;
}): Promise<VoiceTranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      transcript: "",
      provider: "none",
      model: "manual",
      confidence: null,
    };
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(args.bytes)], { type: args.contentType }),
    args.filename,
  );
  form.append("model", "whisper-1");
  if (args.language) form.append("language", args.language);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail.slice(0, 240) || `Transcription provider returned ${response.status}.`,
    );
  }
  const payload = (await response.json()) as { text?: string };
  return {
    transcript: payload.text?.trim() ?? "",
    provider: "openai",
    model: "whisper-1",
    confidence: null,
  };
}

export function scheduleVoiceTranscription(args: {
  jobId: string;
  voiceNoteId: string;
}): void {
  after(async () => {
    const { processJobVoiceTranscription } = await import("@/lib/ops/store");
    try {
      await processJobVoiceTranscription(args.voiceNoteId);
    } catch (error) {
      console.error("Voice transcription failed.", error);
    }
    revalidatePath(`/app/jobs/${args.jobId}`);
    revalidatePath(`/app/field/jobs/${args.jobId}`);
    revalidatePath(`/field/jobs/${args.jobId}`);
    revalidatePath(`/field/jobs/${args.jobId}/plan`);
    revalidatePath(`/app/jobs/${args.jobId}/plan`);
  });
}
