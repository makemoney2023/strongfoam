import { describe, expect, it } from "vitest";
import { selectExportMarks, buildPlanCloseout } from "@/lib/ops/plan-export";
import { hitTestMark, visualCircleRadii } from "@/lib/ops/plan-geometry";
import {
  annotationMatchesFilter,
  canMarkupPlanDocument,
  isCurrentPlanDocument,
  parsePlanAnnotationInput,
  parsePlanAnnotationStatusInput,
  planSheetKey,
} from "@/lib/ops/plan-markup";

describe("plan markup", () => {
  it("normalizes a pin on the current plan revision", () => {
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: "0.42",
        y: 0.31,
        title: "  Install closed-cell  ",
        taskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).toEqual({
      ok: true,
      value: {
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        pageNumber: 1,
        x: 0.42,
        y: 0.31,
        kind: "pin",
        geometry: { type: "pin" },
        status: "planned",
        trade: null,
        title: "Install closed-cell",
        body: null,
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        taskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      },
    });
  });

  it("accepts circle, polygon, arrow, and text geometry", () => {
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: 0.4,
        y: 0.4,
        kind: "circle",
        geometry: { type: "circle", rx: 0.1, ry: 0.08 },
        trade: "spray_foam",
        title: "Riser chase",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        kind: "circle",
        geometry: { type: "circle", rx: 0.1, ry: 0.08 },
        trade: "spray_foam",
      },
    });
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: 0.2,
        y: 0.2,
        kind: "polygon",
        geometry: {
          type: "polygon",
          points: [
            { x: 0.2, y: 0.2 },
            { x: 0.3, y: 0.2 },
            { x: 0.25, y: 0.3 },
          ],
        },
        title: "Unit 204",
      }).ok,
    ).toBe(true);
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: 0.1,
        y: 0.1,
        kind: "arrow",
        geometry: { type: "arrow", x2: 0.4, y2: 0.15 },
        title: "Access path",
      }).ok,
    ).toBe(true);
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: 0.5,
        y: 0.5,
        kind: "text",
        title: "Hold for inspection",
      }),
    ).toMatchObject({
      ok: true,
      value: { kind: "text", geometry: { type: "text" } },
    });
  });

  it("rejects coordinates outside the sheet", () => {
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: "1.2",
        y: "0.2",
        title: "Off sheet",
      }),
    ).toMatchObject({ ok: false, field: "x" });
  });

  it("rejects a two-point polygon", () => {
    expect(
      parsePlanAnnotationInput({
        documentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        x: 0.2,
        y: 0.2,
        kind: "polygon",
        geometry: {
          type: "polygon",
          points: [
            { x: 0.2, y: 0.2 },
            { x: 0.3, y: 0.2 },
          ],
        },
        title: "Incomplete room",
      }),
    ).toMatchObject({ ok: false, field: "geometry" });
  });

  it("accepts a field completion status with an optional note", () => {
    expect(
      parsePlanAnnotationStatusInput({
        status: "completed",
        body: "Cavity filled.",
      }),
    ).toEqual({
      ok: true,
      value: { status: "completed", body: "Cavity filled." },
    });
  });

  it("keeps marks on the revision they were drawn on and allows PDF sheets", () => {
    expect(
      planSheetKey({
        id: "old-id",
        sheetKey: "sheet-a",
      }),
    ).toBe("sheet-a");
    expect(isCurrentPlanDocument({ kind: "plan", supersededAt: null })).toBe(
      true,
    );
    expect(
      isCurrentPlanDocument({
        kind: "plan",
        supersededAt: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toBe(false);
    expect(canMarkupPlanDocument({ contentType: "image/png" })).toBe(true);
    expect(canMarkupPlanDocument({ contentType: "application/pdf" })).toBe(
      true,
    );
    expect(canMarkupPlanDocument({ contentType: "text/plain" })).toBe(false);
  });

  it("filters marks by status, trade, author, crew, and date", () => {
    const mark = {
      status: "blocked" as const,
      trade: "fireproofing",
      createdBy: "admin@strongfoam.demo",
      createdAt: new Date("2026-09-18T12:00:00.000Z"),
      crewUserId: "12121212-1212-4121-8121-121212121212",
      pageNumber: 1,
    };
    expect(
      annotationMatchesFilter(mark, {
        statuses: ["blocked"],
        trades: ["fireproofing"],
        authors: ["admin@strongfoam.demo"],
        crewUserIds: ["12121212-1212-4121-8121-121212121212"],
        from: "2026-09-18",
        to: "2026-09-18",
        pageNumber: 1,
      }),
    ).toBe(true);
    expect(annotationMatchesFilter(mark, { statuses: ["completed"] })).toBe(
      false,
    );
    expect(annotationMatchesFilter(mark, { trades: ["unspecified"] })).toBe(
      false,
    );
    expect(
      annotationMatchesFilter(mark, {
        crewUserIds: ["10101010-1010-4010-8010-101010101010"],
      }),
    ).toBe(false);
    expect(annotationMatchesFilter(mark, { from: "2026-09-19" })).toBe(false);
  });

  it("builds a closeout of the visible marks", () => {
    const marks = selectExportMarks(
      [
        {
          id: "1",
          title: "North wall",
          body: "Hold for inspection",
          status: "blocked",
          kind: "circle",
          geometry: { type: "circle", rx: 0.1, ry: 0.1 },
          trade: "spray_foam",
          createdBy: "admin@strongfoam.demo",
          createdAt: "2026-09-18T12:00:00.000Z",
          crewName: "Jordan Field",
          pageNumber: 1,
          x: 0.2,
          y: 0.3,
        },
        {
          id: "2",
          title: "Hidden pin",
          body: null,
          status: "planned",
          kind: "pin",
          geometry: { type: "pin" },
          trade: null,
          createdBy: "other@strongfoam.demo",
          createdAt: "2026-09-18T12:00:00.000Z",
          pageNumber: 1,
          x: 0.8,
          y: 0.8,
        },
      ],
      { statuses: ["blocked"] },
    );
    const closeout = buildPlanCloseout({
      jobLabel: "JOB-1001",
      sheetName: "level-2-podium.png",
      revision: 2,
      exportedAt: new Date("2026-09-20T12:00:00.000Z"),
      marks,
    });
    expect(closeout.heading).toBe("JOB-1001 plan closeout");
    expect(closeout.rows).toEqual([
      {
        title: "North wall",
        kind: "Circle",
        status: "Blocked",
        trade: "Spray foam",
        author: "admin@strongfoam.demo",
        crew: "Jordan Field",
        note: "Hold for inspection",
        page: 1,
      },
    ]);
  });

  it("hit-tests shapes and keeps circles visually round", () => {
    const circle = {
      id: "c1",
      x: 0.4,
      y: 0.4,
      kind: "circle" as const,
      geometry: { type: "circle" as const, rx: 0.1, ry: 0.1 },
    };
    expect(hitTestMark([circle], { x: 0.42, y: 0.41 })?.id).toBe("c1");
    expect(hitTestMark([circle], { x: 0.9, y: 0.9 })).toBeNull();
    expect(visualCircleRadii({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, 1.5)).toEqual(
      {
        rx: 0.1,
        ry: 0.0667,
      },
    );
  });
});
