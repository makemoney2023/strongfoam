import { describe, expect, it } from "vitest";
import {
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
        status: "planned",
        title: "Install closed-cell",
        body: null,
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        taskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      },
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

  it("keeps marks on the revision they were drawn on", () => {
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
      false,
    );
  });
});
