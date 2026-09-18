import { describe, expect, it } from "vitest";
import {
  extractMentions,
  parseCommentInput,
  parseTaskInput,
} from "@/lib/ops/collaboration";

describe("collaboration parsers", () => {
  it("requires a task title and accepts optional due dates", () => {
    expect(parseTaskInput({ title: "  " }).ok).toBe(false);
    const parsed = parseTaskInput({
      title: "Call the GC",
      assignee: "Alex Rivera",
      dueAt: "2026-09-19T14:00",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.title).toBe("Call the GC");
    expect(parsed.value.assignee).toBe("Alex Rivera");
  });

  it("requires comment text and extracts mentions", () => {
    expect(parseCommentInput({ body: "" }).ok).toBe(false);
    expect(parseCommentInput({ body: "Need @Alex and @jordan on this." })).toEqual({
      ok: true,
      value: { body: "Need @Alex and @jordan on this." },
    });
    expect(extractMentions("Need @Alex and @jordan on this.")).toEqual([
      "alex",
      "jordan",
    ]);
  });
});
