export const DATA_IMPORT_ENTITY_TYPES = [
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
] as const;

export type ImportEntityType = (typeof DATA_IMPORT_ENTITY_TYPES)[number];

export const DATA_IMPORT_BATCH_STATUSES = [
  "uploaded",
  "analyzing",
  "needs_mapping",
  "invalid",
  "ready",
  "commit_queued",
  "importing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ImportBatchStatus = (typeof DATA_IMPORT_BATCH_STATUSES)[number];

export const DATA_IMPORT_ROW_STATUSES = [
  "valid",
  "warning",
  "error",
  "conflict",
] as const;

export type ImportRowStatus = (typeof DATA_IMPORT_ROW_STATUSES)[number];

export const DATA_IMPORT_OPERATIONS = ["create", "update", "skip"] as const;

export type ImportOperation = (typeof DATA_IMPORT_OPERATIONS)[number];

export const IMPORT_COMMIT_ORDER: readonly ImportEntityType[] = [
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
];

export const IMPORT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const IMPORT_MAX_SHEETS = 15;
export const IMPORT_MAX_ROWS = 25_000;
export const IMPORT_MAX_ZIP_ENTRIES = 100;
export const IMPORT_MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;

export const IMPORT_ENTITY_LABELS: Record<ImportEntityType, string> = {
  company: "Companies",
  contact: "Contacts",
  site: "Sites",
  workforce_user: "Workforce",
  price_book_item: "Price book",
  opportunity: "Opportunities",
  project: "Projects",
  job: "Jobs",
  job_assignment: "Assignments",
  work_area: "Work areas",
  job_task: "Tasks",
};

export const IMPORT_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  uploaded: "Uploaded",
  analyzing: "Analyzing",
  needs_mapping: "Needs mapping",
  invalid: "Needs attention",
  ready: "Ready to commit",
  commit_queued: "Queued",
  importing: "Importing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const TRANSITIONS: Record<ImportBatchStatus, readonly ImportBatchStatus[]> = {
  uploaded: ["analyzing", "cancelled", "failed"],
  analyzing: ["needs_mapping", "invalid", "ready", "failed"],
  needs_mapping: ["invalid", "ready", "cancelled"],
  invalid: ["needs_mapping", "ready", "cancelled"],
  ready: ["commit_queued", "needs_mapping", "cancelled"],
  commit_queued: ["importing", "failed"],
  importing: ["completed", "failed"],
  completed: [],
  failed: ["ready"],
  cancelled: [],
};

export type ImportBatchState = {
  status: ImportBatchStatus;
  revision: number;
};

export function isImportEntityType(value: string): value is ImportEntityType {
  return DATA_IMPORT_ENTITY_TYPES.includes(value as ImportEntityType);
}

export function isImportBatchStatus(value: string): value is ImportBatchStatus {
  return DATA_IMPORT_BATCH_STATUSES.includes(value as ImportBatchStatus);
}

export function transitionImportBatch(
  batch: ImportBatchState,
  next: ImportBatchStatus,
): ImportBatchState {
  if (!TRANSITIONS[batch.status].includes(next)) {
    throw new Error(`Cannot move an import from ${batch.status} to ${next}.`);
  }
  return { status: next, revision: batch.revision + 1 };
}

export function validateImportLimits(input: {
  fileBytes: number;
  sheetCount: number;
  rowCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(input.fileBytes) || input.fileBytes < 1) {
    return { ok: false, error: "Choose a CSV or XLSX file." };
  }
  if (input.fileBytes > IMPORT_MAX_FILE_BYTES) {
    return { ok: false, error: "Import files must be 25 MB or smaller." };
  }
  if (input.sheetCount < 1 || input.sheetCount > IMPORT_MAX_SHEETS) {
    return {
      ok: false,
      error: `An import can include at most ${IMPORT_MAX_SHEETS} sheets.`,
    };
  }
  if (input.rowCount < 1 || input.rowCount > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `An import can include at most ${IMPORT_MAX_ROWS.toLocaleString("en-CA")} rows.`,
    };
  }
  return { ok: true };
}

export type ImportQueryKind =
  | "batches"
  | "sheets"
  | "rows"
  | "profiles"
  | "crosswalks"
  | "events";

export const IMPORT_QUERY_KINDS: readonly ImportQueryKind[] = [
  "batches",
  "sheets",
  "rows",
  "profiles",
  "crosswalks",
  "events",
];

const ORGANIZATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isImportId(value: string): boolean {
  return ORGANIZATION_ID.test(value);
}

export function importScopeClause(
  kind: ImportQueryKind,
  organizationId: string,
): { text: string; organizationId: string } {
  if (!ORGANIZATION_ID.test(organizationId)) {
    throw new Error("An organization is required.");
  }
  const table = {
    batches: "private_data_import_batches",
    sheets: "private_data_import_sheets",
    rows: "private_data_import_rows",
    profiles: "private_data_import_mapping_profiles",
    crosswalks: "private_external_record_keys",
    events: "private_data_import_events",
  }[kind];
  return {
    text: `select * from ${table} where organization_id = ?`,
    organizationId,
  };
}
