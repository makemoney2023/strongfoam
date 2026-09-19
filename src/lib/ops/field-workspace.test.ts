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
        quantity: 240,
        unit: "board_feet",
      },
    });
    expect(formatFieldQuantity(240, "board_feet")).toBe("240 board feet");
  });
});
