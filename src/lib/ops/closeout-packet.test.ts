import { describe, expect, it } from "vitest";
import { draftCloseoutPacket } from "@/lib/ops/closeout-packet";

describe("closeout packet", () => {
  it("refuses a draft until the assembly exists", () => {
    expect(
      draftCloseoutPacket({
        jobName: "North elevation",
        assembly: null,
        photoCount: 2,
        quantityLines: [],
        planRows: [],
      }),
    ).toMatchObject({ ok: false });
  });

  it("cites the assembly, photos, quantities, and plan marks without sending", () => {
    const result = draftCloseoutPacket({
      jobName: "North elevation",
      assembly: {
        location: "wall",
        targetRValue: "R-20",
        existingRValue: "R-12",
        areaSqFt: 400,
        bagCount: 18,
        product: "Closed cell",
        manufacturer: "Huntsman",
        rebateProgram: "Enbridge",
        airBarrier: "Continuous",
        vaporBarrier: "",
        blowerDoor: "3.2 ACH50",
      },
      photoCount: 2,
      quantityLines: ["18 bags"],
      planRows: ["Thickness pin"],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.draft.narrative).toContain("North elevation closeout packet");
    expect(result.draft.narrative).toContain("Wall assembly");
    expect(result.draft.narrative).toContain("is not sent");
    expect(result.draft.citations).toEqual([
      "assembly:wall",
      "photos:2",
      "quantity:1",
      "plan:1",
    ]);
  });
});
