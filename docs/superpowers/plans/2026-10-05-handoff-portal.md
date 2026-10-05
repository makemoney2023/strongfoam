# Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone locker where an invited client drops folders of
brand, photo, copy, export, and reference files, and the build team downloads
the files that pass scan.

**Architecture:** A separate Next.js app authenticates with its own Supabase
Auth magic links and writes metadata with its own server key. The browser
uploads bytes with the Storage resumable protocol into a private bucket.
A worker scans objects and is the only path that marks a file clean.
Authorization is a pure function in front of every route. The operations
platform is not imported, linked, or migrated.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Zod, Drizzle
ORM, Supabase Postgres, Supabase Auth, Supabase Storage resumable uploads,
`tus-js-client`, Tailwind CSS.

**Design:** `docs/superpowers/specs/2026-10-05-handoff-portal-design.md`
in the operations repository. Requirements HND-001 through HND-032.

---

## Repository boundary

Implement this plan in a new repository named `handoff`. Do not add
application code, dependencies, environment variables, or migrations to the
operations repository. The operations repository keeps the spec and this plan
only.

The new app does not depend on the operations package, does not read
`sf-ops-session`, and does not connect to the operations database.

Before adding App Router pages or route handlers, read the current guide in
that project's `node_modules/next/dist/docs/`.

## Global constraints

- One upload path: Storage resumable uploads, 6 MiB chunks, concurrency 3.
- The Next.js server accepts manifests and issues decisions. It does not
  accept file bodies.
- Object keys are `{workspaceId}/{batchId}/{fileId}`.
- Download URLs last 5 minutes, are attachments, and exist only for `clean`
  files.
- Tags do not trigger imports or publishes.
- Tests use fakes. They do not call Supabase, ClamAV, or the network.
- Production fails closed when `SUPABASE_SECRET_KEY` or `DATABASE_URL` is
  missing. `CLAMAV_URL` is optional.
- No `NEXT_PUBLIC_` variable contains a secret.
- Logs and audit metadata exclude tokens, signed URLs, and file bytes.
- v1 does not build batch ZIPs, thumbnails, previews, or archive extraction.
- If this repository deploys to the same Vercel Hobby team as the operations
  app, commit as `makemoney2023 <124006256+makemoney2023@users.noreply.github.com>`
  using per-command author environment variables. Do not change git config.

## Environment contract

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
DATABASE_URL
DIRECT_URL
HANDOFF_BUCKET=handoff
HANDOFF_OPERATOR_EMAILS
CLAMAV_URL
```

Set the Storage file size limit to at least 2 GB before the first real drop.
Confirm the Supabase region against the operations platform before inviting
Strong Foam.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/policy/files.ts` | Extensions, blocked names, size caps, path normalization |
| `src/lib/policy/files.test.ts` | Policy tests |
| `src/lib/authz.ts` | Pure membership and operator decisions |
| `src/lib/authz.test.ts` | Authorization tests |
| `src/lib/batches.ts` | Manifest validation and batch derivation |
| `src/lib/batches.test.ts` | Manifest and status tests |
| `src/lib/scan.ts` | Signature decision given a header and a scan result |
| `src/lib/scan.test.ts` | Scan decision tests |
| `src/db/schema.ts` | Drizzle tables |
| `drizzle/` | SQL migrations |
| `src/lib/session.ts` | Resolve caller from the Handoff session |
| `src/lib/store.ts` | Persistence used by routes and the worker |
| `src/app/api/workspaces/[slug]/batches/route.ts` | Create a batch |
| `src/app/api/batches/[batchId]/files/[fileId]/grant/route.ts` | Refresh a grant |
| `src/app/api/batches/[batchId]/files/[fileId]/complete/route.ts` | Complete an upload |
| `src/app/api/batches/[batchId]/files/[fileId]/download/route.ts` | Signed download |
| `src/app/api/batches/[batchId]/manifest/route.ts` | JSON tree |
| `src/app/api/batches/[batchId]/discard/route.ts` | Client discard |
| `src/worker/index.ts` | Scan, grant expiry, rejected-object deletion |
| `src/app/page.tsx` | Magic-link request |
| `src/app/workspaces/page.tsx` | Workspace list |
| `src/app/w/[slug]/page.tsx` | Batches, invite, revoke |
| `src/app/w/[slug]/batches/[batchId]/page.tsx` | Tree, progress, download |
| `src/app/ops/page.tsx` | Create workspace, operator admin |
| `src/components/drop-zone.tsx` | Folder and file selection, resumable upload |

---

## Phase 1 — Policy and authorization

### Task 1: Scaffold the repository

**Files:**
- Create: the Next.js app, Vitest, TypeScript, Tailwind, Zod, Drizzle, and
  the Supabase server client
- Create: `.env.example` with the environment contract
- Create: `README.md` with local setup, the region warning, and the statement
  that this app is not part of the operations platform

- [ ] **Step 1: Create the app in a new repository**

Use the current Next.js App Router starter. Do not copy the operations app's
`src/` tree.

- [ ] **Step 2: Confirm the app builds and the empty test script runs**

```bash
npm test
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git commit -m "Scaffold the Handoff app."
```

### Task 2: File policy

**Files:**
- Create: `src/lib/policy/files.ts`
- Test: `src/lib/policy/files.test.ts`

**Produces:**

```ts
export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_BATCH_BYTES = 10 * 1024 * 1024 * 1024;
export const MAX_BATCH_FILES = 2000;

export function normalizeRelativePath(
  input: string,
): { ok: true; path: string } | { ok: false; reason: string };

export function inspectFileName(
  path: string,
): { ok: true; extension: string } | { ok: false; reason: string };
```

- [ ] **Step 1: Write failing tests**

Cover:

- `Brand/logos/primary.svg` normalizes and is allowed
- `..\secret.pdf`, `/etc/passwd`, `a\\b.pdf`, and `foo/\u0000.pdf` fail
- two paths that differ only by Unicode composition collide after NFC
- `notes.pdf.exe`, `.env`, `.env.local`, and `id_rsa` fail
- `photo.JPG` is allowed and reports `jpg`
- a 0-byte size and a size of `MAX_FILE_BYTES + 1` fail
- 2,001 files and a total over `MAX_BATCH_BYTES` fail
- a path deeper than 16 segments fails

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run src/lib/policy/files.test.ts
```

- [ ] **Step 3: Implement the policy**

Use the extension lists in HND-011 and HND-012. Do not read the filesystem.

- [ ] **Step 4: Re-run the test and commit**

```bash
npx vitest run src/lib/policy/files.test.ts
git commit -m "Reject unsafe handoff paths and file types."
```

### Task 3: Authorization

**Files:**
- Create: `src/lib/authz.ts`
- Test: `src/lib/authz.test.ts`

**Produces:**

```ts
export type Caller =
  | { kind: "operator"; email: string }
  | { kind: "member"; email: string; workspaceIds: string[] }
  | { kind: "anonymous" };

export function canCreateBatch(caller: Caller, workspaceId: string): boolean;
export function canDownload(caller: Caller, workspaceId: string): boolean;
export function canDiscard(caller: Caller, workspaceId: string): boolean;
export function canInvite(caller: Caller): boolean;
export function canTag(caller: Caller): boolean;
export function canDeleteBatch(caller: Caller): boolean;
```

- [ ] **Step 1: Write failing tests**

Assert the matrix in HND-005, HND-006, and HND-007. A member of workspace A
cannot create a batch or download in workspace B. An anonymous caller can do
none of these. An operator can.

- [ ] **Step 2: Implement, test, and commit**

```bash
npx vitest run src/lib/authz.test.ts
git commit -m "Authorize handoff actions from membership."
```

### Task 4: Manifest and batch status

**Files:**
- Create: `src/lib/batches.ts`
- Test: `src/lib/batches.test.ts`

**Produces:**

```ts
export function validateManifest(
  files: { relativePath: string; sizeBytes: number; contentType: string; tag?: string }[],
):
  | { ok: true; files: ValidFile[] }
  | { ok: false; reason: string };

export function deriveBatchStatus(
  files: { status: FileStatus }[],
  now: Date,
  expiresAt: Date,
): BatchStatus;
```

- [ ] **Step 1: Write failing tests**

One bad entry fails the whole manifest. Duplicate normalized paths fail.
An unknown tag fails. Status derivation matches the table in HND-024,
including a batch past `expiresAt` with files still `pending`.

- [ ] **Step 2: Implement, test, and commit**

```bash
npx vitest run src/lib/batches.test.ts
git commit -m "Validate handoff manifests and derive batch status."
```

### Task 5: Scan decision

**Files:**
- Create: `src/lib/scan.ts`
- Test: `src/lib/scan.test.ts`

**Produces:**

```ts
export function decideScan(input: {
  extension: string;
  header: Uint8Array;
  malware: "clean" | "infected" | "unavailable" | "not_configured";
}): { status: "clean" } | { status: "rejected"; reason: string } | { status: "retry" };
```

- [ ] **Step 1: Write failing tests**

- PDF bytes starting with `%PDF` and malware `not_configured` are clean
- A `.png` whose header is not a PNG is rejected
- `.txt` with malware `not_configured` is clean
- malware `infected` is rejected
- malware `unavailable` returns `retry` and is not clean
- `.svg` is not sniffed and can be clean

- [ ] **Step 2: Implement, test, and commit**

```bash
npx vitest run src/lib/scan.test.ts
git commit -m "Decide handoff scan results without opening the network."
```

---

## Phase 2 — Persistence and routes

### Task 6: Schema

**Files:**
- Create: `src/db/schema.ts`
- Create: the first Drizzle migration

- [ ] **Step 1: Add the tables from HND-024**

Use `bigint` for `size_bytes`. Add the unique constraints named in the spec.
Enable row-level security on every table and add no client policies. The
server key bypasses RLS. Authenticated browser clients have no table grants.

- [ ] **Step 2: Add the storage policy for HND-015**

Writes require a security-definer function that checks membership, object
key, file status, and grant expiry. The function is the only client write
path. There is no client read policy on the bucket.

- [ ] **Step 3: Generate the migration and commit**

```bash
git commit -m "Add the handoff workspace, batch, and file tables."
```

### Task 7: Session, invites, and workspaces

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/lib/store.ts` invite and operator functions
- Create: `src/app/ops/page.tsx`
- Create: `src/app/workspaces/page.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Bootstrap operators**

When `operators` has no rows, insert the lowercase addresses in
`HANDOFF_OPERATOR_EMAILS`. Later requests read the table, not the variable.

- [ ] **Step 2: Magic link**

The home page collects an email and requests a Supabase magic link. The
callback exchanges the code and redirects to `/workspaces`. A caller with no
operator row and no live membership sees an empty explanation and no
workspace names.

- [ ] **Step 3: Operator admin**

`/ops` creates a workspace, invites a client, revokes a membership, and adds
or revokes an operator. Invite rows store a SHA-256 of the token. Resend
replaces the hash. Audit each action.

- [ ] **Step 4: Commit**

```bash
git commit -m "Sign clients in with workspace invites."
```

### Task 8: Create a batch

**Files:**
- Create: `src/app/api/workspaces/[slug]/batches/route.ts`
- Test: route tests with a fake store

- [ ] **Step 1: Write failing route tests**

- A member's valid manifest returns file ids and object keys and writes
  `pending` rows
- A member of another workspace receives 403 and writes nothing
- A manifest with one blocked file receives 400 and writes nothing
- The 11th batch in an hour receives 429

- [ ] **Step 2: Implement against `validateManifest` and `canCreateBatch`**

Set `expires_at` two hours ahead. Write `batch.created`.

- [ ] **Step 3: Test and commit**

```bash
npx vitest run src/app/api/workspaces/[slug]/batches/route.test.ts
git commit -m "Create a handoff batch from a validated manifest."
```

### Task 9: Grants and completion

**Files:**
- Create: `src/app/api/batches/[batchId]/files/[fileId]/grant/route.ts`
- Create: `src/app/api/batches/[batchId]/files/[fileId]/complete/route.ts`
- Test: both route tests

- [ ] **Step 1: Write failing tests**

- A grant for a `pending` file in the caller's workspace succeeds
- A grant for a `clean` file fails
- A grant after `expires_at` fails
- Completion with a matching stored size marks `uploaded` and enqueues one scan
- A second completion returns the same row and does not enqueue again
- Completion whose stored size differs marks `failed`

- [ ] **Step 2: Implement, test, and commit**

The completion handler reads object metadata with the server key. It does
not download the object.

```bash
git commit -m "Grant and complete direct handoff uploads."
```

### Task 10: Worker

**Files:**
- Create: `src/worker/index.ts`
- Test: worker tests with a fake object store and a fake scanner

- [ ] **Step 1: Write failing tests**

- An `uploaded` file becomes `clean` when `decideScan` says clean
- An infected result becomes `rejected` with a reason
- A scanner `retry` leaves the file available for another pass
- Running the job twice does not double-write a clean file
- A `pending` file past expiry becomes `failed`
- A rejected object older than 14 days is deleted and the row remains

- [ ] **Step 2: Implement the polling worker**

Read only a header large enough for signature checks unless `CLAMAV_URL` is
set. When it is set, stream the object to that scanner. Do not write the
object to the worker disk.

- [ ] **Step 3: Test and commit**

```bash
git commit -m "Scan handoff objects and expire abandoned uploads."
```

### Task 11: Download and manifest

**Files:**
- Create: `src/app/api/batches/[batchId]/files/[fileId]/download/route.ts`
- Create: `src/app/api/batches/[batchId]/manifest/route.ts`
- Create: `src/app/api/batches/[batchId]/discard/route.ts`
- Test: route tests

- [ ] **Step 1: Write failing tests**

- A clean file returns a signed attachment URL and writes `file.downloaded`
- A scanning or rejected file returns 409
- A member of another workspace returns 403
- The manifest lists paths, sizes, tags, and statuses, and contains no URL
- Discard succeeds when no file is clean, and fails when one is

- [ ] **Step 2: Implement, test, and commit**

```bash
git commit -m "Download clean handoff files as short-lived attachments."
```

---

## Phase 3 — Upload and review screens

### Task 12: Drop a folder

**Files:**
- Create: `src/components/drop-zone.tsx`
- Create: `src/app/w/[slug]/page.tsx`
- Create: `src/app/w/[slug]/batches/[batchId]/page.tsx`
- Test: component tests for the manifest builder

- [ ] **Step 1: Build the manifest from a directory drop and from a file input**

Read `webkitRelativePath` when it is present. Send the manifest to Task 8.
Upload with `tus-js-client` to the Storage resumable endpoint using the
signed-in user token, 6 MiB chunks, and a concurrency of 3. Call the grant
route before each file and the complete route after each success.

- [ ] **Step 2: Show progress**

Show the tree, a per-file state, and totals. Register a `beforeunload`
handler while any file is in flight. A failed file retries through the grant
route. When the browser cannot select a directory, show the computer-folder
instruction and keep the multi-file picker.

- [ ] **Step 3: Batch screen**

Members see status and can download clean files. Operators can change tags
through a server action that writes `file.tagged`. Discard is visible only
while HND-005 allows it.

- [ ] **Step 4: Commit**

```bash
git commit -m "Upload a folder into a handoff workspace."
```

### Task 13: Operator review

**Files:**
- Modify: `src/app/w/[slug]/page.tsx`
- Modify: `src/app/ops/page.tsx`

- [ ] **Step 1: Workspace screen**

Show batch status, who created it, and the note. Provide invite and revoke
to operators only.

- [ ] **Step 2: Empty and error states**

A new workspace explains what to send: brand, photos, copy, exports, and
reference files. A refused manifest shows the server reason. A scanning
batch shows that downloads open after the scan.

- [ ] **Step 3: Commit**

```bash
git commit -m "Let the build team review a handoff workspace."
```

---

## Phase 4 — Verification

### Task 14: End-to-end checks

- [ ] **Step 1: Run the automated suite**

```bash
npm test
npm run build
```

Expected: both succeed. Confirm no test opens a network connection.

- [ ] **Step 2: Exercise one drop against a staging project**

Use a folder that contains a nested image, a PDF larger than 100 MB, a
`.env` file, and a path with `..` if the picker allows it. The image and PDF
reach `clean` and download as attachments. The `.env` file and the escaping
path do not create objects. A second workspace is invisible to the client.
Revoking the membership blocks the next download.

- [ ] **Step 3: Confirm the boundary**

The operations repository has no new runtime code from this work. The
Handoff project uses its own Supabase project and its own Vercel project.

- [ ] **Step 4: Commit any fix found in staging**

```bash
git commit -m "Fix handoff issues found in the staging drop."
```

Skip this commit when staging finds nothing.

## Done when

The acceptance list in the design spec is true for a Strong Foam staging
invite, and the operations application is unchanged.
