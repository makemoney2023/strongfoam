export type ImportAttentionBatch = {
  id: string;
  filename: string;
  status: string;
  priceDraftCount: number;
  inactiveUserCount: number;
};

export type ImportDeadLetter = {
  id: string;
  kind: string;
  batchId: string;
};

export type ImportHomeException = {
  kind: "failed_import" | "dead_letter_import" | "price_drafts" | "inactive_workforce";
  label: string;
  href: string;
};

const IMPORT_JOB_KINDS = new Set([
  "data-import.analyze",
  "data-import.commit",
  "data-import.retain",
]);

export function listImportHomeExceptions(input: {
  batches: readonly ImportAttentionBatch[];
  deadLetters: readonly ImportDeadLetter[];
}): ImportHomeException[] {
  const rows: ImportHomeException[] = [];
  for (const batch of input.batches) {
    if (batch.status === "failed") {
      rows.push({
        kind: "failed_import",
        label: `Failed import: ${batch.filename}`,
        href: `/app/imports/${batch.id}`,
      });
    }
    if (batch.status === "completed" && batch.priceDraftCount > 0) {
      rows.push({
        kind: "price_drafts",
        label: `Price drafts to approve: ${batch.filename}`,
        href: `/app/imports/${batch.id}`,
      });
    }
    if (batch.status === "completed" && batch.inactiveUserCount > 0) {
      rows.push({
        kind: "inactive_workforce",
        label: `Workforce accounts to activate: ${batch.filename}`,
        href: `/app/imports/${batch.id}`,
      });
    }
  }
  for (const job of input.deadLetters) {
    if (!IMPORT_JOB_KINDS.has(job.kind) || !job.batchId) continue;
    rows.push({
      kind: "dead_letter_import",
      label: `Import job needs review: ${job.kind}`,
      href: `/app/imports/${job.batchId}`,
    });
  }
  return rows;
}
