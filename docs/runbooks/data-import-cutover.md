# Data import cutover

Use this after a staging rehearsal of the same workbook. The Import Center stages
files in `private.data_import_batches.file_bytes` and normalized rows in
`private.data_import_rows`. Retention clears those payloads on the schedule in the
README. It keeps the batch summary, source keys, and events.

`npm run import:verify-environment` checks the checklist flags below. It does not
connect to Supabase and does not print connection strings, keys, tokens, signed
URLs, or row content.

## Before the window

1. Confirm the production backup and point-in-time recovery target.
2. Freeze source spreadsheet edits for the cutover window.
3. Export the final workbook and record its SHA-256.
4. Confirm migrations through `0028_import_domain_keys.sql` are applied with
   `DIRECT_URL`, and that the app and worker use different credentials
   (`DATABASE_URL` and `WORKER_DATABASE_URL`).
5. Run `npm run import:verify-environment` with `IMPORT_VERIFY_TARGET=production`,
   `IMPORT_DATABASE_LABEL=production`, `IMPORT_WORKER_CLAIMED=1`, and
   `IMPORT_BACKUP_CONFIRMED=1`. Do not continue while any check fails.

## Commit

6. Upload the workbook with the mapping profile approved in staging.
7. Validate the preview and resolve only differences that were documented in the
   rehearsal.
8. An administrator commits the batch. Office staff can prepare the preview and
   cannot commit it.
9. Download the reconciliation CSV from the batch page
   (`/api/ops/imports/<batchId>/report`) and archive it with the workbook hash.
   The file lists sheet, source row, entity, source key, operation, status,
   target id, and message. It does not include raw cell values.

## After commit

10. Review samples for companies, contacts, sites, workforce users, price-book
    items, projects, jobs, assignments, and tasks.
11. Approve price-book drafts in a separate action. Import leaves them as drafts.
12. Activate workforce users in a separate action. Import leaves them inactive.
13. End the source freeze after reconciliation sign-off.

No estimate, proposal, approval, or customer message is created by the import.
