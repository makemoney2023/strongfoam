# Supabase Data Import Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Strong Foam's spreadsheet-based customers, workforce, price
book, opportunities, projects, jobs, assignments, work areas, and tasks into
Supabase PostgreSQL through a validated, idempotent, administrator-approved
workflow.

**Architecture:** Upload XLSX/CSV files directly to a private Supabase Storage
bucket, then use the existing Render/pg-boss worker to scan, parse, normalize,
and stage rows in a non-exposed PostgreSQL schema. Office users may map and
validate; administrators authorize an exact staged revision. A
transaction-capable worker revalidates and commits the whole bounded batch in
one PostgreSQL transaction, writes durable source-key crosswalks, and generates
a reconciliation report.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM,
Supabase PostgreSQL and private Storage, Render worker, pg-boss, Zod 4,
ExcelJS, yauzl, Vitest, Tailwind 4, existing shadcn/ui components.

---

## Source requirements

- Design:
  `docs/superpowers/specs/2026-09-22-data-import-center-design.md`
- Product architecture:
  `docs/strongfoam-crm-erp-prd.md`, IMP-001 through IMP-030 in section 21.1,
  plus sections 7, 8, 16, 23, and 24.
- Existing database and stores:
  - `src/db/index.ts`
  - `src/db/schema.ts`
  - `src/lib/ops/store.ts`
  - `src/lib/ops/demo-store.ts`
- Existing identity and authorization:
  - `src/lib/ops/auth.ts`
  - `src/lib/ops/identity.ts`
  - `src/app/app/users/actions.ts`
  - `src/app/app/users/actions.test.ts`
- Existing durable work:
  - `src/lib/ops/background-jobs.ts`
  - `src/worker/index.ts`
  - `src/worker/registry.ts`
- Existing commercial and audit records:
  - `src/lib/ops/price-book.ts`
  - `src/lib/ops/price-book.test.ts`
  - `src/lib/ops/audit.ts`
- Existing upload security patterns:
  - `src/app/api/ops/opportunity-uploads/route.ts`
  - `src/lib/ops/commercial-documents.ts`
  - `src/worker/clamav.ts`
- Current Supabase guidance:
  - Private buckets and object-scoped signed uploads.
  - No secret/service key in public code.
  - Non-exposed/private schema for staging.
  - Separate pooled runtime, worker, and migration connections.
  - RLS or revoked exposed-role access as defense in depth.
- Before adding App Router pages, route handlers, or server actions, read the
  corresponding guide in
  `node_modules/next/dist/docs/01-app/03-api-reference/`.

## Global constraints

- Supabase is provisioned, but the work is incomplete until production
  `DATABASE_URL` points to Supabase and `OPS_DEMO` is disabled.
- Drizzle remains the repository's only schema/migration source of truth. Do
  not create a second, competing migration stream.
- Reserve `0024` and `0025` for the existing commercial plan. Import migrations
  begin at `0026`.
- Upload, analysis, mapping, validation, and preview create no business record.
- Office may prepare imports. Only administrators commit.
- Field roles cannot access imports.
- Organization comes from the live session and stored batch.
- Every source file stays private.
- Scan every workbook before parsing.
- Bound XLSX entry count and total uncompressed bytes.
- Never evaluate spreadsheet formulas.
- Never accept a password column.
- Never automatically activate imported workforce users.
- Never fuzzy-merge records.
- Never infer deletion or deactivation from an omitted row.
- Imported prices create drafts; approved revisions remain immutable.
- Import sends no notification, proposal, email, or customer message.
- Release 1 commits no more than 25,000 rows in one transaction.
- Tests do not call Supabase or the network.
- Use latest package versions when adding dependencies.
- Use one logical commit per task.
- Do not stage `.playwright-mcp/`.

## Environment contract

```text
DATABASE_URL                         Supabase pooled application connection
WORKER_DATABASE_URL                  Supabase worker/session-compatible connection
DIRECT_URL                           Supabase direct migration connection
NEXT_PUBLIC_SUPABASE_URL             Public project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY Browser-safe publishable key
SUPABASE_SECRET_KEY                  Server/worker only
SUPABASE_IMPORT_BUCKET               data-imports
IMPORT_RETENTION_DAYS                30
```

No `NEXT_PUBLIC_` variable may contain a secret key.

## Commit convention

Every commit uses:

```bash
GIT_AUTHOR_NAME="makemoney2023" \
GIT_AUTHOR_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
GIT_COMMITTER_NAME="makemoney2023" \
GIT_COMMITTER_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
git commit -m "Commit message"

git log -1 --format='%an <%ae>'
```

The author check must print:

```text
makemoney2023 <124006256+makemoney2023@users.noreply.github.com>
```

## Migration sequence

| Migration | Purpose |
|---|---|
| `0026_data_import_foundation.sql` | Private import batches, sheets, rows, profiles, crosswalks, events, constraints, and grants |
| `0027_price_book_cost_codes.sql` | Stable item codes, item kind, supplier, and immutable unit-cost snapshots |
| `0028_import_domain_keys.sql` | Additive site address fields and indexes required by exact import matching |

All migrations are additive. Keep the existing mutable
`price_book_items.unit_price_cents` field during expand/contract and continue
to treat it as selling price. Do not drop or rewrite approved revisions.

## File structure

| Path | Responsibility |
|---|---|
| `src/db/config.ts` | Validate pooled, worker, direct, and Supabase environment |
| `src/db/index.ts` | Transaction-capable Drizzle PostgreSQL client |
| `src/db/schema.ts` | Public domain tables and private import schema |
| `src/lib/ops/import-authorization.ts` | Prepare/commit permission resolution |
| `src/lib/ops/import-contract.ts` | Entity, sheet, field, status, and mapping types |
| `src/lib/ops/import-normalizers.ts` | Money, email, code, date, enum, and boolean normalization |
| `src/lib/ops/import-workbook.ts` | XLSX/CSV signature, ZIP bounds, formula rejection, and row extraction |
| `src/lib/ops/import-validation.ts` | Cross-sheet references, duplicate proposals, errors, warnings, row hashes |
| `src/lib/ops/import-commit.ts` | Pure commit plan, dependency ordering, idempotency, advisory lock contract |
| `src/lib/ops/import-adapters/*.ts` | Entity-specific create/update/skip operations |
| `src/lib/ops/import-storage.ts` | Supabase private object operations and object-path validation |
| `src/lib/ops/import-store.ts` | Import staging and transaction persistence |
| `src/worker/handlers/analyze-import.ts` | Scan, parse, checkpoint, and stage workbook |
| `src/worker/handlers/commit-import.ts` | Revalidate and apply an authorized batch transactionally |
| `src/worker/handlers/retain-import.ts` | Delete expired objects/raw rows and record retention events |
| `src/app/api/ops/import-uploads/route.ts` | Signed upload request and completion |
| `src/app/app/imports/page.tsx` | Batch list, template downloads, and upload entry |
| `src/app/app/imports/[batchId]/page.tsx` | Mapping, validation, conflict, preview, commit, and report |
| `src/app/app/imports/actions.ts` | Mapping, validation, conflict resolution, cancel, commit authorization |
| `src/components/ops/import-*.tsx` | Focused Import Center client components |
| `src/app/api/ops/imports/[batchId]/report/route.ts` | Authorized reconciliation CSV download |
| `src/app/api/ops/imports/template/route.ts` | Canonical XLSX/CSV templates |

---

## Phase A — Supabase runtime and import authority

### Task 1: Use transaction-capable Supabase PostgreSQL connections

**Files:**
- Create: `src/db/config.ts`
- Create: `src/db/config.test.ts`
- Modify: `src/db/index.ts`
- Modify: `src/worker/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `README.md`

- [x] **Step 1: Add failing database configuration tests**

Test that:

```ts
expect(parseDatabaseConfig({})).toEqual({
  ok: false,
  error: "DATABASE_URL is not set",
});

expect(
  parseDatabaseConfig({
    DATABASE_URL: "postgres://app",
    WORKER_DATABASE_URL: "postgres://worker",
    DIRECT_URL: "postgres://direct",
  }),
).toEqual({
  ok: true,
  value: {
    appUrl: "postgres://app",
    workerUrl: "postgres://worker",
    directUrl: "postgres://direct",
  },
});
```

Also assert secret values never appear in an error string.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/db/config.test.ts
```

Expected: FAIL because `src/db/config.ts` does not exist.

- [x] **Step 3: Install the latest transaction-capable driver**

```bash
npm install postgres@latest
```

Keep `@neondatabase/serverless` until all callers build with the new driver,
then remove it in this task with:

```bash
npm uninstall @neondatabase/serverless
```

- [x] **Step 4: Implement validated connection configuration**

Export:

```ts
export type DatabaseConfig = {
  appUrl: string;
  workerUrl: string;
  directUrl: string;
};

export function parseDatabaseConfig(
  env: NodeJS.ProcessEnv,
):
  | { ok: true; value: DatabaseConfig }
  | { ok: false; error: string };
```

`WORKER_DATABASE_URL` and `DIRECT_URL` may fall back to `DATABASE_URL` only in
local development. Production fails closed when either is absent.

- [x] **Step 5: Replace the Neon HTTP Drizzle driver**

Use `postgres` with `drizzle-orm/postgres-js`. Configure the pooled application
client with prepared statements disabled when required by the Supabase
transaction pooler. Export a transaction-capable `getDb()`.

Update the Render worker to use `WORKER_DATABASE_URL` for pg-boss rather than
`DATABASE_URL`.

- [x] **Step 6: Document environment and migration behavior**

Document that application traffic uses the pooler, workers use the
worker-compatible URL, and migrations use `DIRECT_URL`. Supabase project
credentials remain outside the repository.

- [x] **Step 7: Run checks**

```bash
npx vitest run src/db/config.test.ts src/app/app/users/actions.test.ts
npx tsc --noEmit
npm test
```

Expected: all tests pass, including existing transaction-backed user actions.

- [x] **Step 8: Commit**

Commit message: `Connect transactional domain writes to Supabase Postgres.`

### Task 2: Add import permissions and organization authority

**Files:**
- Create: `src/lib/ops/import-authorization.ts`
- Create: `src/lib/ops/import-authorization.test.ts`
- Modify: `src/lib/ops/identity.ts`
- Modify: `src/components/ops/app-sidebar.tsx`

- [ ] **Step 1: Write failing permission tests**

Cover:

```ts
expect(resolveImportAccess(admin, "data.import.prepare").ok).toBe(true);
expect(resolveImportAccess(admin, "data.import.commit").ok).toBe(true);
expect(resolveImportAccess(office, "data.import.prepare").ok).toBe(true);
expect(resolveImportAccess(office, "data.import.commit").ok).toBe(false);
expect(resolveImportAccess(field, "data.import.prepare").ok).toBe(false);
```

Pass a claimed organization and assert the resolver still returns the session
organization.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-authorization.test.ts
```

Expected: FAIL because the permission resolver does not exist.

- [ ] **Step 3: Implement the permission contract**

Add:

```ts
export const DATA_IMPORT_PERMISSIONS = [
  "data.import.prepare",
  "data.import.commit",
] as const;
```

Administrators receive both. Office receives prepare. Field roles receive
neither. `resolveImportAccess` mirrors commercial authorization and ignores
claimed organization input.

- [ ] **Step 4: Add the Import Center navigation item**

Show `/app/imports` only when `data.import.prepare` resolves successfully.
Do not render a disabled link for field roles.

- [ ] **Step 5: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-authorization.test.ts
npx tsc --noEmit
```

Commit message: `Authorize organization-scoped data imports.`

---

## Phase B — Import records and price-book cost model

### Task 3: Add private import staging and crosswalk schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0026_data_import_foundation.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `src/lib/ops/import-contract.ts`
- Create: `src/lib/ops/import-contract.test.ts`
- Create: `src/lib/ops/import-store.ts`
- Create: `src/lib/ops/import-store.test.ts`

- [ ] **Step 1: Write failing contract tests**

Assert finite allowlists for:

```ts
DATA_IMPORT_ENTITY_TYPES
DATA_IMPORT_BATCH_STATUSES
DATA_IMPORT_ROW_STATUSES
DATA_IMPORT_OPERATIONS
```

Required entity types:

```ts
[
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
]
```

Test legal transitions, including `ready → commit_queued → importing →
completed`, and reject `invalid → completed`. Add store tests that verify every
batch, sheet, row, profile, crosswalk, and event query requires organization
scope.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-contract.test.ts src/lib/ops/import-store.test.ts
```

Expected: FAIL because the contract does not exist.

- [ ] **Step 3: Define the private schema**

Add a Drizzle `pgSchema("private")` and tables:

```text
data_import_batches
data_import_sheets
data_import_rows
data_import_mapping_profiles
external_record_keys
data_import_events
```

Constraints:

- Unique organization/idempotency key on batches.
- Unique batch/sheet/row number.
- Unique organization/source/entity/source key crosswalk.
- Foreign keys from sheets, rows, and events to batch.
- Check constraints for statuses, operations, and supported entities.
- Batch `revision` integer for optimistic updates.
- JSON payload fields for mapping, normalized values, diagnostics, and counts.

- [ ] **Step 4: Write the migration**

Create the private schema, tables, indexes, and append-only trigger for import
events. Revoke all privileges on `private` from `anon` and `authenticated`.
Grant only the reviewed runtime, worker, and migration roles configured for
the deployment.

Do not expose a view over raw import rows.

- [ ] **Step 5: Implement transition, limit, and staging persistence**

Export:

```ts
export function transitionImportBatch(
  batch: ImportBatchState,
  next: ImportBatchStatus,
): ImportBatchState;

export function validateImportLimits(input: {
  fileBytes: number;
  sheetCount: number;
  rowCount: number;
}): { ok: true } | { ok: false; error: string };
```

Limits are 25 MB, 15 supported sheets, and 25,000 rows.

`import-store.ts` exposes organization-scoped batch CRUD, optimistic revision
updates, staged sheet/row replacement, profile lookup, crosswalk lookup, and
append-only event writes. Every function takes `organizationId`; no caller can
list or load a batch by UUID alone.

- [ ] **Step 6: Validate schema and commit**

```bash
npx vitest run src/lib/ops/import-contract.test.ts src/lib/ops/import-store.test.ts
npx tsx -e "import './src/db/schema.ts'"
npx tsc --noEmit
```

Commit message: `Add private import staging and source crosswalks.`

### Task 4: Add product codes, kinds, costs, and draft import behavior

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0027_price_book_cost_codes.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/lib/ops/price-book.ts`
- Modify: `src/lib/ops/price-book.test.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/app/app/price-book/page.tsx`
- Modify: `src/app/app/price-book/price-book-dialog.tsx`
- Modify: `src/app/app/price-book/actions.ts`

- [ ] **Step 1: Write failing price-book tests**

Cover:

- Item code normalization and organization uniqueness.
- Item kinds: material, labour, equipment, subcontractor, allowance.
- Nullable non-negative unit cost.
- Existing `unit_price_cents` remains selling price.
- Changed imported values produce one draft.
- An unchanged import is skipped.
- An approved version cannot be updated or deleted.
- Estimate lookup still returns approved selling price.

Use this vector:

```ts
{
  itemCode: "LAB-SPF-LEAD",
  itemKind: "labour",
  unit: "hour",
  unitCostCents: 4200,
  unitPriceCents: 6800,
}
```

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/price-book.test.ts
```

Expected: FAIL because cost/code fields do not exist.

- [ ] **Step 3: Expand logical items and immutable revisions**

Add:

```text
price_book_items.item_code
price_book_items.item_kind
price_book_items.supplier
price_book_item_versions.item_code
price_book_item_versions.item_kind
price_book_item_versions.supplier
price_book_item_versions.unit_cost_cents
```

Backfill existing items with deterministic codes derived once in migration,
such as `LEGACY-{short-id}`, item kind `material`, supplier null, and cost null.
Create a unique organization/item-code index after backfill.

- [ ] **Step 4: Extend parsing and content hashes**

Approved revision content hashes must include code, kind, supplier, cost, and
selling price. Draft approval copies all current approved values onto the
logical item while retaining the immutable revision.

- [ ] **Step 5: Extend the Price Book UI**

Show and edit code, kind, supplier, internal cost, and selling price. Label cost
as internal. Administrators approve the whole exact draft. Office users cannot
approve.

- [ ] **Step 6: Run checks and commit**

```bash
npx vitest run src/lib/ops/price-book.test.ts src/lib/ops/estimates.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Track product codes and approved cost revisions.`

### Task 5: Add import-specific site fields and exact indexes

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0028_import_domain_keys.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/lib/ops/crm.ts`
- Modify: `src/lib/ops/crm.test.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`

- [ ] **Step 1: Write failing address and exact-match tests**

Test normalization and persistence for:

```ts
{
  addressLine1: "125 Industrial Rd",
  addressLine2: "Unit 4",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2J 4G8",
  country: "CA",
}
```

Assert contact and user exact email lookup lowercases and trims without fuzzy
matching.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/crm.test.ts
```

Expected: FAIL for missing address fields.

- [ ] **Step 3: Add fields and indexes**

Add site address columns and organization-scoped normalized lookup indexes
needed by the import validator. Do not add uniqueness constraints to company
or project names.

- [ ] **Step 4: Run checks and commit**

```bash
npx vitest run src/lib/ops/crm.test.ts
npx tsc --noEmit
```

Commit message: `Add import-ready customer site addresses.`

---

## Phase C — Workbook ingestion and validation

### Task 6: Parse bounded XLSX and CSV workbooks

**Files:**
- Create: `src/lib/ops/import-workbook.ts`
- Create: `src/lib/ops/import-workbook.test.ts`
- Create: `src/lib/ops/import-normalizers.ts`
- Create: `src/lib/ops/import-normalizers.test.ts`
- Create: `src/lib/ops/import-fixtures.ts`
- Create: `src/lib/ops/__fixtures__/full-import.xlsx`
- Create: `src/lib/ops/__fixtures__/companies.csv`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Install current parser dependencies**

```bash
npm install exceljs@latest yauzl@latest
npm install --save-dev @types/yauzl@latest
```

Keep both packages server-only through `serverExternalPackages`.

- [ ] **Step 2: Write failing archive and parser tests**

Cover:

- Valid XLSX sheets and row numbers.
- UTF-8 CSV with quoted commas and CRLF.
- Extension/signature mismatch.
- Legacy `.xls`.
- Password-protected workbook.
- Formula without cached scalar value.
- More than 15 supported sheets.
- More than 25,000 rows.
- More than 5,000 ZIP entries.
- More than 250 MB total uncompressed ZIP bytes.
- Path traversal ZIP entry.
- Blank rows ignored without changing source row numbers.

- [ ] **Step 3: Write failing normalizer tests**

Use exact vectors:

```ts
normalizeCode(" cust-0042 ") === "CUST-0042"
normalizeEmail(" Admin@StrongFoam.CA ") === "admin@strongfoam.ca"
normalizeMoney("$1,234.50") === 123450
normalizeBoolean("yes") === true
normalizeProvince("Ontario") === "ON"
```

Reject three-decimal money, unsupported statuses, ambiguous dates, and unknown
roles.

- [ ] **Step 4: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-workbook.test.ts src/lib/ops/import-normalizers.test.ts
```

Expected: FAIL because parser and normalizers do not exist.

- [ ] **Step 5: Implement the canonical parser**

Export:

```ts
export type WorkbookSheet = {
  name: string;
  headers: string[];
  rows: Array<{ sourceRow: number; values: Record<string, unknown> }>;
};

export async function parseImportWorkbook(input: {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<
  | { ok: true; sheets: WorkbookSheet[]; sha256: string }
  | { ok: false; error: string }
>;
```

Inspect XLSX ZIP bounds before ExcelJS loads the workbook. Return scalar values
only. Do not evaluate formulas.

- [ ] **Step 6: Implement deterministic normalizers**

Normalizers return field-scoped errors rather than throwing. Date parsing
requires an explicit workbook profile format; do not guess between `MM/DD` and
`DD/MM`.

- [ ] **Step 7: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-workbook.test.ts src/lib/ops/import-normalizers.test.ts
npx tsc --noEmit
```

Commit message: `Parse bounded import workbooks deterministically.`

### Task 7: Upload imports privately and analyze in the worker

**Files:**
- Create: `src/lib/ops/import-storage.ts`
- Create: `src/lib/ops/import-storage.test.ts`
- Create: `src/app/api/ops/import-uploads/route.ts`
- Create: `src/app/api/ops/import-uploads/route.test.ts`
- Create: `src/worker/handlers/analyze-import.ts`
- Create: `src/worker/handlers/analyze-import.test.ts`
- Modify: `src/worker/registry.ts`
- Modify: `src/lib/ops/import-store.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`

- [ ] **Step 1: Install the current Supabase client**

```bash
npm install @supabase/supabase-js@latest
```

- [ ] **Step 2: Write failing object-path and upload tests**

Assert:

- No session returns 401.
- Field session returns 403.
- Office can request one object-scoped upload.
- Claimed organization is ignored.
- Object path begins with live organization and batch UUID.
- Unsupported type or size returns 400.
- Missing Supabase configuration returns 503.
- Completion verifies stored metadata before creating a batch.
- Cross-organization completion is rejected and the object is deleted.

- [ ] **Step 3: Write failing analysis tests**

Inject storage, scanner, parser, and staging dependencies. Assert:

- Malware scan occurs before parser invocation.
- Malware-positive bytes never reach the parser.
- Workbook analysis writes no company, user, product, project, or job.
- Worker checkpoint records the last completed sheet and source row.
- Retry resumes after the checkpoint.
- Successful analysis reaches `needs_mapping` or `ready`.

- [ ] **Step 4: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-storage.test.ts src/app/api/ops/import-uploads/route.test.ts src/worker/handlers/analyze-import.test.ts
```

- [ ] **Step 5: Implement private storage and route handler**

Create server-only clients. The browser receives only the public project URL,
publishable key, object path, and short-lived signed upload token. The route
stores no secret in its response.

- [ ] **Step 6: Register the analysis worker**

Register:

```ts
"data-import.analyze": handleAnalyzeImport
```

The handler downloads, scans, parses, checkpoints, and writes staged
sheet/header/row records through `import-store.ts`.

- [ ] **Step 7: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-storage.test.ts src/app/api/ops/import-uploads/route.test.ts src/worker/handlers/analyze-import.test.ts
npx tsc --noEmit
```

Commit message: `Analyze private Supabase import uploads durably.`

### Task 8: Map, normalize, validate, and resolve conflicts

**Files:**
- Create: `src/lib/ops/import-validation.ts`
- Create: `src/lib/ops/import-validation.test.ts`
- Create: `src/lib/ops/import-mappings.ts`
- Create: `src/lib/ops/import-mappings.test.ts`
- Modify: `src/lib/ops/import-store.ts`
- Create: `src/app/app/imports/actions.ts`
- Create: `src/app/app/imports/actions.test.ts`

- [ ] **Step 1: Write mapping tests**

Cover required fields for every canonical sheet. Assert header signatures are
case/space insensitive and mapping profiles never contain row values.

Use a profile that maps:

```ts
{
  "Customer ID": "company_code",
  "Customer Name": "name",
  "Province/State": "province",
}
```

- [ ] **Step 2: Write validation tests**

Cover:

- Duplicate source key in one sheet.
- Exact crosswalk update.
- Exact normalized user/contact email.
- Suggested company-name match remains a conflict.
- Missing company for contact/site.
- Missing project for job.
- Missing worker for assignment.
- Price cost greater than selling price produces a warning, not an error.
- Unknown role/status/service/trade/unit/item kind.
- Correct create/update/skip operation.
- Stable row hash.
- No errors produces `ready`; any error produces `invalid`.

- [ ] **Step 3: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-mappings.test.ts src/lib/ops/import-validation.test.ts src/app/app/imports/actions.test.ts
```

- [ ] **Step 4: Implement mapping and validation**

Export:

```ts
export function validateImportBatch(input: {
  batch: ImportBatchSnapshot;
  mappings: ImportSheetMapping[];
  crosswalks: ExternalRecordKey[];
  exactTargets: ImportExactTargetIndex;
}): ImportValidationResult;
```

The result contains row diagnostics, normalized payloads, row hashes, counts,
and one validation hash.

- [ ] **Step 5: Implement server actions**

Actions:

```text
saveImportMapping
saveImportMappingProfile
validateImportBatchAction
resolveImportConflict
cancelImportBatch
authorizeImportCommit
```

Every action reloads session, permission, organization, batch revision, and
status. Conflict resolution stores only a selected target UUID or create-new
decision; it cannot replace normalized payload from the browser.

- [ ] **Step 6: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-mappings.test.ts src/lib/ops/import-validation.test.ts src/app/app/imports/actions.test.ts
npx tsc --noEmit
```

Commit message: `Validate and resolve spreadsheet imports before commit.`

---

## Phase D — Transactional entity adapters

### Task 9: Build the transactional commit coordinator

**Files:**
- Create: `src/lib/ops/import-commit.ts`
- Create: `src/lib/ops/import-commit.test.ts`
- Modify: `src/lib/ops/import-store.ts`
- Create: `src/worker/handlers/commit-import.ts`
- Create: `src/worker/handlers/commit-import.test.ts`
- Modify: `src/worker/registry.ts`

- [ ] **Step 1: Write pure commit-plan tests**

Assert dependency order and reject:

- Batch not `commit_queued`.
- Wrong expected revision.
- Changed validation hash.
- Changed row hash.
- More than 25,000 rows.
- Error or conflict row.
- Cross-organization target.

Assert repeated idempotency key returns the original completed result.

- [ ] **Step 2: Write transaction failure tests**

Use an in-memory transaction adapter that records operations. Inject failure on
the tenth write and assert:

```ts
expect(result).toEqual({ ok: false, error: "injected" });
expect(adapter.committed).toBe(false);
expect(adapter.visibleWrites).toEqual([]);
```

Assert one organization advisory lock and one transaction wrap the whole
commit.

- [ ] **Step 3: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-commit.test.ts src/worker/handlers/commit-import.test.ts
```

- [ ] **Step 4: Implement the coordinator**

Export:

```ts
export type ImportEntityAdapter = {
  entityType: DataImportEntityType;
  apply(
    tx: ImportTransaction,
    row: ValidatedImportRow,
    context: ImportCommitContext,
  ): Promise<ImportApplyResult>;
};

export async function commitValidatedImport(
  input: CommitImportInput,
  deps: CommitImportDependencies,
): Promise<CommitImportResult>;
```

The worker starts a transaction, executes
`pg_advisory_xact_lock` using the organization ID, reloads the batch and rows,
applies adapters in canonical order, writes crosswalks and events, and commits
the final report.

- [ ] **Step 5: Register the commit worker**

Register:

```ts
"data-import.commit": handleCommitImport
```

Authorization action writes commit actor, revision, validation hash, and
idempotency key before enqueue. The worker never accepts an actor or
organization directly from job payload without reloading the batch.

- [ ] **Step 6: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-commit.test.ts src/worker/handlers/commit-import.test.ts
npx tsc --noEmit
```

Commit message: `Commit validated imports atomically and idempotently.`

### Task 10: Import companies, contacts, sites, and price-book drafts

**Files:**
- Create: `src/lib/ops/import-adapters/companies.ts`
- Create: `src/lib/ops/import-adapters/companies.test.ts`
- Create: `src/lib/ops/import-adapters/contacts.ts`
- Create: `src/lib/ops/import-adapters/contacts.test.ts`
- Create: `src/lib/ops/import-adapters/sites.ts`
- Create: `src/lib/ops/import-adapters/sites.test.ts`
- Create: `src/lib/ops/import-adapters/price-book.ts`
- Create: `src/lib/ops/import-adapters/price-book.test.ts`
- Modify: `src/lib/ops/import-commit.ts`

- [ ] **Step 1: Write customer adapter tests**

Assert:

- New source key creates one company and crosswalk.
- Existing crosswalk updates allowed fields.
- Same source key replay skips unchanged payload.
- Contact links to company crosswalk.
- Site links to company and stores full address.
- Missing parent fails before transaction application.
- Suggested same-name company never auto-merges.

- [ ] **Step 2: Write price-book adapter tests**

Assert:

- New code creates logical item plus draft version.
- Existing unchanged draft skips.
- Changed spreadsheet creates/updates one open draft.
- Approved revision remains byte-for-byte unchanged.
- Existing differing open draft is a conflict.
- Generic labour rate stores kind `labour` and unit `hour`.

- [ ] **Step 3: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-adapters/companies.test.ts src/lib/ops/import-adapters/contacts.test.ts src/lib/ops/import-adapters/sites.test.ts src/lib/ops/import-adapters/price-book.test.ts
```

- [ ] **Step 4: Implement adapters**

Adapters may write only through the supplied transaction. They return:

```ts
type ImportApplyResult = {
  operation: "created" | "updated" | "skipped";
  targetId: string;
  summary: string;
};
```

Never call normal actions that send notifications or create unrelated events.

- [ ] **Step 5: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-adapters/companies.test.ts src/lib/ops/import-adapters/contacts.test.ts src/lib/ops/import-adapters/sites.test.ts src/lib/ops/import-adapters/price-book.test.ts
npx tsc --noEmit
```

Commit message: `Import customer and price-book master data.`

### Task 11: Import workforce safely

**Files:**
- Create: `src/lib/ops/import-adapters/workforce.ts`
- Create: `src/lib/ops/import-adapters/workforce.test.ts`
- Modify: `src/lib/ops/import-commit.ts`
- Modify: `src/app/app/users/page.tsx`
- Modify: `src/app/app/users/actions.ts`
- Modify: `src/app/app/users/actions.test.ts`

- [ ] **Step 1: Write workforce adapter tests**

Cover:

- Existing normalized email maps to the stable user UUID.
- New worker creates inactive user and inactive membership.
- Password-like source columns are rejected during validation.
- Import never creates a Supabase Auth user.
- Missing worker from later import does not deactivate the account.
- Role change obeys field-assignment protections.
- Creating an administrator produces an explicit warning confirmation.
- Last administrator protections remain intact.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-adapters/workforce.test.ts src/app/app/users/actions.test.ts
```

- [ ] **Step 3: Implement inactive imported identities**

Use stable application users and memberships. Store a cryptographically random
unusable password hash for a new inactive local-auth record. Record
`user_imported_pending_activation` in `user_events`. Do not return or display
the random credential.

- [ ] **Step 4: Add activation affordance**

On `/app/users`, label imported accounts **Pending activation**. The existing
administrator password reset and activation flow is the only local-auth path
that makes the account usable. Keep Supabase Auth invitations outside this
plan.

- [ ] **Step 5: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-adapters/workforce.test.ts src/app/app/users/actions.test.ts
npx tsc --noEmit
```

Commit message: `Import inactive workforce identities safely.`

### Task 12: Import opportunities, projects, jobs, assignments, areas, and tasks

**Files:**
- Create: `src/lib/ops/import-adapters/opportunities.ts`
- Create: `src/lib/ops/import-adapters/projects.ts`
- Create: `src/lib/ops/import-adapters/jobs.ts`
- Create: `src/lib/ops/import-adapters/job-assignments.ts`
- Create: `src/lib/ops/import-adapters/work-areas.ts`
- Create: `src/lib/ops/import-adapters/job-tasks.ts`
- Create: `src/lib/ops/import-adapters/operations.test.ts`
- Modify: `src/lib/ops/import-commit.ts`

- [ ] **Step 1: Write operational graph tests**

Fixture:

```text
2 companies
2 sites
3 workers
2 opportunities
2 projects
3 jobs
5 assignments
7 work areas
18 tasks
```

Assert every foreign key resolves through current-batch or prior crosswalks.
Assert statuses, services, dates, foreman, assignee, and quantities map
exactly.

- [ ] **Step 2: Write prohibited-side-effect tests**

After commit, assert zero new:

```text
estimates
estimate_versions
estimate_approvals
proposals
estimate_acceptances
estimate_conversions
outbound notifications
```

Also assert imported projects/jobs do not emit customer or field messages.

- [ ] **Step 3: Run and verify failure**

```bash
npx vitest run src/lib/ops/import-adapters/operations.test.ts
```

- [ ] **Step 4: Implement adapters in dependency order**

Resolve optional relationships only when a valid source key exists. An
opportunity/project link is applied only when both records belong to the same
organization and are crosswalked. Job assignments require imported or existing
stable user IDs.

- [ ] **Step 5: Run checks and commit**

```bash
npx vitest run src/lib/ops/import-adapters/operations.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Import linked project and job operations.`

---

## Phase E — Import Center, reports, and operations

### Task 13: Ship the Import Center UI

**Files:**
- Create: `src/app/app/imports/page.tsx`
- Create: `src/app/app/imports/[batchId]/page.tsx`
- Create: `src/components/ops/import-uploader.tsx`
- Create: `src/components/ops/import-sheet-mapper.tsx`
- Create: `src/components/ops/import-validation-summary.tsx`
- Create: `src/components/ops/import-conflict-table.tsx`
- Create: `src/components/ops/import-commit-panel.tsx`
- Create: `src/components/ops/import-status.tsx`
- Create: `src/lib/ops/import-demo.ts`
- Create: `src/lib/ops/import-demo.test.ts`
- Modify: `src/components/ops/app-sidebar.tsx`
- Modify: `src/app/app/imports/actions.test.ts`

- [ ] **Step 1: Write action authorization and stale-revision tests**

Cover anonymous redirect, field denial, office prepare, office commit denial,
administrator commit, wrong organization, stale revision, invalid batch,
unresolved conflict, and replayed idempotency key.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/app/app/imports/actions.test.ts
```

- [ ] **Step 3: Build the batch list and upload**

Show filename, source system, uploader, status, row counts, timestamps, and a
link to the batch. Upload copy states:

> Uploading and validating a spreadsheet creates no customers, users, prices,
> projects, or jobs. An administrator reviews and commits the exact preview.

When `OPS_DEMO=1`, offer a bundled synthetic preview through
`import-demo.ts`. Label it **Demo preview — nothing is durable** and disable
commit. Do not upload to Supabase or call the network in this mode.

- [ ] **Step 4: Build mapping and validation**

Show source headers, canonical fields, constants, value mappings, required
markers, sample scalar values, row errors, and warnings. Never render raw
password-like columns; validation rejects them.

- [ ] **Step 5: Build conflict and preview panels**

Conflict options are:

```text
Use existing record
Create a new record
Correct the source key and revalidate
```

Preview groups create/update/skip/warning/error counts and relationship counts.

- [ ] **Step 6: Build administrator commit**

Commit button text: **Import N validated rows**. Require an acknowledgement:

> I reviewed the mappings and conflicts. This import will create or update the
> records shown above and will not delete omitted records.

Post only batch ID, expected revision, and a generated idempotency key.

- [ ] **Step 7: Browser-verify permissions and preview**

With gateway/AI variables unset:

1. Office uploads and validates a synthetic workbook.
2. Office cannot commit.
3. Administrator opens the same batch.
4. Resolve one suggested duplicate.
5. Confirm invalid rows block commit.
6. Correct the mapping and reach ready.
7. Commit and watch status reach completed.
8. Confirm normal CRM screens show the imported records.

- [ ] **Step 8: Run checks and commit**

```bash
npx vitest run src/app/app/imports/actions.test.ts src/lib/ops/import-demo.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Ship the reviewed spreadsheet Import Center.`

### Task 14: Generate templates and reconciliation reports

**Files:**
- Create: `src/lib/ops/import-template.ts`
- Create: `src/lib/ops/import-template.test.ts`
- Create: `src/lib/ops/import-report.ts`
- Create: `src/lib/ops/import-report.test.ts`
- Create: `src/app/api/ops/imports/template/route.ts`
- Create: `src/app/api/ops/imports/template/route.test.ts`
- Create: `src/app/api/ops/imports/[batchId]/report/route.ts`
- Create: `src/app/api/ops/imports/[batchId]/report/route.test.ts`

- [ ] **Step 1: Write template tests**

Assert the full workbook has the 11 canonical sheet names, required headers,
example rows, enum guidance, and no formulas. Assert each CSV template is
UTF-8 and quotes commas safely.

- [x] **Step 2: Write report tests**

Assert CSV columns:

```text
sheet
source_row
entity_type
source_key
operation
status
target_id
message
```

Escape values beginning with `=`, `+`, `-`, or `@` to prevent spreadsheet
formula injection when the report is opened.

- [ ] **Step 3: Write route authorization tests**

Field and wrong-organization sessions cannot download templates tied to
organization profiles or batch reports. Office/admin may download an
authorized report. Raw normalized payloads are not included.

- [ ] **Step 4: Implement routes and run checks**

```bash
npx vitest run src/lib/ops/import-template.test.ts src/lib/ops/import-report.test.ts src/app/api/ops/imports/template/route.test.ts src/app/api/ops/imports/[batchId]/report/route.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

Commit message: `Add import templates and reconciliation reports.`

### Task 15: Retain source data safely and expose import operations

**Files:**
- Create: `src/worker/handlers/retain-import.ts`
- Create: `src/worker/handlers/retain-import.test.ts`
- Modify: `src/worker/registry.ts`
- Modify: `src/lib/ops/home.ts`
- Modify: `src/lib/ops/home.test.ts`
- Modify: `src/app/app/page.tsx`
- Modify: `src/lib/ops/audit.ts`
- Modify: `README.md`

- [x] **Step 1: Write retention tests**

Assert:

- Cancelled object is deleted immediately.
- Failed pre-analysis object is eligible after 7 days.
- Completed object/raw payload is eligible after 30 days.
- Normalized result is eligible after 90 days.
- Batch summary, crosswalk, authorization, and event remain.
- Each deletion is checkpointed and writes a retention event.
- Retry after object deletion does not fail.

- [x] **Step 2: Write Home exception tests**

Home shows:

- Failed import needing review.
- Dead-letter analysis/commit/retention job.
- Completed import with price drafts awaiting approval.
- Completed import with workforce accounts pending activation.

Each row links to `/app/imports/[batchId]`.

- [ ] **Step 3: Run and verify failure**

```bash
npx vitest run src/worker/handlers/retain-import.test.ts src/lib/ops/home.test.ts
```

- [x] **Step 4: Register retention and audit redaction**

Register `data-import.retain`. Extend audit redaction so raw row values,
workbook bytes, passwords, tokens, secret keys, and storage signed URLs never
enter audit payloads.

- [x] **Step 5: Document operations**

README runbook includes:

- Required Supabase database and Storage configuration.
- Bucket privacy check.
- Worker database URL.
- Analyze/commit/retention job names.
- Retry and dead-letter workflow.
- Retention policy.
- Backup and staging rehearsal.

- [x] **Step 6: Run checks and commit**

```bash
npx vitest run src/worker/handlers/retain-import.test.ts src/lib/ops/home.test.ts src/lib/ops/audit.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Operate import retention and exception review.`

---

## Phase F — Supabase rehearsal and production cutover

### Task 16: Verify Supabase security, transaction rollback, and real workbook reconciliation

**Files:**
- Create: `scripts/verify-import-environment.ts`
- Create: `scripts/verify-import-environment.test.ts`
- Create: `docs/runbooks/data-import-cutover.md`
- Modify: `package.json`
- Modify: `README.md`

- [x] **Step 1: Write environment-verifier tests**

Inject adapters and assert the verifier fails when:

- Database URL is not Supabase staging/production as expected.
- Runtime and migration credentials are identical.
- Import bucket is public.
- Cross-organization object listing succeeds.
- Import private schema is exposed to `anon` or `authenticated`.
- Transaction rollback leaves a probe row.
- pg-boss cannot create/claim a test job.
- Backup/PITR status is not confirmed in production checklist input.

- [x] **Step 2: Implement the verifier**

The script reports pass/fail metadata without printing connection strings,
keys, tokens, signed URLs, or row content.

Add:

```json
{
  "scripts": {
    "import:verify-environment": "tsx scripts/verify-import-environment.ts"
  }
}
```

- [ ] **Step 3: Run the complete local suite**

```bash
npx vitest run src/lib/ops/import-authorization.test.ts src/lib/ops/import-contract.test.ts src/lib/ops/import-workbook.test.ts src/lib/ops/import-normalizers.test.ts src/lib/ops/import-mappings.test.ts src/lib/ops/import-validation.test.ts src/lib/ops/import-commit.test.ts src/worker/handlers/analyze-import.test.ts src/worker/handlers/commit-import.test.ts src/worker/handlers/retain-import.test.ts src/app/app/imports/actions.test.ts
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 4: Validate isolated Supabase staging**

Use the configured staging environment to:

1. Apply migrations through the repository migration command.
2. Run Supabase database security and performance advisors.
3. Confirm the `data-imports` bucket is private.
4. Confirm exposed roles cannot read `private.data_import_rows`.
5. Run `npm run import:verify-environment`.
6. Upload the synthetic full workbook.
7. Inject a commit failure and confirm zero business rows remain.
8. Commit successfully.
9. Replay the idempotency key and confirm identical IDs/counts.
10. Upload the same workbook again and confirm crosswalk-based skips/updates.

- [ ] **Step 5: Rehearse a sanitized Strong Foam workbook**

Record:

- Sheet and source row counts.
- Mapping profile version.
- Every source-value mapping.
- Conflict resolutions.
- Created/updated/skipped totals by entity.
- Price drafts awaiting approval.
- Workforce accounts awaiting activation.
- Orphan count, which must be zero.
- Audit correlation ID.

Do not proceed while any relationship or count is unexplained.

- [ ] **Step 6: Browser-verify staging**

Verify:

- Companies and contacts link correctly.
- Sites show imported addresses.
- Price book shows code, kind, cost, selling price, and draft status.
- Users show pending activation.
- Projects contain expected jobs.
- Assignments and tasks resolve stable worker IDs.
- No estimate, approval, proposal, acceptance, conversion, or notification was
  created by import.

- [x] **Step 7: Write the cutover runbook**

The runbook requires:

1. Confirm production backup/PITR.
2. Freeze source spreadsheet edits for the cutover window.
3. Export the final workbook and SHA-256 it.
4. Upload with the staging-approved mapping profile.
5. Validate and resolve only documented differences.
6. Commit as an administrator.
7. Download and archive the reconciliation report.
8. Review customer, workforce, price, project, job, assignment, and task
   samples.
9. Approve price drafts separately.
10. Activate workforce users separately.
11. End the source freeze after reconciliation sign-off.

- [ ] **Step 8: Commit**

Commit message: `Document and verify the Supabase import cutover.`

## Final acceptance gate

Before production use, all must be true:

- [ ] Production app and worker use Supabase PostgreSQL, not demo memory.
- [ ] Import bucket is private.
- [ ] Import staging is outside exposed schemas.
- [ ] Runtime, worker, and migration credentials are separated.
- [ ] Office can prepare but cannot commit.
- [ ] Field cannot access imports.
- [ ] Administrator commit is hash/revision/idempotency bound.
- [ ] Malware and ZIP-bomb checks precede parser invocation.
- [ ] Invalid/conflict rows block commit.
- [ ] Injected commit failure rolls back every business write.
- [ ] Replay returns original target IDs and counts.
- [ ] Approved price revisions remain immutable.
- [ ] Imported prices are drafts.
- [ ] Imported users are inactive and passwordless from the source's
      perspective.
- [ ] Omitted rows do not delete or deactivate records.
- [ ] No estimate/proposal/conversion/notification side effect exists.
- [ ] Reconciliation orphan count is zero.
- [ ] Retention deletes source/raw data on schedule while preserving audit and
      crosswalks.
- [ ] Strong Foam signs off the sanitized staging rehearsal before production.
