import { describe, expect, it } from "vitest";
import { kindFromPath } from "@/lib/ops/recent";
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

  it("finds an estimate by number and recognizes its route", async () => {
    const hits = await searchOps("EST-1001", 12);
    expect(hits.some((hit) => hit.kind === "estimate" && hit.href.includes("/estimates/"))).toBe(
      true,
    );
    expect(
      kindFromPath("/app/opportunities/99999999-9999-4999-8999-999999999991/estimates/22222222-2222-4222-8222-222222222201"),
    ).toBe("estimate");
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchOps("   ")).toEqual([]);
  });
});
