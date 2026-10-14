import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID, DEMO_ORGANIZATION_ID, DEMO_WORK_AREA_ID } from "@/lib/ops/demo-data";
import { deleteDemoJobDocument } from "@/lib/ops/demo-store";
import { listFieldDrafts, resetFieldDraftMemory } from "@/lib/ops/field-draft-store";
import { runFieldPhotoCaption } from "@/lib/ops/photo-caption-run";
import { listJobDocuments, setJobDocumentCaption, addJobDocument } from "@/lib/ops/store";

describe("photo caption run", () => {
  let addedDocumentId: string | null = null;

  beforeEach(() => resetFieldDraftMemory());

  afterEach(() => {
    resetFieldDraftMemory();
    if (!addedDocumentId) return;
    deleteDemoJobDocument({
      jobId: DEMO_JOB_ID,
      documentId: addedDocumentId,
      actor: "field@strongfoam.demo",
    });
    addedDocumentId = null;
  });

  it("stores grounded photo drafts and skips a missing model", async () => {
    const stored = await runFieldPhotoCaption({
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      documentId: "photo-1",
      userId: "nobody",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
      ai: {
        run: async () => ({
          response: JSON.stringify({
            caption: "Certified thickness of 3 inches.",
            areaId: DEMO_WORK_AREA_ID,
            lot: "LOT-9",
            gauge: "Counter reads 12",
            safety: "Respirator is on",
          }),
        }),
      },
    });
    expect(stored).toBe(4);
    const drafts = await listFieldDrafts(DEMO_ORGANIZATION_ID, DEMO_JOB_ID);
    expect(drafts.some((draft) => draft.kind === "caption")).toBe(false);
    expect(drafts.find((draft) => draft.kind === "area_tag")?.workAreaId).toBe(DEMO_WORK_AREA_ID);
    expect(drafts.find((draft) => draft.kind === "lot_reading")?.body).toBe("LOT-9");

    const skipped = await runFieldPhotoCaption({
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      documentId: "photo-2",
      userId: "nobody",
      bytes: new Uint8Array([4]),
      contentType: "image/jpeg",
    });
    expect(skipped).toBe(0);
  });

  it("writes a confirmed caption onto the photo", async () => {
    const document = await addJobDocument({
      jobId: DEMO_JOB_ID,
      actor: "field@strongfoam.demo",
      input: {
        filename: "bay.jpg",
        contentType: "image/jpeg",
        sizeBytes: 4,
        kind: "photo",
        workAreaId: null,
      },
      bytes: new Uint8Array([1, 2, 3, 4]),
    });
    expect(document?.id).toBeTruthy();
    addedDocumentId = document!.id;
    const saved = await setJobDocumentCaption({
      jobId: DEMO_JOB_ID,
      documentId: document!.id,
      caption: "Studs are covered.",
    });
    expect(saved).toBe(true);
    const listed = await listJobDocuments(DEMO_JOB_ID);
    expect(listed.find((item) => item.id === document!.id)?.caption).toBe("Studs are covered.");
  });
});
