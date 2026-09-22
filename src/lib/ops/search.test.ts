import { describe, expect, it } from "vitest";
import { searchOps } from "@/lib/ops/search";

describe("ops search", () => {
  it("finds demo companies, requests, and jobs by name", async () => {
    const hits = await searchOps("acme", 12);
    expect(hits.some((hit) => hit.kind === "company")).toBe(true);
    expect(hits.every((hit) => hit.href.startsWith("/app/"))).toBe(true);
  });

  it("finds a price-book item by name", async () => {
    const hits = await searchOps("closed-cell", 12);
    expect(hits.some((hit) => hit.kind === "price_book" && hit.href.includes("#item-"))).toBe(
      true,
    );
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchOps("   ")).toEqual([]);
  });
});
