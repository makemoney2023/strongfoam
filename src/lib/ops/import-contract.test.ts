import { describe, expect, it } from "vitest";
import {
  DATA_IMPORT_BATCH_STATUSES,
  DATA_IMPORT_ENTITY_TYPES,
  DATA_IMPORT_OPERATIONS,
  DATA_IMPORT_ROW_STATUSES,
  IMPORT_QUERY_KINDS,
  importScopeClause,
  transitionImportBatch,
  validateImportLimits,
  type ImportBatchState,
} from "@/lib/ops/import-contract";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

describe("import contract", () => {
  it("keeps the supported entities, statuses, and operations finite", () => {
    expect(DATA_IMPORT_ENTITY_TYPES).toEqual([
      "company",
      "contact",
      "site",
      "workforce_user",
      "price_book_item",
      "opportunity",
      "project",
      "job",
      "job_assignment",
      "work_area",
      "job_task",
    ]);
    expect(DATA_IMPORT_BATCH_STATUSES).toContain("ready");
    expect(DATA_IMPORT_BATCH_STATUSES).toContain("completed");
    expect(DATA_IMPORT_ROW_STATUSES).toEqual(["valid", "warning", "error", "conflict"]);
    expect(DATA_IMPORT_OPERATIONS).toEqual(["create", "update", "skip"]);
  });

  it("allows ready to completed only through the commit states", () => {
    let batch: ImportBatchState = { status: "ready", revision: 1 };
    batch = transitionImportBatch(batch, "commit_queued");
    batch = transitionImportBatch(batch, "importing");
    batch = transitionImportBatch(batch, "completed");
    expect(batch).toEqual({ status: "completed", revision: 4 });
  });

  it("rejects moving an invalid batch directly to completed", () => {
    expect(() =>
      transitionImportBatch({ status: "invalid", revision: 1 }, "completed"),
    ).toThrow(/invalid to completed/);
  });

  it("bounds file size, sheets, and rows", () => {
    expect(validateImportLimits({ fileBytes: 10, sheetCount: 1, rowCount: 1 })).toEqual({
      ok: true,
    });
    expect(validateImportLimits({
      fileBytes: 26 * 1024 * 1024,
      sheetCount: 1,
      rowCount: 1,
    }).ok).toBe(false);
    expect(validateImportLimits({ fileBytes: 10, sheetCount: 16, rowCount: 1 }).ok).toBe(false);
    expect(validateImportLimits({ fileBytes: 10, sheetCount: 1, rowCount: 25_001 }).ok).toBe(false);
  });

  it("requires an organization on every import query", () => {
    for (const kind of IMPORT_QUERY_KINDS) {
      const clause = importScopeClause(kind, STRONG_FOAM_ORGANIZATION_ID);
      expect(clause.text).toContain("organization_id = $1");
      expect(clause.organizationId).toBe(STRONG_FOAM_ORGANIZATION_ID);
    }
    expect(() => importScopeClause("batches", "")).toThrow(/organization/);
    expect(() => importScopeClause("events", "not-an-org")).toThrow(/organization/);
  });
});
