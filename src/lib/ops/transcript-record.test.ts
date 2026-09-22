import { describe, expect, it } from "vitest";
import {
  listTranscriptRecords,
  proposeTranscriptRecord,
} from "@/lib/ops/transcript-record";

const demoTranscript =
  "Voice note on Acme podium insulation. Install closed-cell at podium deck is in progress. Hold the south elevation for inspection and request more closed-cell if the next lift starts today.";

describe("transcript record proposals", () => {
  it("proposes the hold sentence as a blocker", () => {
    const proposal = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "podium-deck.wav",
      transcript: demoTranscript,
      tasks: [
        { title: "Install closed-cell at podium deck", status: "open" },
      ],
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
    });
    expect(proposal?.kind).toBe("deficiency");
    expect(proposal?.selectedText).toBe("Damage on the north wall.");
  });

  it("proposes a material request when that is the only signal", () => {
    const proposal = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "yard.wav",
      transcript: "Request more closed-cell before the afternoon lift.",
    });
    expect(proposal?.kind).toBe("material_request");
  });

  it("does not propose a progress note or an extracted transcript", () => {
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "yard.wav",
        transcript: "The crew arrived on time.",
      }),
    ).toBeNull();
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "podium-deck.wav",
        transcript: demoTranscript,
        legacyExtracted: true,
      }),
    ).toBeNull();
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "podium-deck.wav",
        transcript: "Install closed-cell at podium deck is in progress.",
      }),
    ).toBeNull();
  });

  it("lists a later sentence while the first sentence is still open", () => {
    const records = listTranscriptRecords({
      voiceNoteId: "note-1",
      filename: "walk.wav",
      transcript:
        "Hold the south wall. Request more closed-cell for the afternoon lift.",
    });
    expect(records.map((record) => record.kind)).toEqual([
      "blocker",
      "material_request",
    ]);
    expect(proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "walk.wav",
      transcript:
        "Hold the south wall. Request more closed-cell for the afternoon lift.",
    })?.kind).toBe("blocker");
  });

  it("proposes the next sentence after one sentence was saved", () => {
    const transcript =
      "Hold the south wall. Request more closed-cell for the afternoon lift.";
    const first = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "walk.wav",
      transcript,
    });
    expect(first?.kind).toBe("blocker");
    const second = proposeTranscriptRecord({
      voiceNoteId: "note-1",
      filename: "walk.wav",
      transcript,
      savedTexts: first ? [first.selectedText] : [],
    });
    expect(second?.kind).toBe("material_request");
    expect(second?.selectedText).toContain("Request more closed-cell");
  });

  it("proposes a task only when that work is not already open", () => {
    const transcript = "Tape the east windows before spray.";
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "walk.wav",
        transcript,
      })?.kind,
    ).toBe("task");
    expect(
      proposeTranscriptRecord({
        voiceNoteId: "note-1",
        filename: "walk.wav",
        transcript,
        tasks: [{ title: "Tape the east windows", status: "open" }],
      }),
    ).toBeNull();
  });
});
