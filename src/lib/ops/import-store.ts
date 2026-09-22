import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  contacts,
  backgroundJobs,
  dataImportBatches,
  dataImportEvents,
  dataImportRows,
  dataImportSheets,
  externalRecordKeys,
  jobAssignments,
  jobTasks,
  jobs,
  memberships,
  opportunities,
  priceBookItemVersions,
  priceBookItems,
  projects,
  sites,
  users,
  workAreas,
} from "@/db/schema";
import {
  applyImportRows,
  emptyImportDomain,
  type ImportDomain,
  type ImportWrite,
} from "@/lib/ops/import-apply";
import {
  importScopeClause,
  isImportBatchStatus,
  isImportEntityType,
  isImportId,
  transitionImportBatch,
  type ImportBatchState,
  type ImportBatchStatus,
  type ImportEntityType,
} from "@/lib/ops/import-contract";
import type { ImportAttentionBatch, ImportDeadLetter } from "@/lib/ops/import-attention";
import { applyImportRetention } from "@/lib/ops/import-retention";
import { hashPassword } from "@/lib/ops/credentials";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import {
  previewHash,
  stageImportFile,
  type StagedImport,
  type StagedImportRow,
  type StagedImportSheet,
} from "@/lib/ops/import-validation";

export type ImportBatchSummary = {
  id: string;
  organizationId: string;
  filename: string;
  status: ImportBatchStatus;
  durable: boolean;
  createdAt: Date;
  summary: StagedImport["summary"];
};

export type ImportBatchDetail = ImportBatchSummary & {
  revision: number;
  previewHash: string | null;
  sha256: string;
  sheets: StagedImportSheet[];
  rows: Array<StagedImportRow & { operation: string | null; targetId: string | null }>;
};

export type ImportRepository = {
  listBatches(organizationId: string): Promise<ImportBatchSummary[]>;
  getBatch(
    organizationId: string,
    batchId: string,
    options?: { rowLimit?: number },
  ): Promise<ImportBatchDetail | null>;
  saveUpload(input: {
    organizationId: string;
    actor: string;
    filename: string;
    contentType: string;
    bytes: Buffer;
    entityType?: string | null;
  }): Promise<{ ok: true; batch: ImportBatchDetail; duplicate: boolean } | { ok: false; error: string }>;
  commit(input: {
    organizationId: string;
    batchId: string;
    actor: string;
    durable: boolean;
  }): Promise<{ ok: true; batch: ImportBatchDetail; already: boolean } | { ok: false; error: string }>;
  cancel(input: {
    organizationId: string;
    batchId: string;
    actor: string;
  }): Promise<{ ok: true; batch: ImportBatchDetail } | { ok: false; error: string }>;
  listAttention(organizationId: string): Promise<{
    batches: ImportAttentionBatch[];
    deadLetters: ImportDeadLetter[];
  }>;
  retainDue(organizationId: string, now: Date): Promise<void>;
  retainAll(now: Date): Promise<void>;
};

type MemoryBatch = ImportBatchDetail & {
  idempotencyKey: string;
  updatedAt: Date;
  hasSource: boolean;
};

export function createMemoryImportStore(initialDomain = emptyImportDomain()): ImportRepository & {
  domain: ImportDomain;
} {
  let domain = initialDomain;
  const batches: MemoryBatch[] = [];
  const store: ImportRepository & { domain: ImportDomain } = {
    get domain() {
      return domain;
    },
    async listBatches(organizationId) {
      importScopeClause("batches", organizationId);
      return batches
        .filter((batch) => batch.organizationId === organizationId)
        .map(summaryOf);
    },
    async getBatch(organizationId, batchId, options) {
      importScopeClause("rows", organizationId);
      const batch = batches.find(
        (item) => item.organizationId === organizationId && item.id === batchId,
      );
      if (!batch) return null;
      return limitRows(batch, options?.rowLimit);
    },
    async saveUpload(input) {
      importScopeClause("batches", input.organizationId);
      const sha256 = createHash("sha256").update(input.bytes).digest("hex");
      const existing = batches.find(
        (batch) =>
          batch.organizationId === input.organizationId && batch.idempotencyKey === sha256,
      );
      if (existing) return { ok: true, batch: existing, duplicate: true };
      const staged = stageImportFile({
        bytes: input.bytes,
        filename: input.filename,
        entityType: input.entityType,
      });
      if (!staged.ok) return staged;
      const batch: MemoryBatch = {
        id: randomUUID(),
        organizationId: input.organizationId,
        filename: input.filename,
        status: staged.value.status,
        durable: false,
        createdAt: new Date(),
        summary: staged.value.summary,
        revision: 1,
        previewHash: staged.value.previewHash,
        sha256,
        idempotencyKey: sha256,
        updatedAt: new Date(),
        hasSource: true,
        sheets: staged.value.sheets,
        rows: staged.value.rows.map((row) => ({ ...row, operation: null, targetId: null })),
      };
      batches.unshift(batch);
      return { ok: true, batch, duplicate: false };
    },
    async commit(input) {
      importScopeClause("events", input.organizationId);
      const batch = batches.find(
        (item) => item.organizationId === input.organizationId && item.id === input.batchId,
      );
      if (!batch) return { ok: false, error: "That import could not be found." };
      if (batch.status === "completed") return { ok: true, batch, already: true };
      if (batch.status !== "ready" || !batch.previewHash) {
        return { ok: false, error: "Fix the row errors before committing this import." };
      }
      if (previewHash(batch.rows) !== batch.previewHash) {
        return { ok: false, error: "This preview no longer matches the staged rows." };
      }
      let state: ImportBatchState = { status: batch.status, revision: batch.revision };
      state = transitionImportBatch(state, "commit_queued");
      state = transitionImportBatch(state, "importing");
      state = transitionImportBatch(state, "completed");
      if (input.durable) {
        const applied = applyImportRows({
          domain,
          rows: batch.rows,
          createId: randomUUID,
          actor: input.actor,
          passwordHash: "import-unusable",
        });
        if (!applied.ok) return applied;
        domain = applied.domain;
        applyRowResults(batch, applied.rowResults);
      }
      batch.status = state.status;
      batch.revision = state.revision;
      batch.durable = input.durable;
      batch.updatedAt = new Date();
      return { ok: true, batch, already: false };
    },
    async cancel(input) {
      const batch = batches.find(
        (item) => item.organizationId === input.organizationId && item.id === input.batchId,
      );
      if (!batch) return { ok: false, error: "That import could not be found." };
      if (batch.status === "cancelled") return { ok: true, batch };
      try {
        const state = transitionImportBatch(
          { status: batch.status, revision: batch.revision },
          "cancelled",
        );
        batch.status = state.status;
        batch.revision = state.revision;
        batch.updatedAt = new Date();
      } catch {
        return { ok: false, error: "This import can no longer be cancelled." };
      }
      return { ok: true, batch };
    },
    async listAttention(organizationId) {
      return attentionFromBatches(batches.filter((batch) => batch.organizationId === organizationId));
    },
    async retainDue(organizationId, now) {
      const owned = batches
        .filter((batch) => batch.organizationId === organizationId)
        .map((batch) => ({
          id: batch.id,
          status: batch.status,
          updatedAt: batch.updatedAt,
          hasSource: batch.hasSource,
          hasNormalized: batch.rows.some((row) => Object.keys(row.values).length > 0),
          batch,
        }));
      await applyImportRetention(owned, now, async (subject, plan) => {
        if (plan.deleteSource) subject.batch.hasSource = false;
        if (plan.deleteNormalized) {
          for (const row of subject.batch.rows) row.values = {};
        }
      });
    },
    async retainAll(now) {
      const organizations = [...new Set(batches.map((batch) => batch.organizationId))];
      for (const organizationId of organizations) {
        await store.retainDue(organizationId, now);
      }
    },
  };
  return store;
}

function memoryImportStore(): ReturnType<typeof createMemoryImportStore> {
  // Server actions and route handlers can load separate module copies.
  // Keep staged imports on globalThis so the reconciliation download can read them.
  const globalForImport = globalThis as typeof globalThis & {
    __strongfoamImportStore?: ReturnType<typeof createMemoryImportStore>;
  };
  if (!globalForImport.__strongfoamImportStore) {
    globalForImport.__strongfoamImportStore = createMemoryImportStore();
  }
  return globalForImport.__strongfoamImportStore;
}

export function getImportRepository(): ImportRepository {
  return isDemoOpsStore() ? memoryImportStore() : postgresImportRepository;
}

const postgresImportRepository: ImportRepository = {
  listBatches: listPostgresBatches,
  getBatch: getPostgresBatch,
  saveUpload: savePostgresUpload,
  commit: commitPostgresBatch,
  cancel: cancelPostgresBatch,
  listAttention: listPostgresAttention,
  retainDue: retainPostgresImports,
  retainAll: retainAllPostgresImports,
};

const IMPORT_DEAD_LETTER_KINDS = [
  "data-import.analyze",
  "data-import.commit",
  "data-import.retain",
] as const;

function sqlBoolean(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

function importAttentionBatchId(
  kind: string,
  aggregateId: string,
  payload: Record<string, unknown> | null,
): string {
  const fromPayload = typeof payload?.batchId === "string" ? payload.batchId : "";
  if (kind === "data-import.retain") return isImportId(fromPayload) ? fromPayload : "";
  if (isImportId(fromPayload)) return fromPayload;
  return isImportId(aggregateId) ? aggregateId : "";
}

async function listPostgresAttention(organizationId: string) {
  importScopeClause("batches", organizationId);
  const db = getDb();
  const batches = await db
    .select({
      id: dataImportBatches.id,
      filename: dataImportBatches.filename,
      status: dataImportBatches.status,
    })
    .from(dataImportBatches)
    .where(eq(dataImportBatches.organizationId, organizationId));
  const counts = await db
    .select({
      batchId: dataImportRows.batchId,
      price: sql<number>`count(*) filter (where ${dataImportRows.entityType} = 'price_book_item' and ${dataImportRows.operation} in ('create', 'update'))::int`,
      users: sql<number>`count(*) filter (where ${dataImportRows.entityType} = 'workforce_user' and ${dataImportRows.operation} = 'create')::int`,
    })
    .from(dataImportRows)
    .where(eq(dataImportRows.organizationId, organizationId))
    .groupBy(dataImportRows.batchId);
  const byBatch = new Map<string, { price: number; users: number }>();
  for (const row of counts) {
    byBatch.set(row.batchId, { price: Number(row.price), users: Number(row.users) });
  }
  const jobs = await db
    .select({
      id: backgroundJobs.id,
      kind: backgroundJobs.kind,
      batchId: backgroundJobs.aggregateId,
      payload: backgroundJobs.payload,
    })
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.organizationId, organizationId),
        eq(backgroundJobs.status, "dead_letter"),
        inArray(backgroundJobs.kind, [...IMPORT_DEAD_LETTER_KINDS]),
      ),
    );
  return {
    batches: batches.flatMap((batch) => {
      const counted = byBatch.get(batch.id) ?? { price: 0, users: 0 };
      const priceDraftCount = batch.status === "completed" ? counted.price : 0;
      const inactiveUserCount = batch.status === "completed" ? counted.users : 0;
      if (batch.status !== "failed" && priceDraftCount === 0 && inactiveUserCount === 0) {
        return [];
      }
      return [{
        id: batch.id,
        filename: batch.filename,
        status: batch.status,
        priceDraftCount,
        inactiveUserCount,
      }];
    }),
    deadLetters: jobs.map((job) => ({
      id: job.id,
      kind: job.kind,
      batchId: importAttentionBatchId(job.kind, job.batchId, job.payload),
    })),
  };
}

async function retainPostgresImports(organizationId: string, now: Date) {
  importScopeClause("batches", organizationId);
  const db = getDb();
  const rows = await db
    .select({
      id: dataImportBatches.id,
      status: dataImportBatches.status,
      updatedAt: dataImportBatches.updatedAt,
      hasSource: sql<boolean>`(${dataImportBatches.fileBytes} is not null)`,
      hasNormalized: sql<boolean>`exists (
        select 1 from ${dataImportRows}
        where ${dataImportRows.batchId} = ${dataImportBatches.id}
          and ${dataImportRows.organizationId} = ${organizationId}
          and ${dataImportRows.values} <> '{}'::jsonb
      )`,
    })
    .from(dataImportBatches)
    .where(eq(dataImportBatches.organizationId, organizationId));
  const subjects = rows.map((row) => ({
    id: row.id,
    status: row.status,
    updatedAt: row.updatedAt,
    hasSource: sqlBoolean(row.hasSource),
    hasNormalized: sqlBoolean(row.hasNormalized),
  }));
  await applyImportRetention(subjects, now, async (subject, plan) => {
    await db.transaction(async (tx) => {
      if (plan.deleteSource) {
        const cleared = await tx
          .update(dataImportBatches)
          .set({ fileBytes: null })
          .where(and(
            eq(dataImportBatches.organizationId, organizationId),
            eq(dataImportBatches.id, subject.id),
            isNotNull(dataImportBatches.fileBytes),
          ))
          .returning({ id: dataImportBatches.id });
        if (cleared[0]) {
          await tx.insert(dataImportEvents).values({
            batchId: subject.id,
            organizationId,
            actor: "worker",
            kind: "retention",
            summary: "Removed the staged source file.",
            payload: { removed: "source" },
          });
        }
      }
      if (plan.deleteNormalized) {
        const cleared = await tx
          .update(dataImportRows)
          .set({ values: {} })
          .where(and(
            eq(dataImportRows.organizationId, organizationId),
            eq(dataImportRows.batchId, subject.id),
            sql`${dataImportRows.values} <> '{}'::jsonb`,
          ))
          .returning({ id: dataImportRows.id });
        if (cleared.length > 0) {
          await tx.insert(dataImportEvents).values({
            batchId: subject.id,
            organizationId,
            actor: "worker",
            kind: "retention",
            summary: "Cleared normalized row values.",
            payload: { removed: "normalized" },
          });
        }
      }
    });
  });
}

async function retainAllPostgresImports(now: Date) {
  const db = getDb();
  const organizations = await db
    .selectDistinct({ organizationId: dataImportBatches.organizationId })
    .from(dataImportBatches);
  for (const organization of organizations) {
    await retainPostgresImports(organization.organizationId, now);
  }
}

function attentionFromBatches(batches: MemoryBatch[]): {
  batches: ImportAttentionBatch[];
  deadLetters: ImportDeadLetter[];
} {
  return {
    batches: batches.flatMap((batch) => {
      const priceDraftCount =
        batch.status === "completed"
          ? batch.rows.filter(
            (row) =>
              row.entityType === "price_book_item" &&
              (row.operation === "create" || row.operation === "update"),
          ).length
          : 0;
      const inactiveUserCount =
        batch.status === "completed"
          ? batch.rows.filter(
            (row) => row.entityType === "workforce_user" && row.operation === "create",
          ).length
          : 0;
      if (batch.status !== "failed" && priceDraftCount === 0 && inactiveUserCount === 0) {
        return [];
      }
      return [{
        id: batch.id,
        filename: batch.filename,
        status: batch.status,
        priceDraftCount,
        inactiveUserCount,
      }];
    }),
    deadLetters: [],
  };
}

export async function listImportAttention(organizationId: string) {
  return getImportRepository().listAttention(organizationId);
}

export async function retainDueImports(organizationId?: string, now = new Date()) {
  const repository = getImportRepository();
  if (!organizationId) {
    await repository.retainAll(now);
    return;
  }
  await repository.retainDue(organizationId, now);
}

function summaryOf(batch: ImportBatchDetail): ImportBatchSummary {
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    filename: batch.filename,
    status: batch.status,
    durable: batch.durable,
    createdAt: batch.createdAt,
    summary: batch.summary,
  };
}

function limitRows(batch: ImportBatchDetail, rowLimit?: number): ImportBatchDetail {
  if (!rowLimit || batch.rows.length <= rowLimit) return batch;
  const errors = batch.rows.filter((row) => row.status === "error" || row.status === "conflict");
  const rest = batch.rows.filter((row) => row.status !== "error" && row.status !== "conflict");
  return { ...batch, rows: [...errors, ...rest].slice(0, rowLimit) };
}

async function persistImportRowResults(
  tx: Pick<ReturnType<typeof getDb>, "execute">,
  organizationId: string,
  batchId: string,
  results: Array<{ sheetName: string; rowNumber: number; operation: string; targetId: string }>,
) {
  const missing = results.find((result) => !isImportId(result.targetId));
  if (missing) {
    throw new Error(`Import row ${missing.sheetName} ${missing.rowNumber} has no record id.`);
  }
  const chunkSize = 200;
  for (let index = 0; index < results.length; index += chunkSize) {
    const chunk = results.slice(index, index + chunkSize);
    const tuples = sql.join(
      chunk.map(
        (result) =>
          sql`(${result.sheetName}, ${result.rowNumber}::int, ${result.operation}, ${result.targetId}::uuid)`,
      ),
      sql`, `,
    );
    await tx.execute(sql`
      update ${dataImportRows} as row
      set operation = input.operation, target_id = input.target_id
      from (values ${tuples}) as input(sheet_name, row_number, operation, target_id)
      where row.organization_id = ${organizationId}
        and row.batch_id = ${batchId}
        and row.sheet_name = input.sheet_name
        and row.row_number = input.row_number
    `);
  }
}

function applyRowResults(
  batch: ImportBatchDetail,
  results: Array<{ sheetName: string; rowNumber: number; operation: string; targetId: string }>,
) {
  const byRow = new Map(results.map((result) => [`${result.sheetName}:${result.rowNumber}`, result]));
  for (const row of batch.rows) {
    const result = byRow.get(`${row.sheetName}:${row.rowNumber}`);
    if (!result) continue;
    row.operation = result.operation;
    row.targetId = result.targetId;
  }
}

async function listPostgresBatches(organizationId: string): Promise<ImportBatchSummary[]> {
  importScopeClause("batches", organizationId);
  const db = getDb();
  const rows = await db
    .select({
      id: dataImportBatches.id,
      organizationId: dataImportBatches.organizationId,
      filename: dataImportBatches.filename,
      status: dataImportBatches.status,
      durable: dataImportBatches.durable,
      createdAt: dataImportBatches.createdAt,
      summary: dataImportBatches.summary,
    })
    .from(dataImportBatches)
    .where(eq(dataImportBatches.organizationId, organizationId))
    .orderBy(desc(dataImportBatches.createdAt));
  return rows.flatMap((row) => {
    if (!isImportBatchStatus(row.status)) return [];
    return [{
      id: row.id,
      organizationId: row.organizationId,
      filename: row.filename,
      status: row.status,
      durable: row.durable,
      createdAt: row.createdAt,
      summary: row.summary as StagedImport["summary"],
    }];
  });
}

async function getPostgresBatch(
  organizationId: string,
  batchId: string,
  options?: { rowLimit?: number },
): Promise<ImportBatchDetail | null> {
  importScopeClause("batches", organizationId);
  importScopeClause("sheets", organizationId);
  importScopeClause("rows", organizationId);
  const db = getDb();
  const batches = await db
    .select({
      id: dataImportBatches.id,
      organizationId: dataImportBatches.organizationId,
      filename: dataImportBatches.filename,
      status: dataImportBatches.status,
      durable: dataImportBatches.durable,
      createdAt: dataImportBatches.createdAt,
      summary: dataImportBatches.summary,
      revision: dataImportBatches.revision,
      previewHash: dataImportBatches.previewHash,
      sha256: dataImportBatches.sha256,
    })
    .from(dataImportBatches)
    .where(and(
      eq(dataImportBatches.organizationId, organizationId),
      eq(dataImportBatches.id, batchId),
    ));
  const batch = batches[0];
  if (!batch || !isImportBatchStatus(batch.status)) return null;
  const sheets = await db
    .select()
    .from(dataImportSheets)
    .where(and(
      eq(dataImportSheets.organizationId, organizationId),
      eq(dataImportSheets.batchId, batchId),
    ));
  const rowQuery = db
    .select()
    .from(dataImportRows)
    .where(and(
      eq(dataImportRows.organizationId, organizationId),
      eq(dataImportRows.batchId, batchId),
    ));
  const storedRows = options?.rowLimit
    ? await rowQuery
      .orderBy(
        sql`case when ${dataImportRows.status} in ('error', 'conflict') then 0 else 1 end`,
        asc(dataImportRows.rowNumber),
      )
      .limit(options.rowLimit)
    : await rowQuery.orderBy(asc(dataImportRows.rowNumber));
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    filename: batch.filename,
    status: batch.status,
    durable: batch.durable,
    createdAt: batch.createdAt,
    summary: batch.summary as StagedImport["summary"],
    revision: batch.revision,
    previewHash: batch.previewHash,
    sha256: batch.sha256,
    sheets: sheets.map((sheet) => ({
      name: sheet.sheetName,
      entityType: sheet.entityType && isImportEntityType(sheet.entityType) ? sheet.entityType : null,
      headers: sheet.headers as string[],
      rowCount: sheet.rowCount,
    })),
    rows: storedRows.flatMap((row) => {
      if (!isImportEntityType(row.entityType)) return [];
      return [{
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        entityType: row.entityType,
        sourceKey: row.sourceKey,
        status: row.status as StagedImportRow["status"],
        messages: row.messages as string[],
        values: row.values as Record<string, string>,
        operation: row.operation,
        targetId: row.targetId,
      }];
    }),
  };
}

const INSERT_CHUNK = 200;

async function insertInChunks<T>(rows: T[], write: (chunk: T[]) => Promise<unknown>) {
  for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
    await write(rows.slice(index, index + INSERT_CHUNK));
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

async function findUploadByHash(
  organizationId: string,
  sha256: string,
): Promise<{ ok: true; batch: ImportBatchDetail; duplicate: true } | { ok: false; error: string } | null> {
  const db = getDb();
  const existing = await db
    .select({ id: dataImportBatches.id })
    .from(dataImportBatches)
    .where(and(
      eq(dataImportBatches.organizationId, organizationId),
      eq(dataImportBatches.idempotencyKey, sha256),
    ));
  if (!existing[0]) return null;
  const batch = await getPostgresBatch(organizationId, existing[0].id);
  if (!batch) return { ok: false, error: "That import could not be found." };
  return { ok: true, batch, duplicate: true };
}

async function savePostgresUpload(
  input: Parameters<ImportRepository["saveUpload"]>[0],
): ReturnType<ImportRepository["saveUpload"]> {
  importScopeClause("batches", input.organizationId);
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const existing = await findUploadByHash(input.organizationId, sha256);
  if (existing) return existing;
  const staged = stageImportFile({
    bytes: input.bytes,
    filename: input.filename,
    entityType: input.entityType,
  });
  if (!staged.ok) return staged;
  const db = getDb();
  let batchId = "";
  try {
    batchId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dataImportBatches)
        .values({
          organizationId: input.organizationId,
          createdBy: input.actor,
          filename: input.filename,
          contentType: input.contentType || "application/octet-stream",
          byteSize: input.bytes.length,
          sha256,
          idempotencyKey: sha256,
          status: staged.value.status,
          previewHash: staged.value.previewHash,
          durable: false,
          summary: staged.value.summary,
          fileBytes: input.bytes,
        })
        .returning({ id: dataImportBatches.id });
      const id = inserted[0]?.id;
      if (!id) throw new Error("The import could not be saved.");
      if (staged.value.sheets.length) {
        await insertInChunks(
          staged.value.sheets.map((sheet) => ({
            batchId: id,
            organizationId: input.organizationId,
            sheetName: sheet.name,
            entityType: sheet.entityType,
            rowCount: sheet.rowCount,
            headers: sheet.headers,
          })),
          (chunk) => tx.insert(dataImportSheets).values(chunk),
        );
      }
      if (staged.value.rows.length) {
        await insertInChunks(
          staged.value.rows.map((row) => ({
            batchId: id,
            organizationId: input.organizationId,
            sheetName: row.sheetName,
            rowNumber: row.rowNumber,
            entityType: row.entityType,
            sourceKey: row.sourceKey,
            status: row.status,
            operation: "",
            values: row.values,
            messages: row.messages,
          })),
          (chunk) => tx.insert(dataImportRows).values(chunk),
        );
      }
      await tx.insert(dataImportEvents).values({
        batchId: id,
        organizationId: input.organizationId,
        actor: input.actor,
        kind: "uploaded",
        summary: `Staged ${input.filename}.`,
        payload: { sha256, status: staged.value.status },
      });
      return id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const duplicate = await findUploadByHash(input.organizationId, sha256);
      if (duplicate) return duplicate;
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The import could not be saved.",
    };
  }
  const batch = await getPostgresBatch(input.organizationId, batchId);
  if (!batch) return { ok: false, error: "The import could not be saved." };
  return { ok: true, batch, duplicate: false };
}

async function commitPostgresBatch(
  input: Parameters<ImportRepository["commit"]>[0],
): ReturnType<ImportRepository["commit"]> {
  const loaded = await getPostgresBatch(input.organizationId, input.batchId);
  if (!loaded) return { ok: false, error: "That import could not be found." };
  if (loaded.status === "completed") return { ok: true, batch: loaded, already: true };
  if (loaded.status !== "ready" || !loaded.previewHash) {
    return { ok: false, error: "Fix the row errors before committing this import." };
  }
  if (previewHash(loaded.rows) !== loaded.previewHash) {
    return { ok: false, error: "This preview no longer matches the staged rows." };
  }
  let state: ImportBatchState = { status: loaded.status, revision: loaded.revision };
  state = transitionImportBatch(state, "commit_queued");
  state = transitionImportBatch(state, "importing");
  state = transitionImportBatch(state, "completed");
  if (!input.durable) {
    await markBatch(input, state, false);
    const batch = await getPostgresBatch(input.organizationId, input.batchId);
    if (!batch) return { ok: false, error: "That import could not be found." };
    return { ok: true, batch, already: false };
  }
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.organizationId}:data-import`}, 0))`);
      const domain = await loadImportDomain(tx, input.organizationId);
      const applied = applyImportRows({
        domain,
        rows: loaded.rows,
        createId: randomUUID,
        actor: input.actor,
        passwordHash,
      });
      if (!applied.ok) throw new Error(applied.error);
      await writeImport(tx, input.organizationId, input.actor, applied.writes);
      await persistImportRowResults(tx, input.organizationId, input.batchId, applied.rowResults);
      const updated = await tx
        .update(dataImportBatches)
        .set({
          status: "completed",
          revision: state.revision,
          durable: true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(dataImportBatches.organizationId, input.organizationId),
          eq(dataImportBatches.id, input.batchId),
          eq(dataImportBatches.revision, loaded.revision),
          eq(dataImportBatches.status, "ready"),
        ))
        .returning({ id: dataImportBatches.id });
      if (!updated[0]) {
        throw new Error("This import changed while it was being committed. Refresh and try again.");
      }
      await tx.insert(dataImportEvents).values({
        batchId: input.batchId,
        organizationId: input.organizationId,
        actor: input.actor,
        kind: "committed",
        summary: "Committed the staged import.",
        payload: { rows: applied.rowResults.length },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The import could not be committed.",
    };
  }
  const batch = await getPostgresBatch(input.organizationId, input.batchId);
  if (!batch) return { ok: false, error: "That import could not be found." };
  return { ok: true, batch, already: false };
}

async function markBatch(
  input: { organizationId: string; batchId: string; actor: string },
  state: { status: ImportBatchStatus; revision: number },
  durable: boolean,
) {
  const db = getDb();
  await db
    .update(dataImportBatches)
    .set({
      status: state.status,
      revision: state.revision,
      durable,
      updatedAt: new Date(),
    })
    .where(and(
      eq(dataImportBatches.organizationId, input.organizationId),
      eq(dataImportBatches.id, input.batchId),
    ));
  await db.insert(dataImportEvents).values({
    batchId: input.batchId,
    organizationId: input.organizationId,
    actor: input.actor,
    kind: durable ? "committed" : "previewed",
    summary: durable ? "Committed the staged import." : "Previewed the import without writing live records.",
    payload: { durable },
  });
}

async function cancelPostgresBatch(
  input: Parameters<ImportRepository["cancel"]>[0],
): ReturnType<ImportRepository["cancel"]> {
  const loaded = await getPostgresBatch(input.organizationId, input.batchId);
  if (!loaded) return { ok: false, error: "That import could not be found." };
  if (loaded.status === "cancelled") return { ok: true, batch: loaded };
  let state: { status: ImportBatchStatus; revision: number };
  try {
    state = transitionImportBatch(
      { status: loaded.status, revision: loaded.revision },
      "cancelled",
    );
  } catch {
    return { ok: false, error: "This import can no longer be cancelled." };
  }
  await markBatch(input, state, false);
  const batch = await getPostgresBatch(input.organizationId, input.batchId);
  if (!batch) return { ok: false, error: "That import could not be found." };
  return { ok: true, batch };
}

type ImportTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function loadImportDomain(tx: ImportTx, organizationId: string): Promise<ImportDomain> {
  const domain = emptyImportDomain();
  const companyRows = await tx.select({
    id: companies.id,
    name: companies.name,
    email: companies.email,
    phone: companies.phone,
    city: companies.city,
    province: companies.province,
  }).from(companies).where(eq(companies.organizationId, organizationId));
  domain.companies = companyRows;
  const contactRows = await tx.select({
    id: contacts.id,
    companyId: contacts.companyId,
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    email: contacts.email,
    phone: contacts.phone,
    role: contacts.role,
  }).from(contacts).where(eq(contacts.organizationId, organizationId));
  domain.contacts = contactRows;
  const siteRows = await tx.select({
    id: sites.id,
    companyId: sites.companyId,
    name: sites.name,
    city: sites.city,
    province: sites.province,
    addressLine: sites.addressLine,
    postalCode: sites.postalCode,
  }).from(sites).where(eq(sites.organizationId, organizationId));
  domain.sites = siteRows;
  const userRows = await tx.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    active: users.active,
    passwordHash: users.passwordHash,
  }).from(users);
  domain.users = userRows;
  const membershipRows = await tx.select({
    id: memberships.id,
    userId: memberships.userId,
    role: memberships.role,
    active: memberships.active,
  }).from(memberships).where(eq(memberships.organizationId, organizationId));
  domain.memberships = membershipRows;
  const itemRows = await tx.select({
    id: priceBookItems.id,
    name: priceBookItems.name,
    trade: priceBookItems.trade,
    unit: priceBookItems.unit,
    unitPriceCents: priceBookItems.unitPriceCents,
    itemCode: priceBookItems.itemCode,
    itemKind: priceBookItems.itemKind,
    supplier: priceBookItems.supplier,
    unitCostCents: priceBookItems.unitCostCents,
    active: priceBookItems.active,
  }).from(priceBookItems).where(eq(priceBookItems.organizationId, organizationId));
  domain.priceItems = itemRows;
  const versionRows = await tx.select({
    id: priceBookItemVersions.id,
    itemId: priceBookItemVersions.itemId,
    versionNumber: priceBookItemVersions.versionNumber,
    status: priceBookItemVersions.status,
    trade: priceBookItemVersions.trade,
    description: priceBookItemVersions.description,
    unit: priceBookItemVersions.unit,
    unitPriceCents: priceBookItemVersions.unitPriceCents,
    unitCostCents: priceBookItemVersions.unitCostCents,
    contentHash: priceBookItemVersions.contentHash,
    createdBy: priceBookItemVersions.createdBy,
  }).from(priceBookItemVersions).where(eq(priceBookItemVersions.organizationId, organizationId));
  domain.priceVersions = versionRows.flatMap((version) =>
    version.status === "draft" || version.status === "approved"
      ? [{ ...version, status: version.status }]
      : [],
  );
  const opportunityRows = await tx.select({
    id: opportunities.id,
    name: opportunities.name,
    companyId: opportunities.companyId,
    contactId: opportunities.contactId,
    siteId: opportunities.siteId,
    stage: opportunities.stage,
    services: opportunities.services,
  }).from(opportunities).where(eq(opportunities.organizationId, organizationId));
  domain.opportunities = opportunityRows;
  const projectRows = await tx.select({
    id: projects.id,
    name: projects.name,
    companyId: projects.companyId,
    siteId: projects.siteId,
    opportunityId: projects.opportunityId,
    status: projects.status,
  }).from(projects).where(eq(projects.organizationId, organizationId));
  domain.projects = projectRows;
  const jobRows = await tx.select({
    id: jobs.id,
    name: jobs.name,
    projectId: jobs.projectId,
    companyId: jobs.companyId,
    siteId: jobs.siteId,
    opportunityId: jobs.opportunityId,
    status: jobs.status,
    services: jobs.services,
  }).from(jobs).where(eq(jobs.organizationId, organizationId));
  domain.jobs = jobRows;
  const assignmentRows = await tx.select({
    id: jobAssignments.id,
    jobId: jobAssignments.jobId,
    userId: jobAssignments.userId,
    role: jobAssignments.role,
  }).from(jobAssignments);
  domain.assignments = assignmentRows;
  const areaRows = await tx.select({
    id: workAreas.id,
    jobId: workAreas.jobId,
    name: workAreas.name,
  }).from(workAreas);
  domain.workAreas = areaRows;
  const taskRows = await tx.select({
    id: jobTasks.id,
    jobId: jobTasks.jobId,
    workAreaId: jobTasks.workAreaId,
    title: jobTasks.title,
  }).from(jobTasks);
  domain.tasks = taskRows;
  const keys = await tx.select({
    entityType: externalRecordKeys.entityType,
    sourceKey: externalRecordKeys.sourceKey,
    targetId: externalRecordKeys.targetId,
  }).from(externalRecordKeys).where(eq(externalRecordKeys.organizationId, organizationId));
  domain.crosswalk = keys.flatMap((key) =>
    isImportEntityType(key.entityType)
      ? [{ entityType: key.entityType, sourceKey: key.sourceKey, targetId: key.targetId }]
      : [],
  );
  return domain;
}

async function writeImport(
  tx: ImportTx,
  organizationId: string,
  actor: string,
  writes: ImportWrite,
) {
  await insertInChunks(writes.companies.map((company) => ({
    id: company.id,
    organizationId,
    name: company.name,
    email: company.email,
    phone: company.phone,
    city: company.city,
    province: company.province,
  })), (chunk) => tx.insert(companies).values(chunk));
  for (const company of writes.companyUpdates) {
    await tx.update(companies).set({
      email: company.email,
      phone: company.phone,
      city: company.city,
      province: company.province,
      updatedAt: new Date(),
    }).where(and(eq(companies.id, company.id), eq(companies.organizationId, organizationId)));
  }
  await insertInChunks(writes.contacts.map((contact) => ({
    id: contact.id,
    organizationId,
    companyId: contact.companyId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
  })), (chunk) => tx.insert(contacts).values(chunk));
  await insertInChunks(writes.sites.map((site) => ({
    id: site.id,
    organizationId,
    companyId: site.companyId,
    name: site.name,
    city: site.city,
    province: site.province,
    addressLine: site.addressLine,
    postalCode: site.postalCode,
  })), (chunk) => tx.insert(sites).values(chunk));
  await insertInChunks(writes.users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    active: false,
    createdBy: actor,
  })), (chunk) => tx.insert(users).values(chunk));
  await insertInChunks(writes.memberships.map((membership) => ({
    id: membership.id,
    organizationId,
    userId: membership.userId,
    role: membership.role,
    active: false,
  })), (chunk) => tx.insert(memberships).values(chunk));
  await insertInChunks(writes.priceItems.map((item) => ({
    id: item.id,
    organizationId,
    trade: item.trade,
    name: item.name,
    unit: item.unit,
    unitPriceCents: item.unitPriceCents,
    itemCode: item.itemCode,
    itemKind: item.itemKind,
    supplier: item.supplier,
    unitCostCents: item.unitCostCents,
    active: true,
    createdBy: actor,
  })), (chunk) => tx.insert(priceBookItems).values(chunk));
  await insertInChunks(writes.priceVersions.map((version) => ({
    id: version.id,
    organizationId,
    itemId: version.itemId,
    versionNumber: version.versionNumber,
    trade: version.trade,
    description: version.description,
    unit: version.unit,
    unitPriceCents: version.unitPriceCents,
    unitCostCents: version.unitCostCents,
    status: "draft" as const,
    createdBy: actor,
    contentHash: version.contentHash,
  })), (chunk) => tx.insert(priceBookItemVersions).values(chunk));
  await insertInChunks(writes.opportunities.map((opportunity) => ({
    id: opportunity.id,
    organizationId,
    name: opportunity.name,
    companyId: opportunity.companyId,
    contactId: opportunity.contactId,
    siteId: opportunity.siteId,
    stage: opportunity.stage,
    services: opportunity.services,
  })), (chunk) => tx.insert(opportunities).values(chunk));
  await insertInChunks(writes.projects.map((project) => ({
    id: project.id,
    organizationId,
    name: project.name,
    companyId: project.companyId,
    siteId: project.siteId,
    opportunityId: project.opportunityId,
    status: project.status,
  })), (chunk) => tx.insert(projects).values(chunk));
  await insertInChunks(writes.jobs.map((job) => ({
    id: job.id,
    organizationId,
    name: job.name,
    projectId: job.projectId,
    companyId: job.companyId,
    siteId: job.siteId,
    opportunityId: job.opportunityId,
    status: job.status,
    scope: null,
    services: job.services,
  })), (chunk) => tx.insert(jobs).values(chunk));
  await insertInChunks(writes.assignments.map((assignment) => ({
    id: assignment.id,
    jobId: assignment.jobId,
    userId: assignment.userId,
    role: assignment.role,
    createdBy: actor,
  })), (chunk) => tx.insert(jobAssignments).values(chunk));
  await insertInChunks(writes.workAreas.map((area) => ({
    id: area.id,
    jobId: area.jobId,
    name: area.name,
  })), (chunk) => tx.insert(workAreas).values(chunk));
  await insertInChunks(writes.tasks.map((task) => ({
    id: task.id,
    jobId: task.jobId,
    workAreaId: task.workAreaId,
    title: task.title,
    createdBy: actor,
  })), (chunk) => tx.insert(jobTasks).values(chunk));
  await insertInChunks(writes.crosswalk.map((key) => ({
    organizationId,
    sourceSystem: "spreadsheet",
    entityType: key.entityType as ImportEntityType,
    sourceKey: key.sourceKey,
    targetId: key.targetId,
  })), (chunk) => tx.insert(externalRecordKeys).values(chunk));
}
