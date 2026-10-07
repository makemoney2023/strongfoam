# Changelog

## 2026-10-06

- **What changed** — Job summaries and commercial drafts call a named `StrongfoamAgent` instance. A requested model is used, or the run fails. Queue and cron handlers run inside the Worker request context. The PRD architecture now describes the Cloudflare Worker, and United States storage is the accepted location.
- **Why** — One shared agent name and a silent model swap would mix records and hide the model that actually ran. Queue jobs could not see D1 outside a request. The requirements still told the next step to build Render and Supabase.
- **Code touchpoints** — `src/lib/cloudflare/agent.ts`, `src/lib/cloudflare/agent-session.ts`, `src/lib/cloudflare/gateway.ts`, `src/lib/ops/ai-gateway.ts`, `src/lib/ops/commercial-ai.ts`, `cloudflare-worker.ts`, `docs/strongfoam-crm-erp-prd.md`
- **Data-flow impact** — A job draft names `org:{organizationId}:job:{jobId}` after the session's organization matches the job. A commercial draft names the opportunity instance. Business rows still change only on confirm.
- **API / schema impact** — None. No new table. `measureTakeoff` calculates square feet, linear feet, or a count and is not on a screen yet.
- **Verification** — `npx vitest run` 728 passed before takeoff. Takeoff tests then passed (7). `npx tsc --noEmit` passed. Deployed Worker version `f13ebfc1-a90c-4895-89b3-4574f40b4866`. Home, staff login, and `/app/jobs` returned success. The live database has no job to draft.

## 2026-10-06

- **What changed** — The agent spec and plan were checked against the code and corrected. Drafts stay in D1 (`ai_runs`, `ai_proposals`), and agent state only tracks runs in progress. Instances are reached with `getAgentByName`. A model that can't be served now fails instead of being replaced. The plan adds confirm and dismiss on the screens, a per-organization run limit, a live check, and a fuller takeoff design: page size, two-point calibration, a takeoff record, a vision model, and an evaluation set. AI-016 and AI-018 are now marked partly built.
- **Why** — The earlier plan would have duplicated the existing draft store, overwritten drafts that share an instance, silently swapped models, measured fractions of a page as if they were page points, and left confirm and dismiss unwired.
- **Code touchpoints** — `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`, `docs/superpowers/plans/2026-10-06-cloudflare-agents.md`, `docs/strongfoam-crm-erp-prd.md`
- **Data-flow impact** — None yet.
- **API / schema impact** — Planned only: migrations `0006` (widen `ai_runs` capability ids) and `0007` (takeoff record), and setting `AI_DAILY_RUN_LIMIT`.
- **Verification** — Docs only. No tests run.

## 2026-10-06

- **What changed** — Plan takeoff is specified as AI-027. The agent may propose a scale and one region. The server calculates the quantity after a person confirms both.
- **Why** — Estimators need measured quantities from plans. A model-invented square footage is not a quantity the estimate can store.
- **Code touchpoints** — `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`, `docs/superpowers/plans/2026-10-06-cloudflare-agents.md`, `docs/strongfoam-crm-erp-prd.md`
- **Data-flow impact** — None yet. A later confirm writes the calculated quantity through the estimate-version command and does not set the price.
- **API / schema impact** — None. The measurement function is specified and not built.
- **Verification** — Docs only. No tests run.

## 2026-10-06

- **What changed** — The Cloudflare agent runtime for the whole application is specified. One `StrongfoamAgent` class serves named instances. Model calls go through AI Gateway `strongfoam`. AI-022 retrieval is Cloudflare AI Search.
- **Why** — Job summaries and commercial proposals do not yet share one agent door, and the deployed Worker may not be exporting the class.
- **Code touchpoints** — `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`, `docs/superpowers/plans/2026-10-06-cloudflare-agents.md`, `docs/strongfoam-crm-erp-prd.md`, `README.md`
- **Data-flow impact** — None yet. The plan routes drafts through the agent and keeps business writes on the existing commands.
- **API / schema impact** — None. No new table.
- **Verification** — Docs only. No tests run.

## 2026-10-06

- **What changed** — Office users can record a deficiency or rework item on an open job, and the workforce view shows that quality beside efficiency.
- **Why** — The performance view was already on, and quality context was waiting on an authoritative deficiency and rework record.
- **Code touchpoints** — `src/lib/ops/quality.ts`, `src/lib/ops/quality-store.ts`, `src/lib/ops/workforce-performance.ts`, `src/components/ops/quality-records.tsx`, `src/app/app/jobs/[id]/page.tsx`, `src/app/app/workforce/page.tsx`, `src/app/app/field/page.tsx`
- **Data-flow impact** — Quality rows are written to D1. The performance calculation reads them for jobs a worker recorded or was scheduled on. Efficiency is unchanged. Inspections are not read into the label.
- **API / schema impact** — D1 migration `migrations/0005_quality_records.sql`.
- **Verification** — `npm test` (712 passed). Remote D1 migration `0005_quality_records.sql` applied. Demo sign-in recorded a deficiency on the north elevation job, and Workforce still showed 100.0% with no rank. `npm run deploy` published Worker version `2bb011ca-a663-4ec9-bcfd-8702358676bb`. `GET https://strongfoam.abracadabra-ai.workers.dev/` returned HTTP 200.

## 2026-10-06

- **What changed** — Office users can record job closeout, an insulation assembly, and a closeout packet draft. Dispatch can set crew capacity, and a job can recommend a field member for an open task.
- **Why** — Closeout, the closeout packet, and the dispatch recommendation were the remaining planned operations slices.
- **Code touchpoints** — `src/lib/ops/closeout.ts`, `src/lib/ops/closeout-store.ts`, `src/lib/ops/assembly.ts`, `src/lib/ops/closeout-packet.ts`, `src/lib/ops/dispatch-recommendation.ts`, `src/lib/ops/crew-capacity-store.ts`, `src/app/app/jobs/[id]/page.tsx`, `src/app/app/dispatch/page.tsx`
- **Data-flow impact** — Closeout, assembly, and crew capacity rows are written to D1. Saving a packet stores text on the closeout and does not send it. Accepting a recommendation assigns the existing task.
- **API / schema impact** — D1 migrations `migrations/0003_closeout.sql` and `migrations/0004_closeout_packet.sql`.
- **Verification** — `npm test` (706 passed). Remote D1 migrations `0003_closeout.sql` and `0004_closeout_packet.sql` applied.

## 2026-10-06

- **What changed** — CRM and job records are stored in the Cloudflare D1 database `strongfoam`, including companies, jobs, estimates, and import staging.
- **Why** — The whole application infrastructure runs on Cloudflare. Operational records no longer depend on Postgres.
- **Code touchpoints** — `src/db/schema.ts`, `src/db/index.ts`, `src/lib/ops/demo-mode.ts`, `src/lib/ops/store.ts`, `src/lib/ops/import-store.ts`, `migrations/0002_operations.sql`
- **Data-flow impact** — Staff reads and writes use the `DB` binding. Demo data loads only when that binding is missing or `OPS_DEMO=1`. JSON is stored as text. Import tables are `private_*`.
- **API / schema impact** — New D1 migration `migrations/0002_operations.sql` creates the operational tables and seeds organization `00000000-0000-4000-8000-000000000001`. `migrations/0001_runtime.sql` is unchanged.
- **Verification** — `npm test` (696 passed). Remote `wrangler d1 migrations apply strongfoam --remote` applied `0002_operations.sql` (206 commands). `organizations` contains Strong Foam Insulation. Tables `companies`, `jobs`, `leads`, and `rate_limits` are present.

## 2026-10-06

- **What changed** — Strong Foam deploys to its own Cloudflare Worker with a new D1 database, R2 bucket, job queue, AI Gateway, and Strongfoam agent.
- **Why** — The app needs to run on the Abracadabra Cloudflare account without touching the existing handoff resources.
- **Code touchpoints** — `wrangler.jsonc`, `cloudflare-worker.ts`, `open-next.config.ts`, `src/lib/cloudflare/`, `src/lib/ops/ai-gateway.ts`, `src/lib/ops/store.ts`
- **Data-flow impact** — Private files go to R2 when the Worker binding is present. Job drafts go through the Strongfoam agent and Workers AI. Lead rate limits use D1. Postgres remains the operational record store.
- **API / schema impact** — New D1 migration `migrations/0001_runtime.sql`. No change to the Postgres migrations.
- **Verification** — `npm test` (696 passed). `npm run deploy` published Worker `strongfoam`. `GET https://strongfoam.abracadabra-ai.workers.dev/` returned HTTP 200 with `server: cloudflare`. Remote D1 migration `0001_runtime.sql` applied to `91cb6932-3463-4431-830c-bb3e05b6fe6f`.
