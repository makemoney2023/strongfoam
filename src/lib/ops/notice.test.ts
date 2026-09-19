import { describe, expect, it } from "vitest";
import { encodeOpsNotice, parseOpsNotice } from "@/lib/ops/notice";

describe("ops notices", () => {
  it("round-trips a success notice through the cookie encoding", () => {
    const encoded = encodeOpsNotice({ kind: "success", message: "Company created." });
    expect(parseOpsNotice(encoded)).toEqual({
      kind: "success",
      message: "Company created.",
    });
  });

  it("gives each encoded notice a distinct payload so repeats still toast", () => {
    const first = encodeOpsNotice({ kind: "success", message: "Saved." });
    const second = encodeOpsNotice({ kind: "success", message: "Saved." });
    expect(first).not.toEqual(second);
    expect(parseOpsNotice(first)).toEqual({ kind: "success", message: "Saved." });
    expect(parseOpsNotice(second)).toEqual({ kind: "success", message: "Saved." });
  });

  it("rejects empty or malformed notices", () => {
    expect(parseOpsNotice("")).toBeNull();
    expect(parseOpsNotice("not-json")).toBeNull();
    expect(parseOpsNotice(encodeURIComponent(JSON.stringify({ kind: "success" })))).toBeNull();
  });
});
