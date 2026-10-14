import { describe, expect, it } from "vitest";
import { voiceDraftsFromModel, voiceDraftsFromTranscript } from "@/lib/ops/voice-drafts";

const transcript =
  "Sprayed 40 bags on the north wall. The lift is down. Need more closed-cell.";

describe("voice draft extraction", () => {
  it("keeps only quotes that appear in the transcript", () => {
    const cards = voiceDraftsFromModel(transcript, {
      cards: [
        { kind: "quantity", quote: "Sprayed 40 bags on the north wall.", quantity: 40, unit: "bags" },
        { kind: "blocker", quote: "The lift is down.", quantity: null, unit: null },
        { kind: "material_request", quote: "Need more closed-cell.", quantity: null, unit: null },
        { kind: "quantity", quote: "Sprayed 80 bags.", quantity: 80, unit: "bags" },
        { kind: "blocker", quote: "The crane failed.", quantity: null, unit: null },
      ],
    });
    expect(cards.map((card) => card.kind)).toEqual(["quantity", "blocker", "material_request"]);
    expect(cards[0]?.quantity).toBe(40);
  });

  it("reads quantities, blockers, and material from the words themselves", () => {
    const cards = voiceDraftsFromTranscript(transcript);
    expect(cards.map((card) => card.kind)).toEqual([
      "quantity",
      "blocker",
      "material_request",
      "daily_report",
    ]);
  });
});
