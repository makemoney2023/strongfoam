import { getOpsSession } from "@/lib/ops/auth";
import { isImportId } from "@/lib/ops/import-contract";
import { resolveImportAccess, type ImportActor } from "@/lib/ops/import-authorization";
import { reconciliationCsv, type ReconciliationRow } from "@/lib/ops/import-report";
import { getImportRepository } from "@/lib/ops/import-store";

export type ImportReportDeps = {
  getSession: () => Promise<ImportActor | null>;
  loadRows: (organizationId: string, batchId: string) => Promise<ReconciliationRow[] | null>;
};

async function loadReportRows(
  organizationId: string,
  batchId: string,
): Promise<ReconciliationRow[] | null> {
  const batch = await getImportRepository().getBatch(organizationId, batchId);
  if (!batch) return null;
  return batch.rows.map((row) => ({
    sheet: row.sheetName,
    sourceRow: row.rowNumber,
    entityType: row.entityType,
    sourceKey: row.sourceKey,
    operation: row.operation ?? "",
    status: row.status,
    targetId: row.targetId ?? "",
    message: row.messages.join("; "),
  }));
}

export async function handleImportReportRequest(
  batchId: string,
  deps: ImportReportDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) {
    return new Response("Sign in to download an import report.", { status: 401 });
  }
  const access = resolveImportAccess(session, "data.import.prepare");
  if (!access.ok) {
    return new Response(access.error, { status: 403 });
  }
  if (!isImportId(batchId)) {
    return new Response("That import could not be found.", { status: 404 });
  }
  const rows = await deps.loadRows(access.organizationId, batchId);
  if (!rows) {
    return new Response("That import could not be found.", { status: 404 });
  }
  return new Response(reconciliationCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="import-${batchId}-reconciliation.csv"`,
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await context.params;
  return handleImportReportRequest(batchId, {
    getSession: getOpsSession,
    loadRows: loadReportRows,
  });
}
