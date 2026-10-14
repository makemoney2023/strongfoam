import { describe, expect, it } from "vitest";
import { dropAcked, enqueueOutbox, listOutbox, type FieldOutboxItem } from "@/lib/ops/field-outbox";

const item: FieldOutboxItem = {
  id: "1",
  kind: "draft",
  draft: {
    jobId: "job",
    kind: "caption",
    body: "Photo queued on this device.",
    quote: "Photo queued on this device.",
    source: "photo",
    workAreaId: null,
    taskId: null,
    documentId: null,
    voiceNoteId: null,
    quantity: null,
    unit: null,
    effect: "This stays a draft until you confirm it.",
  },
};

describe("field outbox", () => {
  it("queues a draft and drops it after ack", () => {
    const queued = enqueueOutbox([], item);
    expect(listOutbox(queued)).toHaveLength(1);
    expect(enqueueOutbox(queued, item)).toHaveLength(1);
    expect(dropAcked(queued, ["1"])).toEqual([]);
  });

  it("ignores an item that is not a draft", () => {
    const blocked = { ...item, kind: "verify" as "draft" };
    expect(enqueueOutbox([], blocked)).toEqual([]);
  });
});
