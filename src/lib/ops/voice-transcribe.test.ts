import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deepgramLanguage,
  transcribeVoiceAudio,
} from "@/lib/ops/voice-transcribe";

const wav = new Uint8Array(16);
wav.set([0x52, 0x49, 0x46, 0x46], 0);
wav.set([0x57, 0x41, 0x56, 0x45], 8);

describe("voice transcription", () => {
  const previous = process.env.DEEPGRAM_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previous === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = previous;
  });

  it("completes without a provider so the user can type from audio", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const result = await transcribeVoiceAudio({
      bytes: new Uint8Array([1, 2, 3]),
      filename: "note.webm",
      contentType: "audio/webm",
      language: "en",
    });
    expect(result).toEqual({
      transcript: "",
      provider: "none",
      model: "manual",
      confidence: null,
    });
  });

  it("sends prerecorded audio to Deepgram nova-3 and keeps confidence", async () => {
    process.env.DEEPGRAM_API_KEY = "dg-test";
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        expect(url).toContain("https://api.deepgram.com/v1/listen?");
        expect(url).toContain("model=nova-3");
        expect(url).toContain("language=en-US");
        expect(url).toContain("smart_format=true");
        expect(url).toContain("punctuate=true");
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          Authorization: "Token dg-test",
          "Content-Type": "audio/wav",
        });
        return new Response(
          JSON.stringify({
            results: {
              channels: [
                {
                  alternatives: [
                    {
                      transcript: " Hold the south elevation. ",
                      confidence: 0.91,
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeVoiceAudio({
      bytes: wav,
      filename: "note.wav",
      contentType: "audio/webm",
      language: "en",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      transcript: "Hold the south elevation.",
      provider: "deepgram",
      model: "nova-3",
      confidence: 0.91,
    });
  });

  it("reports a failed Deepgram listen and still labels webm audio", async () => {
    process.env.DEEPGRAM_API_KEY = "dg-test";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("language=fr");
      expect(init?.headers).toMatchObject({ "Content-Type": "audio/webm" });
      return new Response("bad audio", { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      transcribeVoiceAudio({
        bytes: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1]),
        filename: "note.webm",
        contentType: "application/octet-stream",
        language: "fr",
      }),
    ).rejects.toThrow("Deepgram listen failed (400): bad audio");
  });

  it("maps English to the Showdesk locale and keeps other language codes", () => {
    expect(deepgramLanguage("en")).toBe("en-US");
    expect(deepgramLanguage(" fr-CA ")).toBe("fr-CA");
  });
});
