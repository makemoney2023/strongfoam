import { describe, expect, it } from "vitest";
import { transcribeVoiceAudio } from "@/lib/ops/voice-transcribe";

describe("voice transcription", () => {
  it("completes without a provider so the user can type from audio", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await transcribeVoiceAudio({
      bytes: new Uint8Array([1, 2, 3]),
      filename: "note.webm",
      contentType: "audio/webm",
      language: "en",
    });
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
    expect(result).toEqual({
      transcript: "",
      provider: "none",
      model: "manual",
      confidence: null,
    });
  });
});
