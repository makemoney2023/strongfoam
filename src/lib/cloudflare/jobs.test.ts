import { describe, expect, it, vi } from "vitest";
import { dispatchJobBatch, dispatchJobMessage } from "@/lib/cloudflare/jobs";

describe("Cloudflare job queue", () => {
  it("runs the handler for a known job kind", async () => {
    const scan = vi.fn(async () => undefined);
    await dispatchJobMessage(
      { kind: "document.scan", data: { documentVersionId: "v1" } },
      { "document.scan": scan },
    );
    expect(scan).toHaveBeenCalledWith({
      id: "document.scan",
      data: { documentVersionId: "v1" },
    });
  });

  it("acks a completed message and retries an unknown kind", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const retain = vi.fn(async () => undefined);
    await dispatchJobBatch(
      [
        { body: { kind: "data-import.retain", data: {} }, ack, retry },
        { body: { kind: "lead-intake", data: {} }, ack, retry },
      ],
      { "data-import.retain": retain },
    );
    expect(retain).toHaveBeenCalledOnce();
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });
});
