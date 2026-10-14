import { describe, expect, it } from "vitest";
import { captionPhoto, photoDraftsFromModel, VISION_FALLBACK_MODEL, VISION_MODEL } from "@/lib/ops/photo-caption";

const context = {
  jobName: "Maple",
  scope: "Closed cell walls",
  areaNames: ["North wall"],
  areaIds: ["area-1"],
  taskTitle: "Spray north wall",
};

describe("photo captions", () => {
  it("keeps a visible caption and drops a certified thickness claim", () => {
    const drafts = photoDraftsFromModel(
      {
        caption: "Foam covers the studs. Certified thickness of 3 inches.",
        areaId: "area-1",
        lot: "LOT-44",
        gauge: "Counter reads 40",
        coverage: "A bay on the left looks thin",
        safety: "Respirator is on",
      },
      context,
    );
    expect(drafts.find((draft) => draft.kind === "caption")).toBeUndefined();
    expect(drafts.find((draft) => draft.kind === "area_tag")?.workAreaId).toBe("area-1");
    expect(drafts.find((draft) => draft.kind === "lot_reading")?.body).toBe("LOT-44");
    expect(drafts.find((draft) => draft.kind === "gauge_reading")?.body).toBe("Counter reads 40");
  });

  it("ignores an area that is not on the job", () => {
    const drafts = photoDraftsFromModel({ caption: "Open studs.", areaId: "other" }, context);
    expect(drafts.map((draft) => draft.kind)).toEqual(["caption"]);
  });

  it("uses the vision fallback only after the first call fails", async () => {
    const calls: string[] = [];
    const points: Array<{ model: string; attempts: number; cache: string }> = [];
    const drafts = await captionPhoto({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
      context,
      fallbackModel: VISION_FALLBACK_MODEL,
      usage: {
        organizationId: "org",
        dataset: {
          writeDataPoint(point) {
            points.push({
              model: point.blobs[1] ?? "",
              attempts: point.doubles[1] ?? 0,
              cache: point.blobs[3] ?? "",
            });
          },
        },
      },
      ai: {
        async run(model) {
          calls.push(model);
          if (model === VISION_MODEL) throw new Error("vision down");
          return { response: JSON.stringify({ caption: "Open studs." }) };
        },
      },
    });
    expect(calls).toEqual([VISION_MODEL, VISION_FALLBACK_MODEL]);
    expect(drafts.map((draft) => draft.body)).toEqual(["Open studs."]);
    expect(points).toEqual([
      { model: VISION_FALLBACK_MODEL, attempts: 2, cache: "skip" },
    ]);
  });
});
