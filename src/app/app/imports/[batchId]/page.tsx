import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/ops/action-form";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { IMPORT_ENTITY_LABELS, IMPORT_STATUS_LABELS } from "@/lib/ops/import-contract";
import { getImportRepository } from "@/lib/ops/import-store";
import { cancelImport, commitImport } from "../actions";

export const dynamic = "force-dynamic";

const HIDDEN_FROM_OFFICE = new Set(["unit_cost", "unit_cost_cents"]);

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveImportAccess(session, "data.import.prepare");
  if (!access.ok) redirect("/app");
  const { batchId } = await params;
  const batch = await getImportRepository().getBatch(access.organizationId, batchId, {
    rowLimit: 200,
  });
  if (!batch) notFound();
  const canCommit = resolveImportAccess(session, "data.import.commit").ok;
  const columns = visibleColumns(batch.rows, canCommit);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/imports", label: "Import" },
          { label: batch.filename },
        ]}
        title={batch.filename}
        description="This preview does not create companies, estimates, jobs, or messages. An administrator commits the exact staged rows."
        actions={
          <Badge variant={batch.status === "completed" ? "secondary" : "outline"}>
            {IMPORT_STATUS_LABELS[batch.status]}
          </Badge>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Rows</p>
          <p className="text-2xl font-semibold">{batch.summary.rowCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Ready</p>
          <p className="text-2xl font-semibold">{batch.summary.validCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Errors</p>
          <p className="text-2xl font-semibold">{batch.summary.errorCount}</p>
        </Card>
      </div>
      {batch.status === "completed" && !batch.durable ? (
        <p className="text-sm text-muted-foreground">
          Demo preview only. This commit did not write live records.
        </p>
      ) : null}
      {batch.status === "completed" && batch.durable ? (
        <p className="text-sm text-muted-foreground">
          Committed. Price-book changes remain drafts until an administrator approves them. Imported users stay inactive until someone activates them on Users. No estimate, proposal, or email was sent.
        </p>
      ) : null}
      {batch.status === "needs_mapping" ? (
        <p className="text-sm text-muted-foreground">
          A sheet name was not recognized. Upload again and choose the record type, or rename the sheet to one of the supported names.
        </p>
      ) : null}
      <Card className="p-4">
        <ul className="space-y-1 text-sm">
          {batch.sheets.map((sheet) => (
            <li key={sheet.name}>
              {sheet.name}: {sheet.entityType ? IMPORT_ENTITY_LABELS[sheet.entityType] : "Unmapped"} · {sheet.rowCount} rows
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex flex-wrap gap-2">
        {canCommit && batch.status === "ready" ? (
          <ActionForm action={commitImport}>
            <input type="hidden" name="batchId" value={batch.id} />
            <SubmitButton variant="default" className="min-h-11" pendingLabel="Committing…">
              Commit import
            </SubmitButton>
          </ActionForm>
        ) : null}
        {batch.status === "ready" || batch.status === "invalid" || batch.status === "needs_mapping" ? (
          <ActionForm action={cancelImport}>
            <input type="hidden" name="batchId" value={batch.id} />
            <SubmitButton variant="outline" className="min-h-11" pendingLabel="Cancelling…">
              Cancel
            </SubmitButton>
          </ActionForm>
        ) : null}
        {!canCommit && batch.status === "ready" ? (
          <p className="self-center text-sm text-muted-foreground">
            An administrator commits this batch.
          </p>
        ) : null}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.rows.map((row) => (
              <TableRow key={`${row.sheetName}-${row.rowNumber}`}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell>{IMPORT_ENTITY_LABELS[row.entityType]}</TableCell>
                <TableCell>{row.operation ?? row.status}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column}>{row.values[column] ?? ""}</TableCell>
                ))}
                <TableCell className="max-w-sm text-sm text-muted-foreground">
                  {row.messages.join(" ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {batch.summary.rowCount > batch.rows.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            Showing the first {batch.rows.length} rows of {batch.summary.rowCount}.
          </p>
        ) : null}
      </Card>
      <p className="text-sm">
        <Link href="/app/imports" className="font-medium underline underline-offset-4">
          Back to imports
        </Link>
      </p>
    </div>
  );
}

function visibleColumns(
  rows: Array<{ values: Record<string, string> }>,
  canCommit: boolean,
): string[] {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.values)) {
      if (key === "source_key") continue;
      if (!canCommit && HIDDEN_FROM_OFFICE.has(key)) continue;
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns.slice(0, 8);
}
