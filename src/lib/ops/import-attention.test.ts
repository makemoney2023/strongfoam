import { describe, expect, it } from "vitest";
import { listImportHomeExceptions } from "@/lib/ops/import-attention";

describe("import home exceptions", () => {
  it("links failed imports, dead letters, price drafts, and inactive workforce", () => {
    const rows = listImportHomeExceptions({
      batches: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          filename: "customers.csv",
          status: "failed",
          priceDraftCount: 0,
          inactiveUserCount: 0,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          filename: "prices.csv",
          status: "completed",
          priceDraftCount: 2,
          inactiveUserCount: 1,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          filename: "ready.csv",
          status: "ready",
          priceDraftCount: 4,
          inactiveUserCount: 3,
        },
      ],
      deadLetters: [
        {
          id: "job-1",
          kind: "data-import.analyze",
          batchId: "11111111-1111-4111-8111-111111111111",
        },
        { id: "job-2", kind: "document.scan", batchId: "11111111-1111-4111-8111-111111111111" },
      ],
    });
    expect(rows.map((row) => [row.kind, row.href])).toEqual([
      ["failed_import", "/app/imports/11111111-1111-4111-8111-111111111111"],
      ["price_drafts", "/app/imports/22222222-2222-4222-8222-222222222222"],
      ["inactive_workforce", "/app/imports/22222222-2222-4222-8222-222222222222"],
      ["dead_letter_import", "/app/imports/11111111-1111-4111-8111-111111111111"],
    ]);
  });
});
