import { describe, expect, it } from "vitest";
import { jobPhotoReportPdf, photoReportLines } from "@/lib/ops/job-photo-report";

describe("job photo report", () => {
  it("builds a pdf that names the job", async () => {
    const bytes = await jobPhotoReportPdf({
      jobName: "Maple",
      from: "2026-10-01",
      to: "2026-10-13",
      lines: [{ takenOn: "2026-10-13", area: "North wall", caption: "Studs are covered." }],
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("keeps confirmed captions in the date range and area", () => {
    const lines = photoReportLines({
      from: "2026-10-01",
      to: "2026-10-13",
      areaId: "area-1",
      documents: [
        {
          id: "photo-1",
          createdAt: new Date("2026-10-13T15:00:00.000Z"),
          workAreaId: null,
          kind: "photo",
        },
        {
          id: "photo-2",
          createdAt: new Date("2026-09-01T15:00:00.000Z"),
          workAreaId: "area-1",
          kind: "photo",
        },
      ],
      areas: [{ id: "area-1", name: "North wall" }],
      drafts: [
        {
          status: "confirmed",
          kind: "caption",
          body: "Studs are covered.",
          documentId: "photo-1",
          workAreaId: null,
        },
        {
          status: "confirmed",
          kind: "area_tag",
          body: "North wall",
          documentId: "photo-1",
          workAreaId: "area-1",
        },
        {
          status: "proposed",
          kind: "caption",
          body: "Still a draft.",
          documentId: "photo-2",
          workAreaId: null,
        },
      ],
    });
    expect(lines).toEqual([
      { takenOn: "2026-10-13", area: "North wall", caption: "Studs are covered." },
    ]);
  });
});
