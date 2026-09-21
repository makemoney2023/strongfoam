import { describe, expect, it } from "vitest";
import { groupDeficienciesBySheet } from "@/lib/ops/deficiency-sheets";

describe("deficiencies by sheet", () => {
  it("groups deficiency marks and linked notes, and leaves unmarked notes off the sheet", () => {
    const groups = groupDeficienciesBySheet({
      jobId: "job-1",
      documents: [{ id: "doc-1", filename: "level-2.png" }],
      marks: [
        {
          id: "mark-1",
          title: "Void at the column",
          status: "deficiency",
          pageNumber: 2,
          documentId: "doc-1",
          voidedAt: null,
        },
        {
          id: "mark-2",
          title: "Planned pin",
          status: "planned",
          pageNumber: 1,
          documentId: "doc-1",
          voidedAt: null,
        },
      ],
      notes: [
        {
          id: "note-1",
          kind: "deficiency",
          body: "Photo the void.",
          annotationId: "mark-1",
        },
        {
          id: "note-2",
          kind: "deficiency",
          body: "Missing trim.",
          annotationId: null,
        },
      ],
    });
    expect(groups).toHaveLength(2);
    expect(groups[0]?.filename).toBe("level-2.png");
    expect(groups[0]?.pageNumber).toBe(2);
    expect(groups[0]?.items.map((item) => item.label)).toEqual([
      "Void at the column",
      "Photo the void.",
    ]);
    expect(groups[1]?.filename).toBe("No sheet");
    expect(groups[1]?.items.map((item) => item.label)).toEqual(["Missing trim."]);
  });
});
