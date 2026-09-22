import { FileSpreadsheetIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { EmptyState } from "@/components/ops/empty-state";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import {
  DATA_IMPORT_ENTITY_TYPES,
  IMPORT_ENTITY_LABELS,
  IMPORT_STATUS_LABELS,
} from "@/lib/ops/import-contract";
import { getImportRepository } from "@/lib/ops/import-store";
import { uploadImport } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveImportAccess(session, "data.import.prepare");
  if (!access.ok) redirect("/app");
  const batches = await getImportRepository().listBatches(access.organizationId);
  const canCommit = resolveImportAccess(session, "data.import.commit").ok;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import"
        description="Stage a spreadsheet of customers, workforce, price book, opportunities, projects, and jobs. Uploading does not create records. An administrator commits a clean preview."
      />
      {isDemoOpsStore() ? (
        <p className="text-sm text-muted-foreground">
          Demo mode can preview an import. A demo commit does not write durable records.
        </p>
      ) : null}
      <Card className="space-y-4 p-4">
        <ActionForm action={uploadImport} className="grid gap-4 sm:grid-cols-[1fr_16rem_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="import-file">CSV or XLSX</Label>
            <Input
              id="import-file"
              name="file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="h-11"
              required
            />
            <FieldError name="file" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-entity">Record type</Label>
            <NativeSelect id="import-entity" name="entityType" defaultValue="" className="h-11">
              <option value="">Detect from the sheet name</option>
              {DATA_IMPORT_ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>
                  {IMPORT_ENTITY_LABELS[entity]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <SubmitButton variant="default" className="min-h-11" pendingLabel="Staging…">
            Stage file
          </SubmitButton>
        </ActionForm>
        <p className="text-sm text-muted-foreground">
          Name each sheet Companies, Contacts, Sites, Workforce, Price book, Opportunities, Projects, Jobs, Assignments, Work areas, or Tasks.
          {" "}
          <Link className="font-medium underline underline-offset-4" href="/api/ops/imports/template?entity=company">
            Download a companies template
          </Link>
          {" · "}
          <Link className="font-medium underline underline-offset-4" href="/api/ops/imports/template?entity=price_book_item">
            Price book template
          </Link>
          . Files stay in the private import schema. Formulas are not evaluated, and a password column is rejected.
        </p>
        {canCommit ? null : (
          <p className="text-sm text-muted-foreground">
            You can prepare this import. An administrator commits it.
          </p>
        )}
      </Card>
      <Card>
        {batches.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheetIcon aria-hidden="true" />}
            title="No imports yet"
            description="Upload a UTF-8 CSV or an .xlsx workbook. The preview stays here until an administrator commits it."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Staged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    <Link href={`/app/imports/${batch.id}`} className="underline underline-offset-4">
                      {batch.filename}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.status === "ready" ? "secondary" : "outline"}>
                      {IMPORT_STATUS_LABELS[batch.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{batch.summary.rowCount}</TableCell>
                  <TableCell>
                    {batch.createdAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
