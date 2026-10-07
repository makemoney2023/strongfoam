# Strong Foam Insulation — website rebuild

Next.js App Router rebuild: 3D scroll-world marketing site (AEO / SEO / GEO).

**Remote:** https://github.com/makemoney2023/strongfoam.git

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test
npm run build
npm run deploy       # OpenNext build, then Cloudflare Workers
```

## Cloudflare

The site deploys as its own Worker, `strongfoam`, on the Abracadabra account
(`6f6959ecba86d1de4d6cf6aa0b34528d`). Preview:
`https://strongfoam.abracadabra-ai.workers.dev`.

`npm run deploy` builds with OpenNext and publishes that Worker. It does not
redeploy `abracadabra-marketing`, `handoff`, `handoff-hq`, or `readiness-check`.

Model drafts are specified to go through `StrongfoamAgent` and AI Gateway
`strongfoam`. The design is
`docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`. The
implementation plan is
`docs/superpowers/plans/2026-10-06-cloudflare-agents.md`. D1 stays the system
of record. A person confirms a draft before a business row changes.

Cloudflare resources for this app only. Do not reuse handoff's database,
bucket, or queues:

| Binding | Resource |
|---------|----------|
| `DB` | D1 database `strongfoam` (`91cb6932-3463-4431-830c-bb3e05b6fe6f`: CRM, jobs, and rate limits) |
| `FILES` | R2 bucket `strongfoam` (private uploads) |
| `JOBS` | Queue `strongfoam-jobs` and dead-letter queue `strongfoam-jobs-dlq` |
| `AI` | Workers AI through AI Gateway `strongfoam` |
| `STRONGFOAM_AGENT` | Durable Object agent `StrongfoamAgent` |

Companies, contacts, opportunities, projects, jobs, estimates, and the rest of
the staff records live in that D1 database. JSON columns are stored as text.
The staff workspace uses demo data only when `OPS_DEMO=1` or the `DB` binding
is missing. Background jobs are sent to `strongfoam-jobs`, and a daily cron
runs import retention. The incremental cache does not use R2.

Auth for deploy is `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the
environment. Do not commit them. After the first deploy, apply the D1 migration:

```bash
CI=1 npx wrangler d1 migrations apply strongfoam --remote
```

## Layout

| Path | Role |
|------|------|
| `src/app/` | App Router (home scroll-world, `/request-estimate`, `/app`) |
| `src/content/site.ts` | NAP, services, FAQ, scroll overlays |
| `src/lib/site-schema.ts` | Organization / WebSite / FAQ `@graph` |
| `src/lib/leads/` | Estimate survey qualification, HMAC, rate limits |
| `src/lib/ops/` | Staff auth, estimate-request review, workflow rules |
| `src/components/` | Header, scroll page, estimate survey, shadcn/ui |
| `assets/` | Brand / projects / Omni loops |
| `public/media/*` | Copied from `assets/` on `predev` / `prebuild` |
| `docs/` | Brief, dossier, recovered copy, SEO pack |
| `.cursor/skills/` | scroll-craft, gemini-omni, SEO, design |

Scroll behavior and asset-placement decisions are documented in
[`docs/scroll-world-direction.md`](docs/scroll-world-direction.md).

## Copy for overlays

See [`docs/copy-overlay-readiness.md`](docs/copy-overlay-readiness.md).  
**Short answer:** yes for services / FAQ / contact / trust; stubs remain for process steps and project captions; hero H1 is a draft from ICP pillars.

## Omni backgrounds

```bash
npm run omni:bg -- --priority   # or --all
```

Requires `GEMINI_API_KEY` in `.env.local` (gitignored).

## Estimate survey

Indexed wizard at `/request-estimate`. Confirmation at `/request-estimate/thanks` is `noindex`. Qualified leads can book via HMAC-gated Calendly.

Staff review lives at `/app/login` and `/app/requests`. Converted CRM records
live at `/app/companies` and `/app/opportunities`. Won work becomes a project
and jobs at `/app/projects` and `/app/jobs`. Administrators manage individual
Office and Field identities, roles, credentials, access, and sessions at
`/app/users`. Field assignments feed the project Schedule and the separate
`/field/login` and `/field` application surface. The staff workspace uses
shadcn/ui. Individual users authenticate from the shared users/memberships
model; `OPS_STAFF_EMAILS` and `OPS_STAFF_PASSWORD` remain a bootstrap fallback
only for emails that do not have a database-backed identity.
`OPS_ADMIN_EMAILS` limits which fallback identities may administer users; when
it is unset, the existing staff email list is used for migration compatibility.

If the D1 binding is missing, or `OPS_DEMO=1`, the review workspace uses local
demo requests. On the Worker, `DB` is bound, so `/app` reads and writes D1.
The database starts with the Strong Foam organization and no staff user.
`OPS_STAFF_EMAILS` and `OPS_STAFF_PASSWORD` are the bootstrap login until a
user row exists. Do not invent those values.

Production operations requirements:

- Apply `migrations/0002_operations.sql` with
  `CI=1 npx wrangler d1 migrations apply strongfoam --remote` before the Worker
  that reads those tables is serving traffic.
- Private uploads use the `FILES` R2 binding. Job uploads fail closed when that
  binding is missing; they never use ephemeral process memory.

```bash
npm test
CI=1 npx wrangler d1 migrations apply strongfoam --remote
```

Environment names (values live in `.env.local`, never committed):

```
DATABASE_URL
WORKER_DATABASE_URL
DIRECT_URL
BLOB_READ_WRITE_TOKEN
RESEND_API_KEY
RESEND_FROM
LEAD_NOTIFY_TO
LEAD_THANKS_SECRET
NEXT_PUBLIC_CALENDLY_URL
CALENDLY_WEBHOOK_SIGNING_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
OPS_SESSION_SECRET
FIELD_SESSION_SECRET
OPS_STAFF_EMAILS
OPS_ADMIN_EMAILS
OPS_STAFF_PASSWORD
OPS_DEMO
DEEPGRAM_API_KEY
AI_GATEWAY_API_KEY
AI_GATEWAY_MODEL
AI_DOCUMENT_MODEL
AI_COMMERCIAL_MODEL
CLAMAV_HOST
CLAMAV_PORT
COMMERCIAL_ESTIMATES_ENABLED
BID_DOCUMENT_EXTRACTION_ENABLED
COMMERCIAL_AI_ENABLED
SIGNED_PROPOSALS_ENABLED
ACCEPTED_ESTIMATE_CONVERSION_ENABLED
COMMERCIAL_ORGANIZATION_IDS
COMMERCIAL_FLAG_OVERRIDES
COMMERCIAL_WORKFLOW_TESTS_PASSED
COMMERCIAL_AI_EVALUATION_PASSED
COMMERCIAL_DATA_RESIDENCY_APPROVED
COMMERCIAL_AI_MONTHLY_COST_LIMIT_CENTS
COMMERCIAL_AI_RATE_LIMIT_PER_HOUR
COMMERCIAL_HEARTBEAT_ORGANIZATION_ID
VOICE_RETENTION_DAYS
VOICE_CONSENT_NOTICE
WORKER_ID
```

The Worker reads and writes CRM and job records through the D1 binding `DB`.
`DATABASE_URL`, `WORKER_DATABASE_URL`, and `DIRECT_URL` are not used by that
Worker. `npm run worker` remains the local pg-boss process and is not the
Cloudflare queue consumer.

`npm run worker` starts the Render background process. It claims pg-boss work,
records a heartbeat, and stops cleanly on SIGTERM. It does not serve the Next.js
app. Every 15 seconds it stores a completed `worker-heartbeat` row for the
Strong Foam organization. Commercial AI stays disabled until that heartbeat is
newer than 60 seconds.

## Commercial bid workflow

Manual estimates, bid-package extraction, signed proposals, and accepted-estimate
conversion can each be turned on without commercial AI. Outside production, and
whenever `OPS_DEMO=1`, an unset flag leaves that capability available. In
production, set the matching flag to `1`:

```
COMMERCIAL_ESTIMATES_ENABLED
BID_DOCUMENT_EXTRACTION_ENABLED
SIGNED_PROPOSALS_ENABLED
ACCEPTED_ESTIMATE_CONVERSION_ENABLED
COMMERCIAL_AI_ENABLED
```

`COMMERCIAL_ORGANIZATION_IDS` limits those flags to a comma-separated
organization list. `COMMERCIAL_FLAG_OVERRIDES` is a JSON object keyed by
organization id, then by flag name, when one organization needs a different
value.

Commercial AI stays off unless all of these are true:

- `COMMERCIAL_AI_ENABLED=1`
- `COMMERCIAL_WORKFLOW_TESTS_PASSED=estimates,approvals,proposals,conversion`
- `COMMERCIAL_AI_EVALUATION_PASSED=geometry,price,prompt-injection,citation,cross-organization`
- `COMMERCIAL_DATA_RESIDENCY_APPROVED=1`
- `CLAMAV_HOST` and `CLAMAV_PORT` point at the scanner
- `AI_DOCUMENT_MODEL` names the residency-approved extraction model
- `AI_GATEWAY_API_KEY` and `AI_COMMERCIAL_MODEL` (or `AI_GATEWAY_MODEL`) are set
- `COMMERCIAL_AI_MONTHLY_COST_LIMIT_CENTS` and `COMMERCIAL_AI_RATE_LIMIT_PER_HOUR` are positive integers
- the Render worker heartbeat for that organization is healthy

Apply `migrations/0005_quality_records.sql` before using deficiency and
rework records, `migrations/0004_closeout_packet.sql` before using the
closeout packet, and `migrations/0003_closeout.sql` before using closeout.
Apply migrations through `0036_inspections.sql` before using inspections,
through `0035_equipment_assignments.sql` before using
equipment, through `0034_purchase_orders.sql` before using purchase
orders, through `0033_production_target_open.sql` before using workforce
performance, through `0031_labor_entries.sql` before using labor, through
`0030_dispatches.sql` before using day dispatch, and
through `0029_change_orders.sql` before using change orders,
and through `0025_commercial_ai.sql` before enabling the commercial flags.
Run the worker as a Render background service with `npm run worker`. Bid files
stay in private Blob storage and remain quarantined until the scanner marks
them clean. A failed scan, extraction, proposal draft, or conversion publication
appears on Home for that organization only.

Change orders live on the project. Office staff can draft, edit, submit, and void
them. An administrator approves or rejects a submitted order; the comment, actor,
and content hash are the approval evidence. The existing commercial approval rule
asks for a second administrator when the absolute price reaches its threshold.
Approval writes one budget effect. The revised project total is the original
estimate budget plus approved effects, and the approved schedule-impact days are
summed beside it. Task dates are not moved. Draft and pending orders show on Home
for people who can read change orders.

Day dispatch is a separate board from job assignments. Office staff schedule or
cancel one active field member on one job for one date. Cancelling keeps the
row, and scheduling that same job, person, and date again marks it scheduled.
Two jobs for the same person on the same day are allowed and shown on the
board and on Home. Home also lists active jobs with nobody scheduled that day.
The field landing shows that person's scheduled rows for the Toronto working
day, and a scheduled row lets them open the job that day.

Field labor is hours or piece work. Piece work is a whole number of bags or
square feet for one person, job, and date. Hours are a duration up to 24 hours.
The same person can have both, and saving the same measure again updates it.
The dispatch board lists the day's labor. The field landing records only the
signed-in person's labor. No rate or wage is stored. The `labor_entries` table
is created by `migrations/0002_operations.sql`.

A purchase order cites open material requests on one job. Office staff enter a
supplier and draft the order, then mark it ordered or cancel it. Cancelling
keeps the order and lets those requests be drafted again. A material request
can store an optional whole quantity and field unit. The line copies the
request text and that quantity. No price is stored. A cited request cannot be
deleted. Home lists open-job drafts and requests that are not on an active
order. Purchase orders are in `migrations/0002_operations.sql`. Home and the
job pages read those tables.

Equipment is a named assignment on one job. Office staff assign it or release
it. Releasing keeps the row, and assigning that same name again marks it
assigned. Home lists the same name on more than one open job. No rate is
stored. Equipment assignments are in `migrations/0002_operations.sql`. Home
and the job pages read that table.

An inspection is a named result on one job. Office staff record open, passed,
or failed, and an optional note. Recording the same name updates that row.
Home lists open and failed results on jobs that are still open. A passed row
and a closed job do not count. No price is stored. Inspections are in
`migrations/0002_operations.sql`. Home and the job pages read that table.
Inspections are not part of the workforce quality label.

A quality record is a deficiency or a rework item on one job. Office staff
record open, corrected, or reopened. The same kind and name updates that row.
Home lists open and reopened rows on jobs that are still open. No price is
stored. Quality records are in `migrations/0005_quality_records.sql`.

Closeout is one status on an open job: preparing, ready, or signed. Signed
waits until every inspection on that job has passed. Home lists preparing and
ready closeouts. The job page also stores one insulation assembly and can save
the closeout packet draft. Saving does not send it. Apply
`migrations/0003_closeout.sql` and `migrations/0004_closeout_packet.sql`.
Dispatch can set a field member to 1, 2, or 3 jobs in a day. The job page
recommends a person who still has capacity, and accepting assigns that open
task.

Workforce performance is separate from pay. Production and preview are set to
`OPS_WORKFORCE_PERFORMANCE=1`. `0` keeps it off. Demo mode enables it when the
variable is unset. Office staff approve a production target, record installed bags or
square feet, and verify a field member's draft. Individual production is one
person; crew production is the shared quantity. The field landing shows that
person's own pace and explains a missing score. The office list does not assign
a rank, and no wage is stored. A deficiency or rework record on a job that
person worked shows as quality beside the efficiency number. No record stays
“not available,” and a corrected set shows “clear.” Inspections stay off that
label. Production tables are in `migrations/0002_operations.sql`. Quality
records are in `migrations/0005_quality_records.sql`.

To roll a capability back, set its flag to `0` and redeploy the web service.
In-flight worker jobs can finish, and they cannot start a new AI draft, proposal
delivery, or conversion while the flag is off. Revoke a proposal review link
from the estimate page; revocation blocks later views and decisions for that
token. Do not delete estimate versions, approvals, or document versions to undo
a rollout.

Import Center staging lives in D1 tables `private_data_import_batches`
(including `file_bytes`), `private_data_import_sheets`, `private_data_import_rows`,
`private_data_import_events`, `private_data_import_mapping_profiles`, and
`private_external_record_keys`. Apply `migrations/0002_operations.sql` before a
durable import. Source files for imports stay in those rows or in the private
`FILES` bucket: no public listing and no cross-organization object list.

The worker schedules `data-import.retain` every day at 09:15 UTC. That job clears source bytes and normalized row values for finished batches.
Cancelled batches lose the source file immediately. Failed batches lose it after 7
days. Completed batches lose it after 30 days. Normalized row values are cleared
after 90 days. The batch summary, source keys, and events stay. A later retention
run does not fail when the source is already gone. Dead-letter jobs of kind
`data-import.analyze`, `data-import.commit`, or `data-import.retain` show on Home
for staff who can prepare imports, with failed batches, completed price drafts, and
inactive imported users. Retry a dead letter from the worker queue after the cause
is fixed; do not re-upload a completed batch to force a retry.

`npm run import:verify-environment` prints pass/fail JSON for a staging or production
checklist. It does not open a database connection and does not print credentials.
Set `IMPORT_VERIFY_TARGET` to `staging` or `production`, `IMPORT_DATABASE_LABEL` to
that same word, `IMPORT_WORKER_CLAIMED=1` after the worker claims a probe job, and
`IMPORT_BACKUP_CONFIRMED=1` before a production cutover. Leave
`IMPORT_RUNTIME_MATCHES_MIGRATION`, `IMPORT_BUCKET_PUBLIC`,
`IMPORT_ROLLBACK_LEFT_PROBE`, and `IMPORT_EXPOSED_SCHEMAS` unset when those checks
pass. Rehearse the cutover on staging before production. See
`docs/runbooks/data-import-cutover.md`.

Voice notes store audio privately (demo memory, production Blob). Transcription
runs after save: a demo stub in `OPS_DEMO`, Deepgram Nova-3 (`en-US`) when
`DEEPGRAM_API_KEY` is set, otherwise an empty machine transcript so the user can
type from the audio.

In demo mode, Office and Field display their seeded logins on their respective
login pages. Production must set a distinct `FIELD_SESSION_SECRET`. Field access
is derived from structured job/task assignments, not free-text foreman or
assignee labels.

See `.env.example` for the same names with empty values.

## Stack

Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · GSAP · Three / R3F · Vitest
