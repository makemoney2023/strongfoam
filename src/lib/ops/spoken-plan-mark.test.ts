import { describe, expect, it } from "vitest";
import { proposeSpokenPlanMark } from "@/lib/ops/spoken-plan-mark";

describe("spoken plan mark", () => {
  it("proposes one pin from the transcript and the matching open task", () => {
    const proposal = proposeSpokenPlanMark({
      voiceNoteId: "voice-1",
      filename: "podium.wav",
      transcript:
        "Install closed-cell at podium deck is in progress. Hold the south elevation.",
      documentId: "doc-1",
      tasks: [
        { id: "prepare", title: "Prepare podium deck", status: "open" },
        {
          id: "install",
          title: "Install closed-cell at podium deck",
          status: "open",
        },
        { id: "done", title: "Install closed-cell at podium deck", status: "done" },
      ],
    });
    expect(proposal?.kind).toBe("pin");
    expect(proposal?.status).toBe("blocked");
    expect(proposal?.taskId).toBe("install");
    expect(proposal?.x).toBe(0.5);
    expect(proposal?.effect).toContain("podium.wav");
    expect(proposal?.effect).toContain("Install closed-cell at podium deck");
  });

  it("returns nothing for an empty transcript", () => {
    expect(
      proposeSpokenPlanMark({
        voiceNoteId: "voice-1",
        filename: "empty.wav",
        transcript: "   ",
        documentId: "doc-1",
        tasks: [],
      }),
    ).toBeNull();
  });
});
