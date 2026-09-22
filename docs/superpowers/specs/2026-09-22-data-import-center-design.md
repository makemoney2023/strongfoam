# Supabase Data Import Center — Design Specification

**Date:** 2026-09-22  
**Product:** Strong Foam Operations Platform  
**Status:** Proposed, implementation-ready  
**Requirements:** IMP-001 through IMP-030  
**Primary surfaces:** `/app/imports`, `/app/imports/[batchId]`,
`/app/price-book`, `/app/users`

## Executive summary

Strong Foam needs a controlled way to move its existing spreadsheets into the
operations platform. The first release will import master and operational data
from XLSX workbooks or CSV files into Supabase PostgreSQL:

```text
private upload
  → analyze workbook
  → map columns
  → normalize and validate every row
  → resolve exact duplicates and references
  → administrator approval
  → one transactional import
  → counts, errors, audit, and reconciliation report
```

An uploaded spreadsheet has no business effect. Analysis and preview write only
to import staging records. A commit is allowed only when the batch has no row
errors or unresolved conflicts. Replaying the same batch returns the original
result and does not duplicate customers, users, products, projects, or jobs.

Supabase is the production PostgreSQL and private Storage platform. The
application repository still uses the Neon HTTP Drizzle driver and Vercel Blob,
so provisioning Supabase alone does not make the application use it. The first
implementation task must move the application and worker to transaction-capable
Supabase PostgreSQL connections and add a private import bucket. Supabase Auth
migration remains a separate identity project.

## Current-state assessment

The application already has domain records for:

- Organizations, users, memberships, and user lifecycle events.
- Companies, contacts, sites, opportunities, projects, and jobs.
- Job assignments, work areas, and tasks.
- Logical price-book items and immutable approved price revisions.
- Audit events, an outbox, background jobs, retries, and dead letters.

The current model does not yet provide:

- Spreadsheet uploads, staging, column mappings, validation, or import history.
- Stable source-system keys for safe repeat imports.
- Product or labour codes.
- A price-book item kind such as material, labour, or equipment.
- Separate internal unit cost and customer selling price.
- Import-specific permissions and audit summaries.
- Transaction-capable application writes through `src/db/index.ts`.

Production must not run with the in-memory demo store. An import completed in
demo memory would disappear after a restart or deployment.

## PRD comparison

| Concern | Existing product and PRD | Gap | Import contract |
|---|---|---|---|
| Production data platform | Section 23 selects Supabase PostgreSQL, Auth, private Storage, RLS, and backups | Repository runtime still uses the Neon HTTP driver and Vercel Blob | Move runtime/worker connections to Supabase before durable import |
| Customer data | Companies, contacts, sites, opportunities, projects, and jobs exist | No bulk load, source keys, mapping, or repeat-import behavior | Stage and transactionally apply exact source-keyed records |
| Workforce | IAM-015 requires stable application user IDs through the future Supabase Auth migration | Spreadsheet workers cannot safely become active login accounts | Import inactive stable users/memberships without passwords; activate separately |
| Price book | Logical items and immutable approved selling-price revisions exist | No product code, item kind, supplier, or internal cost | Add versioned import fields; imported changes remain drafts |
| Projects and jobs | Operational relationships and stable worker assignments exist | No dependency-ordered graph importer | Resolve every parent and assignee before one transaction |
| Audit and durable work | Audit, outbox, pg-boss jobs, retry, and dead letters exist | No import batch lifecycle or reconciliation report | Reuse worker patterns with import-specific staging, events, and reports |
| Security | Organization scope and Supabase defense-in-depth are required | A spreadsheet can contain PII, prices, formulas, malware, and ambiguous identifiers | Private storage, malware/archive checks, deterministic validation, admin commit, retention |

This specification adds IMP-001 through IMP-030 as the implementation contract.
A later PRD revision can promote those identifiers into the product requirement
catalog without changing the design.

## Goals

1. Import Strong Foam's customers, contacts, sites, workforce, price book,
   opportunities, projects, jobs, assignments, work areas, and tasks.
2. Preserve relationships by stable source codes rather than names alone.
3. Let an office user upload, map, and validate while requiring an
   administrator to commit.
4. Make the dry-run preview match the committed result.
5. Make retries and repeat uploads idempotent.
6. Keep approved price history immutable; imported prices begin as drafts.
7. Create imported workforce accounts safely without importing passwords.
8. Write no notifications, proposals, estimates, conversions, or external
   messages as a side effect of import.
9. Keep all imported and staged data organization-scoped and auditable.
10. Produce a reconciliation report that can be compared with the source
    workbook before Strong Foam treats the import as complete.

## Non-goals

- Guessing missing customers, sites, workers, prices, or relationships.
- Fuzzy matching that automatically merges two records.
- Importing plaintext or reversibly encrypted passwords.
- Automatically activating imported login accounts.
- Treating employee wages as generally visible price-book data.
- Importing plan files, photos, audio, or other binary archives from workbook
  paths. A later archive importer may link those files.
- Reconstructing immutable historical estimates, approvals, proposals, or
  customer acceptances from incomplete spreadsheet rows.
- Deleting application records because a later workbook omits them.
- Continuous accounting, payroll, ERP, or vendor synchronization in release 1.
- Letting the browser receive a Supabase secret/service key or direct database
  credentials.

## Terms

- **Import batch:** One uploaded workbook or coordinated CSV set, its mapping,
  validation result, commit result, and audit history.
- **Entity sheet:** A workbook sheet or CSV file representing one supported
  entity type.
- **Source key:** Stable source-system identifier such as `CUST-0042` or
  `JOB-2026-118`. It is unique for one organization, source system, and entity
  type.
- **Crosswalk:** Durable mapping from a source key to a Strong Foam UUID.
- **Mapping profile:** Reusable mapping from source headers and values to the
  canonical import contract.
- **Conflict:** A row that could refer to multiple records or would overwrite
  protected data. It requires a human resolution.
- **Warning:** A row that is safe to import but deserves attention.
- **Error:** A row that cannot be committed.
- **Commit:** The authorized transaction that applies a fully validated batch.

## Users and authority

| Actor | Allowed |
|---|---|
| Office user | Upload a workbook, choose a mapping profile, map columns, validate, download errors, and cancel an uncommitted batch |
| Administrator | All office actions plus resolve identity conflicts and commit a batch |
| Field lead / field worker | No Import Center or import-file access |
| Render worker | Read one organization-scoped private object, parse and validate it, and commit only an administrator-authorized batch |
| Supabase | PostgreSQL, private object storage, backups, and server-side access controls |

Release 1 adds `data.import.prepare` and `data.import.commit`. Administrators
receive both. Office receives `data.import.prepare`. Field roles receive
neither. Permission and organization come from the live session, never from a
form field or workbook cell.

## End-to-end workflow

### 1. Download a template or upload existing data

The Import Center offers:

- **Download full workbook template**
- **Download one CSV template**
- **Upload XLSX or CSV**
- **Use a saved mapping profile**

Accepted files:

- `.xlsx`
- UTF-8 `.csv`
- Maximum 25 MB per file
- Maximum 25,000 data rows per batch
- Maximum 15 supported entity sheets

Macros, legacy `.xls`, password-protected workbooks, external workbook links,
embedded objects, and binary file references are rejected. Formula cells are
not evaluated by the server; the source must provide a cached scalar value or
replace the formula with a value.

The browser uploads directly to the private Supabase Storage bucket
`data-imports` with a short-lived, object-scoped signed upload. The object path
is generated by the server:

```text
{organizationId}/{batchId}/{randomId}-{sanitizedFilename}
```

The bucket is private. The browser never receives a Supabase secret key.

### 2. Analyze the workbook asynchronously

Upload completion creates an `uploaded` batch and enqueues
`data-import.analyze`. The Render worker:

1. Downloads the private object.
2. Confirms size, extension, and file signature.
3. Scans it with the configured malware scanner.
4. Bounds XLSX ZIP entry count and total uncompressed bytes before parsing.
5. Computes SHA-256.
6. Rejects a duplicate file replay when appropriate.
7. Reads sheet names and headers.
8. Samples values for type inference.
9. Matches a saved mapping profile by normalized header signature.
10. Stores staged rows and detected mappings.
11. Moves the batch to `needs_mapping`, `invalid`, or `ready`.

The web request never parses the full workbook.

### 3. Map sheets and columns

The mapping UI shows source columns beside canonical fields. Required fields
cannot be omitted. Users may:

- Map a source sheet to one supported entity.
- Ignore a sheet.
- Map columns.
- Set constants such as province or default active state.
- Map source values such as `Tech` to `field_worker`.
- Save the result as an organization-scoped profile.

A profile stores headers and mapping rules, not imported row values.

### 4. Normalize and validate

Validation is deterministic and server-side. It normalizes:

- Email addresses to trimmed lowercase.
- Codes to trimmed uppercase while preserving the raw value for diagnostics.
- CAD money to integer cents with at most two decimal places.
- Quantities to decimal strings with the domain's existing precision rules.
- Dates with an explicit organization time zone.
- Boolean values through a finite allowlist.
- Roles, statuses, services, trades, units, and item kinds through finite
  allowlists.

Every row receives:

- Canonical entity type.
- Raw row number.
- Normalized payload.
- Proposed operation: create, update, skip, or conflict.
- Errors and warnings.
- Resolved parent and target UUIDs, if known.
- A deterministic row hash.

### 5. Resolve duplicates and references

Matching precedence is:

1. Existing crosswalk for the source key.
2. Exact protected natural key.
3. A human-approved proposed match.
4. Create a new record.

Protected natural keys are:

| Entity | Exact match |
|---|---|
| User | Normalized email |
| Contact | Normalized email within the organization |
| Price-book item | Item code |
| Other entities | Source key through the crosswalk |

Company names, project names, worker names, addresses, and phone numbers may
produce suggestions but never automatic merges. A user can choose an existing
record, create a new record, or correct the source key. The chosen resolution
is stored and revalidated before commit.

### 6. Preview the exact commit

The review page groups:

- Creates
- Updates
- Unchanged skips
- Warnings
- Blocking errors
- Conflicts

It also shows relationship counts:

```text
128 companies
214 contacts linked to 126 companies
31 users and memberships
487 price-book drafts
42 projects
67 jobs linked to 42 projects
109 assignments linked to 28 workers
356 tasks linked to 67 jobs
```

The commit request contains only `batchId`, `expectedRevision`, and an
idempotency key. It never accepts normalized rows, organization IDs, resolved
UUIDs, counts, or permissions from the browser.

### 7. Commit transactionally

The commit action:

1. Requires `data.import.commit`.
2. Reloads the batch and organization from the database.
3. Confirms `ready`, expected revision, object hash, mapping hash, and zero
   unresolved errors.
4. Records administrator authorization.
5. Enqueues `data-import.commit`.
6. The worker acquires an organization-scoped PostgreSQL advisory lock.
7. The worker opens one database transaction.
8. It revalidates staged row hashes and current target records.
9. It writes entities in dependency order.
10. It writes crosswalks, import events, and the final counts.
11. It commits once.

Dependency order:

```text
companies
  → contacts and sites
  → workforce users and memberships
  → price-book logical items and draft revisions
  → opportunities
  → projects
  → jobs
  → job assignments
  → work areas
  → tasks
```

The transaction is all-or-nothing for release 1. The 25,000-row limit bounds
transaction size. Larger migrations must be split into independently
reconcilable batches.

### 8. Reconcile

After completion, the Import Center provides:

- Source row counts by sheet.
- Created, updated, skipped, warning, and error counts by entity.
- Crosswalk count.
- Unresolved references, which must be zero for completed batches.
- Price-book drafts awaiting approval.
- Workforce accounts awaiting activation.
- A CSV result with source row, source key, operation, Strong Foam UUID, and
  message.
- Audit correlation ID.

Completed imports are not automatically undone. A compensating import can
correct mutable records. Immutable price revisions, audit events, estimates,
approvals, and proposal history are never deleted by rollback tooling.

## Canonical workbook contract

### Companies

Required: `company_code`, `name`

Optional: `email`, `phone`, `city`, `province`, `active`

### Contacts

Required: `contact_code`, `company_code`, `first_name`, `last_name`, `email`,
`phone`

Optional: `role`, `active`

### Sites

Required: `site_code`, `company_code`, `name`, `city`, `province`

Optional fields added by this feature: `address_line_1`, `address_line_2`,
`postal_code`, `country`

### Workforce

Required: `worker_code`, `display_name`, `email`, `role`

Optional: `active`

Allowed roles: `administrator`, `office`, `field_lead`, `field_worker`.
Importing another administrator requires an explicit warning confirmation.

### Price Book

Required: `item_code`, `item_kind`, `trade`, `description`, `unit`,
`sell_price`

Optional: `unit_cost`, `supplier`, `active`, `effective_date`

Allowed item kinds: `material`, `labour`, `equipment`, `subcontractor`,
`allowance`.

The existing `unit_price_cents` remains the customer selling price for
compatibility. `unit_cost_cents` is additive. Approved revisions snapshot both
amounts. The first import creates or updates a draft; it never silently
approves a revision.

Labour estimating rates are generic roles or crews, for example
`LAB-SPF-LEAD` at an hourly cost and selling rate. Individual wages or payroll
data are out of scope and require a separate restricted compensation model.

### Opportunities

Required: `opportunity_code`, `name`, `stage`

Optional: `company_code`, `contact_code`, `site_code`, `owner_email`, `source`,
`services`, `project_type`

### Projects

Required: `project_code`, `name`, `status`

Optional: `company_code`, `site_code`, `opportunity_code`,
`project_manager_email`

### Jobs

Required: `job_code`, `project_code`, `name`, `status`

Optional: `company_code`, `site_code`, `opportunity_code`, `scope`, `services`,
`project_manager_email`, `foreman_email`, `planned_start`, `planned_end`,
`blocker_note`

### Assignments

Required: `job_code`, `worker_code`, `assignment_role`

Allowed roles: `foreman`, `technician`.

### Work Areas

Required: `area_code`, `job_code`, `name`

Optional: `kind`, `notes`, `sort_order`

### Tasks

Required: `task_code`, `job_code`, `title`, `status`

Optional: `area_code`, `assignee_worker_code`, `due_at`, `planned_start`,
`planned_end`, `completed_at`, `stated_quantity`, `stated_unit`, `sort_order`

## Price-book and cost behavior

The import extends the price-book model instead of creating a second product
catalog:

- `price_book_items.item_code` is unique per organization.
- `price_book_items.item_kind` distinguishes material, labour, equipment,
  subcontractor, and allowance.
- `price_book_items.supplier` is optional.
- `price_book_item_versions.unit_cost_cents` is nullable.
- Existing `unit_price_cents` remains selling price.
- Approved revisions are immutable.
- Estimate calculations continue to use the approved selling price.
- Future project budgets may use the approved cost snapshot.

An unchanged imported revision is skipped. A changed cost, selling price,
description, trade, unit, kind, or supplier creates or updates one open draft.
If an open draft conflicts with a spreadsheet value, the row is a conflict
unless the administrator explicitly chooses which draft wins.

## Workforce and authentication behavior

Workforce import and authentication are separate concerns:

- Existing application users match by normalized email.
- New workforce rows create inactive application users and inactive
  memberships with stable application UUIDs.
- No workbook password column is accepted.
- No Supabase `auth.users` record is created by the spreadsheet worker.
- An administrator activates the account through the existing user lifecycle
  flow after setting a temporary password or, after the Auth migration, sending
  a Supabase invitation.
- Job and task assignment can resolve the inactive stable application user.
- Imported absence never deactivates a user.
- The last active administrator protections remain in force.

This preserves IAM-015: a later Supabase Auth migration must preserve stable
application user IDs, memberships, assignments, audit history, and immediate
deactivation behavior.

## Operational-record behavior

- Imports may create historical opportunities, projects, jobs, assignments,
  areas, and tasks.
- Status values must map explicitly to existing domain allowlists.
- A spreadsheet project does not create an estimate, approval, proposal, or
  acceptance.
- A spreadsheet job does not trigger customer messaging or worker
  notifications.
- Import events are audit records, not normal job activity events, unless the
  mapping explicitly contains historical job events in a future importer.
- Imported opportunities and projects retain source crosswalks for later
  updates.
- The importer cannot set an opportunity's project ID unless both source
  records are in the same validated batch or already linked by crosswalk.

## Data model

Import staging lives in a non-exposed `private` PostgreSQL schema. It is never
available through the Supabase Data API.

### `private.data_import_batches`

- Organization, source system, filename, object key, media type, byte size,
  SHA-256.
- Status, revision, upload actor, commit actor, timestamps.
- Mapping hash, validation hash, idempotency key.
- Row and result counts.
- Error summary and audit correlation ID.

Statuses:

```text
uploaded
analyzing
needs_mapping
validating
invalid
ready
commit_queued
importing
completed
failed
cancelled
```

### `private.data_import_sheets`

Source sheet name, normalized header signature, selected entity type, row
count, and mapping JSON.

### `private.data_import_rows`

Sheet, source row number, entity type, source key, raw payload, normalized
payload, row hash, operation, status, resolved target UUID, errors, and
warnings.

Raw and normalized payload access is restricted because it may contain
personal and commercial information.

### `private.data_import_mapping_profiles`

Organization, name, entity/sheet mappings, normalized header signature,
version, creator, and timestamps.

### `private.external_record_keys`

Organization, source system, entity type, source key, target UUID, created
batch, last-seen batch, and timestamps.

Unique:

```text
(organization_id, source_system, entity_type, source_key)
```

The same target may have keys from multiple source systems.

### `private.data_import_events`

Append-only upload, analyze, validate, resolution, authorization, commit,
failure, retry, cancel, and retention events. Event payloads do not copy raw
spreadsheet rows.

## Idempotency and concurrency

- Object SHA-256 detects byte-identical uploads.
- Mapping plus normalized rows produce a validation hash.
- Commit requires an idempotency key unique within the organization.
- Row hashes bind preview to commit.
- Crosswalk uniqueness prevents duplicate source records.
- An organization advisory lock prevents concurrent commits for the same
  organization.
- Optimistic batch revision rejects stale mapping or conflict resolutions.
- A completed idempotency key returns the original report.
- Retrying a failed worker before transaction commit is safe.

## Supabase architecture

### PostgreSQL

- Supabase PostgreSQL is authoritative.
- Drizzle remains the repository's single schema and migration source of truth.
- `DATABASE_URL` uses the Supabase pooler for application traffic.
- `WORKER_DATABASE_URL` uses a worker-compatible connection for pg-boss and
  long transactions.
- `DIRECT_URL` is reserved for migrations and supported maintenance.
- The Neon HTTP driver is replaced by a transaction-capable PostgreSQL driver.
- Runtime, worker, and migration credentials are separate and least privilege.

### Storage

- Bucket: `data-imports`
- Private: yes
- Object-scoped signed uploads and downloads only
- Server generates the organization/batch path
- Secret/service credentials remain server/worker only
- Storage policies deny arbitrary cross-organization listing and reads

### RLS and exposed schemas

- Import tables live in `private`, outside exposed API schemas.
- Public business tables remain organization-scoped and receive reviewed RLS
  as part of the broader Supabase migration.
- Import server and worker commands still perform domain authorization; RLS is
  defense in depth.
- No authorization decision uses user-editable Supabase user metadata.
- Views exposed later must use `security_invoker = true` or be revoked from
  exposed roles.

## Retention

- Cancelled uploads: delete object immediately after cancellation completes.
- Failed upload before analysis: retain up to 7 days for diagnosis.
- Completed source object and raw staged payloads: retain 30 days.
- Normalized row result and downloadable report: retain 90 days.
- Batch summary, crosswalk, authorization, and audit events: retain
  indefinitely.
- Retention deletion is a checkpointed worker job and writes an event.

## Failure and recovery

| Failure | Behavior |
|---|---|
| Unsupported or corrupt workbook | Batch becomes `invalid`; no business write |
| Malware-positive or ZIP-bomb workbook | Batch becomes `invalid`; object is quarantined from parsing |
| Unknown sheet/header | `needs_mapping`; user maps or ignores it |
| Missing parent source key | Row error; commit blocked |
| Ambiguous possible duplicate | Conflict; commit blocked |
| Existing approved price differs | Create draft; approved row stays immutable |
| Existing open price draft differs | Conflict; administrator selects source or current draft |
| Worker crash during analysis | Resume from sheet/row checkpoint |
| Worker crash during commit before transaction commit | PostgreSQL rolls back; retry safely |
| Stale batch revision or row hash | Commit rejected; revalidate |
| Duplicate commit request | Return original completed result |
| Supabase Storage unavailable | Upload/analysis unavailable; all normal CRM workflows continue |
| Database unavailable | No commit; source object and staged state remain retryable |

## Demo and disabled operation

- Demo mode may parse a bundled synthetic workbook and show deterministic
  preview behavior.
- Demo commit is either disabled or clearly marked process-memory-only; it must
  never claim durable completion.
- Production commit requires configured Supabase PostgreSQL and Storage.
- Import failure cannot disable manual companies, contacts, users, price book,
  projects, jobs, or tasks.
- Tests never call Supabase or the network.

## Requirements

### Access and storage

**IMP-001:** Office may prepare an import; only administrators may commit.  
**IMP-002:** Field roles cannot list, read, upload, validate, or commit imports.  
**IMP-003:** Import organization comes from the authenticated session.  
**IMP-004:** Source files use private Supabase Storage and server-generated
organization/batch object paths.  
**IMP-005:** Supabase secret/service credentials never reach browser code.  

### Parsing and mapping

**IMP-006:** Release 1 accepts `.xlsx` and UTF-8 `.csv` within documented
limits.  
**IMP-007:** Workbook analysis runs asynchronously and writes no business
record.  
**IMP-008:** Mapping profiles store mappings, not source row values.  
**IMP-009:** Formula cells are not evaluated; unsupported workbook features
fail closed.  
**IMP-010:** Money, dates, roles, statuses, services, units, trades, and item
kinds normalize deterministically.  

### Preview and conflict rules

**IMP-011:** Every row receives an operation, row hash, errors, warnings, and
resolved references.  
**IMP-012:** Errors or unresolved conflicts block commit.  
**IMP-013:** Fuzzy matches are suggestions only and never auto-merge.  
**IMP-014:** Preview counts and operations are hash-bound to commit.  
**IMP-015:** Missing rows never imply deletion or deactivation.  

### Commit

**IMP-016:** Commit reloads all authority and staged values server-side.  
**IMP-017:** Release 1 commits a validated batch in one transaction under an
organization advisory lock.  
**IMP-018:** Commit and crosswalk writes are idempotent.  
**IMP-019:** Import writes no proposal, estimate, acceptance, conversion,
notification, or external message.  
**IMP-020:** Completed import produces a downloadable reconciliation report.  

### Price book and workforce

**IMP-021:** Price-book items support unique item code, item kind, supplier,
internal cost, and selling price.  
**IMP-022:** Changed imports create draft price revisions; approved revisions
stay immutable.  
**IMP-023:** Estimates continue to use approved selling prices.  
**IMP-024:** Generic labour rates may be imported; individual payroll/wages
are out of scope.  
**IMP-025:** Workforce import accepts no password and creates no active login
without administrator lifecycle action.  
**IMP-026:** Existing users match only by normalized email or a resolved
crosswalk.  

### Audit, security, and operation

**IMP-027:** Batch lifecycle, resolutions, authorization, commit, and retention
are audited without copying raw row values into audit payloads.  
**IMP-028:** Import staging is outside exposed Supabase API schemas.  
**IMP-029:** Raw source and staged data follow the retention policy.  
**IMP-030:** Demo/import-provider failure leaves all manual workflows usable.  

## Acceptance criteria

1. Uploading a workbook creates no customer, user, price, project, or job.
2. An office user can map and validate but cannot commit.
3. A field user cannot access an import URL or object.
4. A batch with one invalid parent reference cannot commit.
5. A corrected and revalidated batch previews exact create/update/skip counts.
6. The administrator commits once and receives all linked records and a
   reconciliation report.
7. Replaying the commit returns the same IDs and counts.
8. Injected failure before transaction completion leaves every business table
   unchanged.
9. Re-uploading records with the same source keys updates permitted mutable
   fields without duplicating records.
10. A changed price creates a draft while the approved revision remains
    unchanged.
11. Imported workers are inactive and cannot authenticate until activated.
12. No imported row creates an estimate, approval, proposal, acceptance, or
    conversion.
13. All source objects, staging rows, crosswalks, and targets stay within the
    session organization.
14. Demo tests complete without network calls.

## Rollout

1. Connect staging to its isolated Supabase project and private import bucket.
2. Run schema and RLS checks, then test a synthetic workbook.
3. Rehearse a sanitized copy of Strong Foam's actual workbook.
4. Resolve mapping gaps and record the approved mapping profile.
5. Take a database backup.
6. Import master data and reconcile.
7. Import operational data and reconcile.
8. Have Strong Foam review customers, workers, prices, projects, and job
   assignments.
9. Repeat the same validated procedure in production.
10. Keep the original workbook and reports under the agreed retention policy.

Recurring file synchronization, document archive migration, accounting
integration, and payroll integration require separate specifications after
the one-time import is stable.
