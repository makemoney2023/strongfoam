# Handoff — Design Specification

**Date:** 2026-10-05
**Product:** Handoff
**Status:** Proposed, implementation-ready
**Requirements:** HND-001 through HND-032
**Lives in:** its own repository, Vercel project, and Supabase project

## Executive summary

Handoff is a private locker where the company that will use the operations
platform sends the files needed to build their tech stack. Strong Foam is the
first workspace. Their people drop folders of brand files, photography, copy,
spreadsheets, and reference material. The build team browses that tree and
downloads what it needs.

```text
invite
  → sign in with a magic link
  → drop a folder
  → browser uploads each file straight to private storage
  → worker scans the object
  → build team downloads clean files
```

A drop changes nothing in the operations platform. It does not create a
customer, a price, a job, a page, or an import batch. Someone on the build
team carries a chosen file into the site or the Import Center by hand, later,
outside this product.

Handoff is not a module of the ERP. It does not share the ERP database, the
staff session cookie, the field login, Vercel Blob, or any route under the
operations app. Shipping Handoff does not require a change to the ERP
application or to `docs/strongfoam-crm-erp-prd.md`.

## Current state

The operations app can accept a few private PDFs and images, 25 MB each, on a
lead, a job, or an opportunity. Those uploads are evidence for estimating and
field work. They are the wrong cabinet for a brand library, a photo archive,
or an export of the system the company uses today.

There is no place for that company to send a folder to the people building
the software.

## Goals

1. Let an invited person from the client company upload a folder, or many
   files, without an ERP account.
2. Keep the original folder tree visible to the build team.
3. Accept large files by uploading bytes directly to private storage, with
   retry and resume.
4. Hold every object until a scan finishes, and keep rejected files closed.
5. Let the build team download a clean file, and let the client see the
   status of the workspace's drops.
6. Record who uploaded, who downloaded, and who changed access.
7. Run as a separate application so an operations deploy cannot take the
   locker down, and a locker deploy cannot change operational data.

## Non-goals

- A route, table, role, or session inside the operations platform.
- Creating or updating companies, contacts, prices, jobs, pages, or Import
  Center batches.
- Reading file contents with a model, running OCR, or generating thumbnails.
- Rendering uploaded HTML, SVG, PDF, or images inside the portal.
- Unpacking ZIP archives.
- Two-way sync with a laptop folder.
- Versioning one path in place. A later drop is a new batch, even when a
  relative path repeats.
- Client accounts for every employee, comments, or shared-drive permissions.
- Per-workspace build-team access control. v1 operators can open every
  workspace in that deployment. A client that must be isolated from another
  client's operators gets its own Handoff deployment.
- Proposal review, job photos, warranty, or any customer of a construction
  job. Those portals, if they are ever built, belong to the operations
  platform and are specified separately.

## Terms

- **Workspace:** One client engagement. Strong Foam is the first.
- **Client member:** A person invited from that company. They can upload and
  can see every batch in their workspace.
- **Operator:** A person on the build team. Operators can open every workspace
  in the deployment.
- **Batch:** One drop. It has a label, an optional note, and a set of files.
- **Relative path:** The folder path from the client's machine, stored as a
  label. It is not the storage key.
- **Object key:** The server-chosen private path
  `{workspaceId}/{batchId}/{fileId}`.
- **Grant:** Permission for one signed-in member to write one object key
  while that file row is still awaiting bytes.

## Access model

**HND-001.** A person signs in only by email magic link. Handoff does not
accept the ERP session cookie, and the ERP does not accept a Handoff session.

**HND-002.** The first operator is created from
`HANDOFF_OPERATOR_EMAILS` when the operator table is empty. After that,
operators are rows. An operator invites or revokes other operators in the
product. Removing a row removes access on the next request.

**HND-003.** An operator creates a workspace and invites a client by email.
The invite expires in 14 days, stores only a hash of its token, and can be
revoked. Resending rotates the token and invalidates the previous one. One
live invite exists per email per workspace.

**HND-004.** Accepting an invite creates a client membership for that
workspace. The same email may belong to several workspaces. Signing in shows
only the workspaces that membership allows. An operator sees all of them.

**HND-005.** A client member can create batches, upload into their workspace,
see every batch in that workspace, and download clean files there. A client
cannot invite, revoke, tag, or delete a batch that already has a clean file.
A client can discard a batch only while none of its files are clean.

**HND-006.** An operator can create workspaces, invite and revoke members,
tag files, download clean files, and delete a batch. Delete removes the
objects and the file rows. The audit event remains, with names and sizes, and
without bytes or download URLs.

**HND-007.** A signed-out visitor, or a signed-in person with no membership
and no operator row, receives no workspace names, filenames, or object keys.

## Upload

**HND-008.** The browser sends a manifest. Each entry has a relative path, a
byte size, and a declared content type. The request body carries no file
bytes. A manifest larger than 1 MB is refused.

**HND-009.** The server checks the whole manifest before it writes a batch.
One invalid entry refuses the batch. Checks are:

| Rule | Limit |
|---|---|
| Files in one batch | 2,000 |
| Bytes in one batch | 10 GB |
| Bytes in one file | 2 GB |
| Empty file | refused |
| Relative path length | 512 characters |
| Path depth | 16 segments |
| Segment length | 255 characters |
| Batches started per workspace | 10 per rolling hour |

**HND-010.** A relative path is a normalized label. The server rejects
absolute paths, backslashes, `..`, empty segments, control characters, and
leading dots on a segment other than a single allowed extension file such as
`.gitignore` is still refused. Names are compared in Unicode NFC. Two entries
that normalize to the same path refuse the batch.

**HND-011.** v1 accepts these extensions only, compared case-insensitively
against the final extension. A name with a blocked extension anywhere in the
suffix, such as `report.pdf.exe`, is refused.

| Group | Extensions |
|---|---|
| Images | `jpg`, `jpeg`, `png`, `webp`, `gif`, `tif`, `tiff`, `heic`, `svg` |
| Design | `ai`, `eps`, `psd`, `indd` |
| Video | `mp4`, `mov`, `webm` |
| Documents | `pdf`, `doc`, `docx`, `xls`, `xlsx`, `csv`, `ppt`, `pptx`, `txt`, `md`, `rtf` |
| Data | `json`, `xml` |
| Web snapshot | `html`, `htm`, `css` |
| Fonts | `otf`, `ttf`, `woff`, `woff2` |
| Archive | `zip` |
| Drawings | `dwg`, `dxf` |
| Icon | `ico` |

**HND-012.** These names and extensions are refused even if they would
otherwise match: `.env` and any `.env.*`, `id_rsa`, and extensions `pem`,
`key`, `p12`, `pfx`, `kdbx`, `exe`, `dll`, `bat`, `cmd`, `com`, `scr`, `ps1`,
`sh`, `bash`, `msi`, `jar`, `js`, `mjs`, `cjs`, `7z`, `rar`.

**HND-013.** On success the server writes one batch and one file row per
entry, status `pending`, and returns an object key per file. The key is
`{workspaceId}/{batchId}/{fileId}`. The client's filename is not part of the
key.

**HND-014.** The browser uploads each object with the Supabase Storage
resumable protocol, in chunks of 6 MiB, at most 3 files at a time. Bytes do
not pass through the Next.js server. The storage file size limit on the
Handoff Supabase project is set to at least 2 GB before the first real drop.

**HND-015.** Storage write access exists only while a file row is `pending`
or `uploading`, the caller is a live member of that workspace, and the object
name is exactly that row's key. Grants expire 2 hours after the batch is
created. A later retry of the same batch mints a fresh grant for files that
are still `pending`, `uploading`, or `failed`. Clean, rejected, and uploaded
files are not writable again.

**HND-016.** The completion call is idempotent. The server confirms the
private object exists and its size equals the manifest size, then marks the
file `uploaded` and enqueues a scan. A second completion of the same file
returns the current row and does not enqueue a second scan.

**HND-017.** The upload screen shows the folder tree, per-file progress, and
a count of finished, failed, and remaining files. While a transfer is in
flight, closing or reloading the page asks for confirmation. A failed file
can be retried from the same batch. A phone that cannot pick a directory
still accepts a multi-file selection, and the screen tells the person to use
a computer for a whole folder.

**HND-018.** The client may set a batch label and a note of at most 2,000
characters. The client may set one tag on a file at manifest time. Allowed
tags are `brand`, `photo`, `copy`, `data_export`, `reference`, and `other`.
An operator may change a tag later. A tag does not start an import, a
publish, or a scan.

## Scan and download

**HND-019.** An uploaded file stays unavailable for download until the scan
worker marks it `clean`. The worker reads the object from private storage.

**HND-020.** The scan refuses a file when the leading bytes contradict a
known signature for its extension. Extensions without a reliable signature
(`txt`, `md`, `csv`, `svg`, `json`, `xml`, `html`, `htm`, `css`, and the
design and drawing types) are accepted on extension and size alone. When
`CLAMAV_URL` is set, the worker also requires a clean malware result. When it
is unset, the signature and policy checks still run, and the file can become
`clean`. A worker crash leaves the file `scanning` or returns it to
`uploaded` for retry. It never becomes `clean` because the scanner was down.

**HND-021.** A rejected file records a short reason. Its object is deleted
14 days later. The row remains. Rejected bytes are not downloaded.

**HND-022.** A download is a private signed URL that expires in 5 minutes,
issued only for a `clean` object, only to a client member of that workspace
or an operator. The response content disposition is attachment. The portal
does not preview, transcode, or inline any object.

**HND-023.** v1 does not build a ZIP of a batch. The batch screen lists the
tree and downloads one clean file at a time. A JSON manifest of the tree
(paths, sizes, tags, statuses, and no URLs) is available to members and
operators.

## Records

**HND-024.** Identifiers are UUIDs. Byte sizes are 64-bit integers. Timestamps
are timezone-aware.

Tables:

| Table | Purpose |
|---|---|
| `workspaces` | `id`, `name`, `slug`, `created_at`, `archived_at` |
| `operators` | `id`, `email`, `created_at`, `revoked_at` |
| `invites` | `id`, `workspace_id`, `email`, `token_hash`, `expires_at`, `accepted_at`, `revoked_at` |
| `memberships` | `workspace_id`, `email`, `created_at`, `revoked_at` |
| `batches` | `id`, `workspace_id`, `created_by_email`, `label`, `note`, `status`, `created_at`, `expires_at` |
| `files` | `id`, `batch_id`, `workspace_id`, `relative_path`, `extension`, `declared_content_type`, `size_bytes`, `object_key`, `tag`, `status`, `rejection_reason`, `created_at`, `uploaded_at`, `scanned_at`, `object_deleted_at` |
| `audit_events` | `id`, `workspace_id`, `actor_email`, `action`, `subject_type`, `subject_id`, `at`, `metadata` |

`files.object_key` is unique. `(batch_id, relative_path)` is unique.
`workspaces.slug` is unique. Operator email and membership email are stored
in lowercase.

Batch status is derived:

| Status | When |
|---|---|
| `uploading` | Any file is `pending`, `uploading`, or `failed`, and the batch has not expired |
| `scanning` | Every file is `uploaded`, `scanning`, `clean`, or `rejected`, and at least one is not finished |
| `ready` | At least one file is `clean`, and none are still in flight |
| `rejected` | Every file is `rejected` or `failed`, and none are in flight |
| `discarded` | A client discarded it before any file was clean, or an operator deleted it |

File status moves in one direction except retries:
`pending` → `uploading` → `uploaded` → `scanning` → `clean` or `rejected`.
`uploading` and `uploaded` may return to `failed` when the grant expires or
the completion check fails. `failed` may return to `uploading` on retry.

**HND-025.** Audit actions are `workspace.created`, `invite.created`,
`invite.revoked`, `invite.accepted`, `operator.added`, `operator.revoked`,
`batch.created`, `batch.discarded`, `file.uploaded`, `file.scanned`,
`file.downloaded`, `file.tagged`. Metadata may include a relative path, a
size, a tag, and a scan reason. Metadata must not include a signed URL, an
upload token, a session token, or file bytes.

**HND-026.** Archived workspaces refuse new batches and new invites. Existing
clean files remain downloadable until an operator deletes the batches.

## Application surface

The app is a Next.js App Router project in its own repository.

| Route | Who | What they do |
|---|---|---|
| `/` | Visitor | Request a magic link. No workspace list. |
| `/auth/callback` | Returning visitor | Finish the magic link and land on the workspace list. |
| `/workspaces` | Member or operator | List workspaces that person can open. |
| `/w/[slug]` | Member or operator | List batches. Clients start a drop. Operators invite and revoke. |
| `/w/[slug]/batches/[batchId]` | Member or operator | Tree, progress, retry, tag, download. |
| `/ops` | Operator | Create a workspace. Add or revoke operators. |

Server routes:

| Route | Purpose |
|---|---|
| `POST /api/workspaces/[slug]/batches` | Validate a manifest and create rows |
| `POST /api/batches/[batchId]/files/[fileId]/grant` | Refresh one upload grant |
| `POST /api/batches/[batchId]/files/[fileId]/complete` | Verify the object and enqueue scan |
| `POST /api/batches/[batchId]/files/[fileId]/download` | Return a 5-minute attachment URL |
| `GET /api/batches/[batchId]/manifest` | JSON tree without URLs |
| `POST /api/batches/[batchId]/discard` | Client discard while no file is clean |

Every route resolves the caller from the Handoff session, then calls a pure
authorization function. The database is queried with the server key. The
browser never receives that key.

## Storage and scan worker

**HND-027.** One private bucket, `handoff`, holds objects. The bucket has no
public policy. Authenticated storage writes are limited by HND-015. Reads for
download go through the server key.

**HND-028.** A separate worker process polls for `uploaded` files, marks them
`scanning`, scans, and finishes `clean` or `rejected`. The same job is safe
to run twice. The worker uses the database and the storage key, and it does
not serve HTTP traffic except a health check. It stores nothing durable on
its own disk.

**HND-029.** Expired upload grants are swept by the same worker. A file still
`pending` or `uploading` after the batch expiry becomes `failed`. Rejected
objects past 14 days are deleted.

## Security

**HND-030.** Secrets live in the server and worker environment only:
`SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `CLAMAV_URL`. The browser receives
the project URL and the publishable key.

**HND-031.** Rate limits, counted in the database, refuse a workspace that
starts more than 10 batches in an hour and an operator who creates more than
30 invites in a day. Magic-link requests are limited by Supabase Auth.

**HND-032.** Logs may include workspace id, batch id, file id, and status.
Logs must not include object bytes, magic-link tokens, signed URLs, or the
service key.

The upload page states, in plain language, that the locker is for brand,
photos, copy, exports, and reference files, and that passwords, key files,
and environment files are refused.

## Environment

```text
NEXT_PUBLIC_SUPABASE_URL        Handoff project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY             Server and worker only
DATABASE_URL                    Pooled Postgres connection
DIRECT_URL                      Migration connection
HANDOFF_BUCKET                  handoff
HANDOFF_OPERATOR_EMAILS         Bootstrap only, comma-separated
CLAMAV_URL                      Optional malware scanner
```

Provision the Supabase project in the region already chosen for the
operations platform. Do not launch a real client drop until that region is
confirmed. The locker will hold customer lists and prices.

## Acceptance

A build is ready for a Strong Foam invite when all of the following are true:

1. An operator can create the Strong Foam workspace and invite one client
   email. That person can sign in and cannot see a second workspace.
2. That person can drop a nested folder of mixed allowed types, including one
   file over 100 MB, and see per-file progress, including after a retry.
3. A file over the size cap, a `.env` file, and a path containing `..` never
   create an object.
4. A clean file downloads as an attachment for the client and for an
   operator. A file that is still scanning, or that was rejected, does not.
5. Revoking the invite blocks the next request from that person.
6. No table, cookie, or route in the operations application changes as part
   of this work.
7. Automated tests cover path policy, extension policy, authorization,
   manifest refusal, idempotent completion, and the scan decision without
   calling a live Supabase project.
