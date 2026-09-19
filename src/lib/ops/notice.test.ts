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

  it("rejects empty or malformed notices", () => {
    expect(parseOpsNotice("")).toBeNull();
    expect(parseOpsNotice("not-json")).toBeNull();
    expect(parseOpsNotice(encodeURIComponent(JSON.stringify({ kind: "success" })))).toBeNull();
  });
});
