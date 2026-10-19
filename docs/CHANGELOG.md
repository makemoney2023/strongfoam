# Changelog

## 2026-10-19

- **What changed** — A local golden-path demo loads one Cambridge warehouse job when `OPS_DEMO=1` and `DEMO_GOLDEN=1`. Deterministic AI fixtures for the bid draft, triage, voice, photo captions, daily report, digest, and follow-up run through the existing grounding checks. `npm run demo:golden` refuses a remote D1 binding.
- **Why** — A recording needs the same rich output every take, and a seed must not touch production.
- **Code touchpoints** — `src/lib/ops/golden-path.ts`, `src/lib/ops/demo-ai-fixtures.ts`, `src/lib/ops/demo-seed-guard.ts`, `docs/demo/golden-path.md`.
- **Data-flow impact** — The warehouse rows stay in server memory. Fixtures are off when a gateway or Deepgram key is set. Confirm still does not send customer mail.
- **API / schema impact** — No migration. Scripts `demo:golden` and `demo:reset`.
- **Verification** — `tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 181 files, 937 tests, 1 skipped.

## 2026-10-13

- **What changed** — The field app queues voice and photo notes in IndexedDB and a service worker syncs them as drafts. Office can save a site point, and "I'm here" drafts labor only inside that radius after consent. Confirming a deficiency or safety flag writes a deficiency note. A field lead can propose a quality record that office opens. Confirmed captions for the same area show on the deficiency card.
- **Why** — A dropped connection or an arrival should not write the job, and a deficiency should stay a note until office opens the quality row.
- **Code touchpoints** — `src/lib/ops/field-outbox.ts`, `public/field-sw.js`, `src/app/api/field/sync/route.ts`, `src/lib/ops/geofence.ts`, `src/lib/ops/field-arrival.ts`, `src/app/app/jobs/quality-actions.ts`.
- **Data-flow impact** — Sync rejects status changes and production verification. Arrival stores a labor draft and not the coordinates. Confirming labor records today's hours. Dismiss writes nothing. Inspection results are unchanged.
- **API / schema impact** — `migrations/0007_site_geofences.sql` adds `site_geofences`. `POST /api/field/sync` and `POST /api/field/arrival`.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 177 files, 920 tests, 1 skipped.

- **What changed** — A field photo upload drafts a caption, work-area tag, drum lot, gauge reading, and coverage or safety flags. The worker edits the caption and confirms it before it is saved on the photo. Confirmed captions show in the gallery, the daily report, the closeout photo log, and a printable job photo report.
- **Why** — The crew should not type a caption, and a model must not certify thickness or compliance.
- **Code touchpoints** — `src/lib/ops/photo-caption.ts`, `src/lib/ops/photo-caption-run.ts`, `src/lib/ops/job-photo-report.ts`, `src/app/field/jobs/[id]/photos/report/route.ts`, `src/worker/handlers/photo-caption.ts`.
- **Data-flow impact** — Vision output is a `field.draft` until confirm. Confirm writes `job_documents.caption`. A missing AI binding stores no caption. Usage is purpose `photo_caption` with cache skip.
- **API / schema impact** — `migrations/0006_job_document_caption.sql` adds nullable `job_documents.caption`. Queue kind `field.photo-caption` runs when `JOBS` is bound.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 173 files, 911 tests, 1 skipped.

- **What changed** — One voice transcript becomes quoted drafts for the daily report, a quantity, a blocker, and a material request. Deepgram Nova-3 is called through AI Gateway `strongfoam`. A failed call can use Workers AI Whisper. The end-of-day autopilot stores a daily report built only from confirmed rows, and the field job page prompts until a foreman confirms it.
- **Why** — The crew should speak once, and the report should wait for a person before it is a field note.
- **Code touchpoints** — `src/lib/ops/voice-transcribe.ts`, `src/lib/ops/voice-drafts.ts`, `src/lib/ops/field-daily-report.ts`, `src/lib/ops/automation-run.ts`.
- **Data-flow impact** — Unquoted model cards are dropped. Confirming a quantity does not verify production. The prompt is on the field job page and does not email anyone.
- **API / schema impact** — No migration. Transcription logs to `AI_USAGE` with purpose `voice_transcribe` and `voice_draft`.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 169 files, 902 tests, 1 skipped.

- **What changed** — The Worker entry exports `StrongfoamAgent` as a class. Field labor, production, the field log, and voice notes prefill from today's single dispatch. Voice records become confirm cards before they are written. A blocker button says it marks the job blocked, and verify says the row counts on the worker's record. The field home stores English, French, or Spanish for transcription. A gloves control enlarges the controls, and recording consent is remembered on the device.
- **Why** — The crew should confirm a status change instead of having a voice note block the job as soon as it is saved, and today's job should already be selected.
- **Code touchpoints** — `cloudflare-worker.ts`, `src/lib/ops/field-prefill.ts`, `src/lib/ops/field-drafts.ts`, `src/lib/ops/field-draft-store.ts`, `src/components/field/field-glove.tsx`, `src/app/app/field/page.tsx`.
- **Data-flow impact** — Field drafts are `background_jobs` rows of kind `field.draft`. Confirming a voice blocker writes the note and then marks the job blocked. Dismiss writes nothing. Language is kind `staff.language`. Nothing is emailed.
- **API / schema impact** — No migration. Migration tag `v1` still provisions `StrongfoamAgent`. No second sqlite class tag.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 167 files, 898 tests, 1 skipped.

- **What changed** — A recorded proposal delivery starts a Cloudflare Workflow that drafts a follow-up on day 3, 7, and 14 while the proposal is open. Those drafts are not sent. Revoke and a confirmed accepted or lost reply stop the workflow. A reply that matches an open proposal becomes a status-change draft. Home shows a morning digest, and staff who opt in can receive it by email. `/app/automation` confirms or dismisses many drafts without sending them.
- **Why** — Open proposals need a durable reminder, and the morning list should reach the people who asked for it, without sending customer mail on its own.
- **Code touchpoints** — `src/lib/ops/proposal-followups.ts`, `src/lib/ops/morning-digest.ts`, `src/lib/ops/review-drafts.ts`, `src/worker/proposal-followup-workflow.ts`, `src/app/app/automation/page.tsx`, `wrangler.jsonc`.
- **Data-flow impact** — Follow-up and status drafts are `ops.proposal` rows. Batch confirm does not call `EMAIL.send`. The digest email is limited to opted-in staff addresses. Confirming accepted or lost appends that proposal event and does not create an estimate acceptance.
- **API / schema impact** — No migration. Worker binding `PROPOSAL_FOLLOWUPS`, workflow `strongfoam-proposal-followup`, class `ProposalFollowupWorkflow`. The binding does nothing until that Worker is deployed.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 163 files, 888 tests, 1 skipped.

- **What changed** — Email Routing can deliver mail to the Worker `email` handler. A repeated message stores one proposal, allowed attachments go to R2, and a small-model triage keeps only facts that appear in the message. The review screen records an estimate request without sending mail. An administrator confirms the first-reply draft before it is sent.
- **Why** — Estimating mail should become a request a person accepts, and the first reply should wait for the owner.
- **Code touchpoints** — `src/lib/leads/inbound-mail.ts`, `src/lib/leads/inbound-store.ts`, `src/worker/inbound-email.ts`, `cloudflare-worker.ts`, `src/app/app/requests/inbound/page.tsx`.
- **Data-flow impact** — Intake does not call `reply`, `forward`, `setReject`, or `EMAIL.send`. Accept sets `notifyStatus` to `held`.
- **API / schema impact** — No migration. Proposals are `background_jobs` rows of kind `leads.inbound`.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm test` passed: 159 files, 869 tests, 1 skipped.

- **What changed** — Model calls through AI Gateway now carry metadata, a timeout, retries, an optional cache key, and a fallback model chosen by task. Usage is written to Analytics Engine. A golden-set harness runs offline. Cron fans out daily-report, morning-brief, and stale-sweep proposals. Bid extraction tries Workers AI `toMarkdown`. ClamAV fails closed on Workers. The pg-boss process is gone. Turnstile protects `/request-estimate` and `/contact` when keys exist. Estimate versions explain what changed (AI-017).
- **Why** — Drafts were one model with no per-call policy, schedules did not run, and the public forms had no bot check.
- **Code touchpoints** — `src/lib/cloudflare/gateway.ts`, `src/lib/cloudflare/model-routing.ts`, `src/lib/ops/automation-schedule.ts`, `src/lib/ops/estimate-revision.ts`, `src/lib/leads/turnstile.ts`, `cloudflare-worker.ts`, `wrangler.jsonc`.
- **Data-flow impact** — Scheduled output is an `ops.proposal` row. It does not send, price, or approve. An unconfigured scanner quarantines the file.
- **API / schema impact** — No migration. New Worker binding `AI_USAGE`, crons, and optional Turnstile secrets.
- **Verification** — `npx tsc --noEmit` passed. `npm run lint` passed (two existing unused-variable warnings). `npm test` passed: 156 files, 852 tests, 1 skipped. The media-audit CLI test passes `--experimental-strip-types` so Node 22.14 can load the TypeScript claims module before the binary check.

- **What changed** — Recorded the owner's blanket approval for the Drive media, reassigned photos and video loops so every homepage panel, service page, /projects, and /about gets distinct media, published 29 owner-approved partner logos with a consistent monochrome treatment, and removed the dark plate from the Strong Fire lockup. See `docs/site-media-map.md`.
- **Why** — The owner approved all supplied media and partner marks and found the reused images repetitive.

- **What changed** — Added approved field photos and portrait spray-foam videos to the spray foam and air-vapour barrier pages, a third approved project image, an approved spray-foam process image on the homepage, and vector Strong Foam / Strong Fire lockups from the supplied PDF masters.
- **Why** — The supplied media review approved these files; interior pages had no imagery and the header used a 280 px raster logo.

- **What changed** — Restored scroll-driven video in the homepage hero and sector chapters using muted 12 s derivatives of approved shortlist clips `IMG_9677.mov` and `IMG_3398.m4v`, with posters for reduced motion.
- **Why** — The marketing-pages merge replaced the hero and sector videos with stills.

- **What changed** — Removed the held admin address from public pages, kept reduced-motion text and the operations camera visible, aligned the homepage section list with the rendered Scroll Craft page, and kept held partner names on the server.
- **Why** — Phase 3 and Phase 4 reviews found public content and motion fallbacks that did not match the publication rules.
- **Code touchpoints** — `src/content/site.ts`, `src/content/partners.ts`, `src/content/partner-publication.ts`, `src/components/scroll-world-page.tsx`, `src/components/marketing/site-footer.tsx`, `src/app/globals.css`, `src/app/(marketing)/contact/page.tsx`, `src/app/(marketing)/request-estimate/page.tsx`.
- **Data-flow impact** — Public contact shows estimating email only. Partner publication filtering no longer imports the held partner catalog into the homepage client component.
- **API / schema impact** — None.
- **Verification** — Focused marketing, site, and request-estimate tests.

- **What changed** — General inquiries use the existing lead record and R2 file binding. Office and visitor mail is sent through the Worker `EMAIL` binding.
- **Why** — Intake, storage, and notification stay on the `strongfoam` Cloudflare Worker instead of a separate mail provider or raw object-storage keys.
- **Code touchpoints** — `src/lib/leads/schema.ts`, `src/lib/leads/adapters.ts`, `src/lib/cloudflare/email.ts`, `src/lib/cloudflare/platform.ts`, `src/components/estimate-survey/survey-flow.ts`, `wrangler.jsonc`, `.env.example`.
- **Data-flow impact** — A general inquiry stores `projectType: general_inquiry`, empty city, `province: not_applicable`, empty service and file arrays, and `answers.intakeType` plus `message` in D1. Files remain on the `FILES` R2 binding.
- **API / schema impact** — No migration. `LEAD_NOTIFY_TO` is a comma-separated secret. The Worker config adds `send_email` binding `EMAIL`.
- **Verification** — Focused lead, survey, workflow, and schema tests: 13 files and 66 tests passed. Typecheck has only the pre-existing `src/lib/ops/takeoff.ts` error.

- **What changed** — Added the Phase 3 shared marketing UI: reducer-driven desktop/mobile header navigation, a public-contact footer, pure homepage selection model, server-renderable marketing components, and responsive/reduced-motion styling. The Scroll Craft/GSAP homepage remains the primary cinematic experience and now consumes the four approved service routes plus approved project, partner, and location selections.
- **Why** — Dedicated marketing routes need consistent accessible chrome and reusable content sections without publishing held relationships, locations, or media or replacing the cinematic homepage.
- **Code touchpoints** — `src/components/site-header.tsx`, `src/components/site-header-model.ts`, `src/components/marketing/`, `src/components/scroll-world-page.tsx`, `src/app/(marketing)/layout.tsx`, `src/app/globals.css`, and their focused tests.
- **Data-flow impact** — Typed services, projects, partners, and locations flow through pure approval filters into shared server-compatible components; the header Sheet closes through a pure navigation action.
- **API / schema impact** — None. No route pages, intake contracts, database schema, or media derivative pipeline changed.
- **Verification** — Phase 3 focused Vitest: 5 files and 36 tests passed. Focused ESLint and `git diff --check` passed. TypeScript is clean for Phase 3 files; the repository-wide check remains blocked by the pre-existing `src/lib/ops/takeoff.ts:51` comparison error.

- **What changed** — Added the shared recursive marketing-claims guard and completed the SFI media audit pipeline: deterministic inventory, duplicate/keeper analysis, fixture-only decision compilation, read-only drift checking, temporary contact-sheet/video-frame review, 576 final editorial decisions, and a compiled manifest.
- **Why** — Raw client media must remain read-only and only useful, reviewed first-party media may enter curated/public assets.
- **Code touchpoints** — `src/content/claims.ts`, `scripts/audit-sfi-media.mjs`, their focused tests, `assets/source-media-inventory.json`, `assets/source-media-decisions.json`, `assets/source-media-manifest.json`, `docs/sfi-media-audit.md`, `assets/MANIFEST.md`, `assets/SCROLL-BG-SHORTLIST.md`, `README.md`, `package.json`, and `package-lock.json`.
- **Data-flow impact** — The external source is read into a source-relative structural inventory. Separate human decisions approve 14 images and 5 videos, hold uncertain rights and third-party logos, and compile into a deterministic manifest. Curated derivative generation/public sync remains a later gated phase.
- **API / schema impact** — None. Added the local `sharp` dependency; no route, database, or public-media contract changed.
- **Verification** — Baseline: 135 files and 735 tests passed. Focused claims/media audit: 2 files and 8 tests passed. The external inventory matched 576 total, 544 images, 32 videos, 484 exact-unique images, 47 duplicate groups, 60 redundant images, 34 low-resolution images, and zero corrupt images. The complete read-only `check` validated all decisions and manifest drift.

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
