import { describe, expect, it } from "vitest";
import {
  demoVoiceTranscript,
  inferVoiceContentType,
  parseVoiceExtractInput,
  parseVoiceNoteInput,
  parseVoiceTranscriptEdit,
  voiceConsentCopy,
  voiceRetentionDays,
} from "@/lib/ops/voice-notes";

describe("voice notes", () => {
  it("requires consent and a supported audio file", () => {
    expect(
      parseVoiceNoteInput({
        filename: "site.webm",
        contentType: "audio/webm",
        sizeBytes: 2048,
      }),
    ).toMatchObject({ ok: false, field: "consent" });
    expect(
      parseVoiceNoteInput({
        filename: "site.webm",
        contentType: "audio/webm",
        sizeBytes: 2048,
        consent: true,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        source: "job",
        contentType: "audio/webm",
        language: "en",
      },
    });
    expect(
      parseVoiceNoteInput({
        filename: "site.png",
        contentType: "image/png",
        sizeBytes: 2048,
        consent: true,
      }),
    ).toMatchObject({ ok: false, field: "file" });
  });

  it("requires the matching record for task, mark, and document sources", () => {
    expect(
      parseVoiceNoteInput({
        source: "task",
        contentType: "audio/webm",
        sizeBytes: 100,
        consent: true,
      }),
    ).toMatchObject({ ok: false, field: "taskId" });
    expect(
      parseVoiceNoteInput({
        source: "annotation",
        annotationId: "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbb1",
        contentType: "audio/webm",
        sizeBytes: 100,
        consent: true,
      }).ok,
    ).toBe(true);
  });

  it("keeps edited transcripts separate from extract payloads", () => {
    expect(parseVoiceTranscriptEdit({ transcript: "   " })).toMatchObject({
      ok: false,
      field: "transcript",
    });
    expect(
      parseVoiceTranscriptEdit({ transcript: " Hold south elevation. " }),
    ).toEqual({
      ok: true,
      value: { transcript: "Hold south elevation." },
    });
    expect(
      parseVoiceExtractInput({
        kind: "deficiency",
        selectedText: "Hold south elevation for inspection.",
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "deficiency",
        selectedText: "Hold south elevation for inspection.",
      },
    });
    expect(parseVoiceExtractInput({ kind: "note", selectedText: "Hi" })).toMatchObject(
      { ok: false, field: "kind" },
    );
  });

  it("builds a demo transcript and consent copy from policy", () => {
    const demo = demoVoiceTranscript({
      jobName: "Acme podium insulation",
      source: "task",
      taskTitle: "Install closed-cell at podium deck",
    });
    expect(demo.provider).toBe("demo");
    expect(demo.transcript).toContain("Install closed-cell at podium deck");
    expect(voiceRetentionDays({ VOICE_RETENTION_DAYS: "90" })).toBe(90);
    expect(voiceConsentCopy()).toContain("365 days");
    expect(
      inferVoiceContentType({ name: "site.m4a", type: "" }),
    ).toBe("audio/mp4");
  });
});
