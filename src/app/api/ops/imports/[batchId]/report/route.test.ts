import { describe, expect, it } from "vitest";
import { handleImportReportRequest } from "@/app/api/ops/imports/[batchId]/report/route";
import type { ReconciliationRow } from "@/lib/ops/import-report";

const BATCH = "11111111-1111-4111-8111-111111111111";

const rows: ReconciliationRow[] = [
  {
    sheet: "Companies",
    sourceRow: 2,
    entityType: "company",
    sourceKey: "acme",
    operation: "create",
    status: "valid",
    targetId: BATCH,
    message: "Ready",
  },
];

describe("GET import reconciliation report", () => {
  it("refuses anonymous, field, and unknown batches", async () => {
    const anonymous = await handleImportReportRequest(BATCH, {
      getSession: async () => null,
      loadRows: async () => rows,
    });
    expect(anonymous.status).toBe(401);

    const field = await handleImportReportRequest(BATCH, {
      getSession: async () => ({ role: "field_worker", organizationId: "org-1" }),
      loadRows: async () => rows,
    });
    expect(field.status).toBe(403);

    const missing = await handleImportReportRequest(BATCH, {
      getSession: async () => ({ role: "office", organizationId: "org-1", email: "office@strongfoam.com" }),
      loadRows: async () => null,
    });
    expect(missing.status).toBe(404);

    let loaded = false;
    const malformed = await handleImportReportRequest("not-a-batch", {
      getSession: async () => ({ role: "office", organizationId: "org-1", email: "office@strongfoam.com" }),
      loadRows: async () => {
        loaded = true;
        return rows;
      },
    });
    expect(malformed.status).toBe(404);
    expect(loaded).toBe(false);
  });

  it("lets office download the report without row payloads", async () => {
    const response = await handleImportReportRequest(BATCH, {
      getSession: async () => ({ role: "office", organizationId: "org-1", email: "office@strongfoam.com" }),
      loadRows: async (organizationId) => (organizationId === "org-1" ? rows : null),
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("source_key");
    expect(body).toContain("acme");
    expect(body).not.toContain("unit_cost");
    expect(body).not.toContain("secret-payload");
  });
});
