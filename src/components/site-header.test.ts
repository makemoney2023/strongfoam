import { describe, expect, it } from "vitest";
import { navLinks } from "@/content/nav";

describe("site header navigation", () => {
  it("exposes large-target section anchors for the primary nav", () => {
    expect(navLinks.map((link) => link.label)).toEqual([
      "Services",
      "Sectors",
      "Projects",
      "Coverage",
      "FAQ",
      "Contact",
    ]);
    expect(navLinks.every((link) => link.href.startsWith("/#"))).toBe(true);
  });
});
