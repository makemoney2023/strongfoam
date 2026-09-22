# Strong Foam Insulation — website rebuild

Next.js App Router rebuild: 3D scroll-world marketing site (AEO / SEO / GEO).

**Remote:** https://github.com/makemoney2023/strongfoam.git

## Run

```bash
npm install
npm run dev          # http://localhost:3000
npm test
npm run build
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

If `DATABASE_URL` is unset, or `OPS_DEMO=1`, the review workspace uses local
demo requests so the UI can be exercised without Postgres.

Production operations requirements:

- Set both `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`. Database-backed job
  uploads fail closed when private Blob storage is unavailable; they never use
  ephemeral process memory.
- Run `npm run db:migrate` as a release step before deploying application code.
  Migration `0010_user_administration.sql` is required for revocable sessions
  and user lifecycle audit events. Apply `0013_plan_revision_integrity.sql`
  before revision writes, `0014_job_voice_notes.sql` before serving voice-note
  code,   `0015_plan_annotation_geometry.sql` for circle, polygon, arrow,
  and text marks, `0016_task_stated_quantity.sql` before storing a stated
  task quantity in bags or square feet, `0017_price_book_items.sql` before
  storing price-book items, and `0018_organization_scope_audit.sql` before
  organization-scoped commercial writes, `0019_background_execution.sql`
  before the Render worker claims outbox jobs, and `0020_commercial_documents.sql`
  before storing bid-package documents, `0021_price_book_versions.sql`
  before approving a new price-book revision, `0022_estimates.sql` before
  storing an estimate version, and `0023_estimate_approvals_proposals.sql`
  before recording an estimate approval. The current Vercel Hobby deploy still uses the in-memory
  demo store (`OPS_DEMO` or no `DATABASE_URL`), so those SQL files apply when
  Postgres is attached.

```bash
npm test
npm run db:generate
npm run db:migrate
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

Application traffic uses `DATABASE_URL`, the Supabase pooled connection.
`npm run worker` uses `WORKER_DATABASE_URL` for pg-boss and the outbox.
`npm run db:migrate` uses `DIRECT_URL`. Outside production, the worker and
migration URLs fall back to `DATABASE_URL`. Production fails closed when either
is missing. Supabase project credentials stay outside this repository.

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

Apply migrations through `0025_commercial_ai.sql` before enabling the flags.
Run the worker as a Render background service with `npm run worker`. Bid files
stay in private Blob storage and remain quarantined until the scanner marks
them clean. A failed scan, extraction, proposal draft, or conversion publication
appears on Home for that organization only.

To roll a capability back, set its flag to `0` and redeploy the web service.
In-flight worker jobs can finish, and they cannot start a new AI draft, proposal
delivery, or conversion while the flag is off. Revoke a proposal review link
from the estimate page; revocation blocks later views and decisions for that
token. Do not delete estimate versions, approvals, or document versions to undo
a rollout.

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
