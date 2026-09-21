import { describe, expect, it } from "vitest";
import { proposeTranscriptRecord } from "@/lib/ops/transcript-record";

const demoTranscript =
  "Voice note on Acme podium insulation. Install closed-cell at podium deck is in progress. Hold the south elevation for inspection and request more closed-cell if the next lift starts today.";

describe("transcript record proposals", () => {
  it("proposes the hold sentence as a blocker", () => {
    const proposal = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "podium-deck.wav",
      transcript: demoTranscript,
      alreadyExtracted: false,
    });
    expect(proposal?.kind).toBe("blocker");
    expect(proposal?.selectedText).toContain("Hold the south elevation");
    expect(proposal?.effect).toContain("The job is marked blocked.");
  });

  it("prefers a deficiency over a later blocker", () => {
    const proposal = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "walk.wav",
      transcript: "Damage on the north wall. Hold the lift.",
      alreadyExtracted: false,
    });
    expect(proposal?.kind).toBe("deficiency");
    expect(proposal?.selectedText).toBe("Damage on the north wall.");
  });

  it("proposes a material request when that is the only signal", () => {
    const proposal = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "yard.wav",
      transcript: "Request more closed-cell before the afternoon lift.",
      alreadyExtracted: false,
    });
    expect(proposal?.kind).toBe("material_request");
  });

  it("does not propose a progress note or an extracted transcript", () => {
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "yard.wav",
        transcript: "The crew arrived on time.",
        alreadyExtracted: false,
      }),
    ).toBeNull();
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "podium-deck.wav",
        transcript: demoTranscript,
        alreadyExtracted: true,
      }),
    ).toBeNull();
  });
});
