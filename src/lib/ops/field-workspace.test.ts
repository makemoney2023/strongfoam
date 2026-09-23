import { describe, expect, it } from "vitest";
import {
  formatFieldQuantity,
  parseFieldNoteInput,
} from "@/lib/ops/field-workspace";

describe("field workspace parsing", () => {
  it("requires a body and accepts optional work area or task references", () => {
    expect(parseFieldNoteInput({ body: "" }).ok).toBe(false);
    expect(
      parseFieldNoteInput({
        kind: "note",
        body: "Safety talk complete.",
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "note",
        body: "Safety talk complete.",
        workAreaId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        taskId: null,
        annotationId: null,
        quantity: null,
        unit: null,
      },
    });
  });

  it("requires a whole quantity and unit for quantity entries", () => {
    expect(
      parseFieldNoteInput({
        kind: "quantity",
        body: "Closed-cell at podium",
        quantity: "12.5",
        unit: "board_feet",
      }).ok,
    ).toBe(false);
    expect(
      parseFieldNoteInput({
        kind: "quantity",
        body: "Closed-cell at podium",
        quantity: "240",
        unit: "board_feet",
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "quantity",
        body: "Closed-cell at podium",
        workAreaId: null,
        taskId: null,
        annotationId: null,
        quantity: 240,
        unit: "board_feet",
      },
    });
    expect(formatFieldQuantity(240, "board_feet")).toBe("240 board feet");
    expect(
      parseFieldNoteInput({
        kind: "deficiency",
        body: "",
      }),
    ).toMatchObject({ ok: false, field: "body" });
  });

  it("keeps an optional quantity on a material request and ignores it on a note", () => {
    expect(
      parseFieldNoteInput({
        kind: "material_request",
        body: "Closed-cell bags for the next lift",
        quantity: "12",
        unit: "bags",
      }),
    ).toMatchObject({
      ok: true,
      value: { kind: "material_request", quantity: 12, unit: "bags" },
    });
    expect(
      parseFieldNoteInput({
        kind: "material_request",
        body: "Seam tape",
        quantity: "",
        unit: "board_feet",
      }),
    ).toMatchObject({
      ok: true,
      value: { quantity: null, unit: null },
    });
    expect(
      parseFieldNoteInput({
        kind: "material_request",
        body: "Closed-cell bags",
        quantity: "12.5",
        unit: "bags",
      }).ok,
    ).toBe(false);
    expect(
      parseFieldNoteInput({
        kind: "note",
        body: "Safety talk complete.",
        quantity: "12",
        unit: "bags",
      }),
    ).toMatchObject({
      ok: true,
      value: { quantity: null, unit: null },
    });
  });
});
