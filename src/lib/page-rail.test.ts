import { describe, expect, it } from "vitest";
import { getPageRailInset } from "./page-rail";

describe("page rail inset", () => {
  it("matches the header logo inset at mobile, tablet, desktop, and wide widths", () => {
    expect(getPageRailInset(390)).toBe(16);
    expect(getPageRailInset(768)).toBe(24);
    expect(getPageRailInset(1024)).toBe(40);
    expect(getPageRailInset(1408)).toBe(40);
    expect(getPageRailInset(1440)).toBe(56);
    expect(getPageRailInset(1920)).toBe(296);
  });
});
