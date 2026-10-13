# AI platform, weeks 1–2

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write the failing test first.

**Goal:** Harden AI Gateway calls, record usage, evaluate a fixed golden set, run three draft-only schedules, extract bid text with Workers AI when it helps, fail closed on malware scanning, and put Turnstile on the public forms. Ship the estimate-revision explainer (AI-017).

**Architecture:** One module chooses the model and the gateway policy for a task. `completeThroughGateway` applies that policy and does not replace a model that was never callable. Schedules enqueue queue messages. Handlers store proposals. A person still confirms through the existing command. The agent does not send, price, or approve.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, OpenNext, Wrangler, D1, R2, Queues, Workers AI, AI Gateway `strongfoam`, Analytics Engine, Turnstile, Vitest.

---

## Source requirements

- Audit: uploaded AI automation plan, checked against `origin/main` in this repo.
- PRD: `docs/strongfoam-crm-erp-prd.md`, section 3 and section 24 (AI-006, AI-007, AI-009, AI-010, AI-017).
- Existing code:
  - `src/lib/cloudflare/gateway.ts`, `agent.ts`, `jobs.ts`, `platform.ts`
  - `src/lib/ops/ai-gateway.ts`, `ai-evidence.ts`, `morning-brief.ts`, `ai-exceptions.ts`
  - `src/lib/ops/estimates.ts` (`compareEstimateVersions`), `estimate-approvals.ts`
  - `src/lib/ops/document-extraction.ts`, `document-scanner.ts`, `src/worker/clamav.ts`
  - `cloudflare-worker.ts`, `wrangler.jsonc`, `src/worker/registry.ts`
  - `src/lib/leads/create-lead.ts`, `src/components/estimate-survey/estimate-survey.tsx`
  - `src/app/(marketing)/contact/page.tsx`, `src/app/(marketing)/request-estimate/page.tsx`

## What the audit got right

Checked in the tree before this plan:

- `completeThroughGateway` sets only `cf-aig-authorization`. No metadata, cache, timeout, retry, or fallback.
- `AI_GATEWAY_MODEL` is the only model. There is no per-task map.
- `StrongfoamAgent.draft` proxies that call. It does not schedule, query SQL, or call tools.
- Cron is `15 9 * * *` and the scheduled handler runs only `data-import.retain`.
- Queue handlers are heartbeat, `document.scan`, `document.extract`, `commercial_ai.draft`, and `data-import.retain`.
- `document.extract` uses pdfjs. Workers AI `toMarkdown` is unused.
- `src/worker/clamav.ts` speaks INSTREAM over `node:net`. `resolveMalwareScanner` returns null in production, and a null scan quarantines the file.
- `src/worker/index.ts` starts pg-boss. `background-jobs.test.ts` is the only caller of `startWorker`.
- Job and commercial drafts stay proposals. Citations outside the evidence pack are dropped. Confirm uses the existing command.
- AI-017 is specified and not built. `compareEstimateVersions` already returns the deterministic diff.
- `/contact` has no form. `/request-estimate` posts to `/api/leads` with a honeypot and a minimum fill time. Turnstile is absent.
- There is no Analytics Engine binding and no golden-set harness.

## What this plan does not treat as already true

- Gateway Guardrails, DLP, log retention, rate limits, and spend alerts are dashboard settings. They are not in the repo. The owner turns them on. Code cannot prove they are on.
- Deepgram is still a direct call. Moving it through the gateway is later.
- `postgres` and `src/db/client-options.ts` stay. Nothing on the Worker imports them, but the serializer tests still type against the `postgres` package. `pg-boss` and `src/worker/index.ts` are the unused worker and go away.
- `@vercel/blob` is still imported by lead and upload routes. It stays until those imports are gone.
- AI-001, AI-002, AI-005, AI-019, AI-022, AI-024, AI-025, AI-026, email intake, Workflows, AI Search, MCP, and vision stay out of weeks 1–2.

## Roadmap

Effort below is scope, not a calendar promise. S is one module and its tests. M crosses several screens or a new Cloudflare product. L needs an external system of record or a labelled evaluation set.

### Phases

| Phase | When | Scope |
|---|---|---|
| Weeks 1–2 | This plan | Gateway policy, usage ledger, golden-set harness, three draft schedules, toMarkdown, ClamAV fail-closed, remove pg-boss, Turnstile, AI-017 |
| Weeks 3–6 | Next | Email-to-lead, lead triage workflow, proposal follow-up, the schedules from this phase reviewed in batch |
| Weeks 7–10 | After | Bid-package workflow with AI Search, spec Q&A, change-order drafts, closeout packet, MCP |
| Later | After an accounting choice | Progress billing, collections, cost variance, vendor matching, inventory |

### Ranked automations

Human checkpoint is mandatory for every row. None of these send mail, set a price, or approve.

| Rank | Automation | Trigger | Human checkpoint | Cloudflare | Phase |
|---|---|---|---|---|---|
| 1 | Email-to-lead intake | Email Routing | Staff accept the match | Email, Queues, R2, Gateway DLP | 3–6 |
| 2 | Lead triage and first-response draft | New request | Owner approves the send | Workflows, EMAIL | 3–6 |
| 3 | Daily job autopilot | Cron 17:30 America/Toronto | PM confirms each daily report | Cron, Queues | 1–2 draft, 3–6 batch review |
| 4 | Proposal follow-up cadence | Proposal sent | Each follow-up is approved | Workflows, Email Routing | 3–6 |
| 5 | Bid-package workflow | Upload | Estimator confirms lines and scale | Workflows, toMarkdown, AI Search | 7–10 |
| 6 | Stale sweeps and morning digest | Cron morning | Staff act on the digest | Cron, Queues | 1–2 |
| 7 | Change-order draft | Voice, photo, or pin | PM prices and approves | Workflows | 7–10 |
| 8 | Gateway, ledger, evals | Every model call | A prompt change must pass the golden set | AI Gateway, Analytics Engine | 1–2 |
| 9 | Closeout packet | Tasks complete | PM approves before publish | Workflows, Browser Rendering | 7–10 |
| 10 | Progress billing | Quantities and month end | Accounting posts | Workflows plus the chosen ledger | Later |

Morning brief (AI-010) is a quick win beside rank 6. It is read-only.

### Human checkpoints

- A schedule writes a proposal with `status: "proposed"`. It does not call `addJobFieldNote`, reschedule, estimate apply, or `EMAIL.send`.
- Confirm and dismiss stay on the existing job, estimate, and home screens.
- Pricing, approval, safety sign-off, and customer sending stay human.
- Prompt injection from bid text stays untrusted. The model receives no write tool.

### Cloudflare features by phase

| Feature | Weeks 1–2 | Later |
|---|---|---|
| AI Gateway metadata, cache, timeout, retry, fallback | Per request in code | Dashboard Guardrails, DLP, rate limit, logs, spend alert |
| Analytics Engine `ai_usage` | Write path | SQL review in the dashboard |
| Cron and Queues | Four new crons plus fan-out | Workflows for waits |
| Workers AI `toMarkdown` | Bid extraction fallback | AI Search indexing |
| Turnstile | Siteverify on both public posts | — |
| Email Routing, Workflows, Browser Rendering, AI Search, MCP, Realtime | Not in this phase | Phases 3–10 |

## Global constraints

- A requested model is used, or the run fails with `model-unavailable`. A fallback runs only after that model was called and the call failed. A missing key or a missing `AI` binding is not a failed call.
- Demo mode and a missing model never call the network.
- Cache only a read-only task, and only with an evidence hash as `cf-aig-cache-key`. Drafts that are not keyed skip the cache.
- Metadata is at most five string entries. No prompt text. No `cf.*` keys.
- Citations and revision sentences must be present in the server-built pack or diff. Drop the rest.
- The organization id comes from the session or the queued message that the cron built from D1. It is not taken from model output.
- Scheduled output is a proposal. `sendsToCustomer`, `setsPrice`, and `approves` are false.
- A scan that cannot run quarantines the file and does not enqueue extraction.
- Turnstile is skipped when `TURNSTILE_SECRET_KEY` is unset. When it is set, a failed Siteverify rejects the post.
- Do not redeploy `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.

## Owner steps (dashboard and secrets)

Code does not turn these on. Do them in the Cloudflare account `6f6959ecba86d1de4d6cf6aa0b34528d` before relying on the new behavior in production.

1. AI Gateway `strongfoam` → Settings → Guardrails: enable prompt and response checks.
2. AI Gateway → DLP: add a profile that redacts email addresses, phone numbers, and banking numbers. Apply it to the gateway. Inbound mail is not ingested yet; the profile is ready for that phase.
3. AI Gateway → Settings → enable logs and choose a retention period. Do not store prompts longer than the office needs.
4. AI Gateway → Rate limiting and a spend alert on the gateway. Leave the default cache off. Code opts a request in with `cf-aig-cache-key`.
5. Analytics Engine: the first write creates dataset `ai_usage`. No dashboard object is required before deploy. The binding is `AI_USAGE`.
6. Turnstile → Add widget → managed, hostnames for the production zone. Copy the site key and the secret key.
7. Secrets and vars, from the repo root:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put AI_GATEWAY_API_KEY
```

Public site key (inlined at build time; also set as a Worker var so server code can see it):

```bash
# wrangler.jsonc vars, or:
npx wrangler secret put NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

Set the var before `npm run deploy`. If either key is missing, both forms still submit and Siteverify is skipped.

Optional model overrides (vars, not secrets):

```
AI_GATEWAY_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AI_GATEWAY_SMALL_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
AI_GATEWAY_FALLBACK_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
```

8. ClamAV, only if a scanner is reachable from Cloudflare egress:

```bash
npx wrangler secret put CLAMAV_HOST
npx wrangler secret put CLAMAV_PORT
```

If these are unset, `document.scan` quarantines the file with `scanner_unconfigured` and does not retry. That is the safe state. A private `10.x` host is not reachable from the Worker.

9. Deploy with `npm run deploy` after the Analytics Engine binding and the new crons are in `wrangler.jsonc`. Cron is UTC. The new triggers are listed in Task 6.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/cloudflare/model-routing.ts` | Task → tier, model, cache, timeout, retry, fallback |
| `src/lib/cloudflare/gateway.ts` | Headers and binding options for that policy |
| `src/lib/cloudflare/ai-usage.ts` | Analytics Engine data point |
| `src/lib/ops/ai-eval.ts` | Golden-set checks, offline and optional live |
| `src/lib/ops/automation-schedule.ts` | Cron plan, fan-out messages, proposal shape |
| `src/lib/ops/estimate-revision.ts` | AI-017 grounded explanation |
| `src/lib/leads/turnstile.ts` | Siteverify, disabled without a secret |
| `src/lib/ops/document-extraction.ts` | `toMarkdown` then pdfjs |
| `src/worker/clamav.ts` | Workers TCP, or a terminal quarantine |
| `src/worker/registry.ts` | Schedule handlers |
| `cloudflare-worker.ts` | Cron enqueues the plan |
| `wrangler.jsonc` | `AI_USAGE`, crons, model vars |
| `src/components/marketing/turnstile-field.tsx` | Widget, omitted without a site key |
| `src/components/marketing/contact-inquiry-form.tsx` | General inquiry on `/contact` |

---

### Task 1: Model map and gateway policy

**Files:**
- Create: `src/lib/cloudflare/model-routing.ts`
- Create: `src/lib/cloudflare/model-routing.test.ts`
- Modify: `src/lib/cloudflare/gateway.ts`
- Modify: `src/lib/cloudflare/gateway.test.ts`
- Modify: `src/lib/cloudflare/agent.ts`
- Modify: `src/lib/ops/ai-gateway.ts`

- [ ] **Step 1: Write failing tests.** `modelForTask("summary")` uses `AI_GATEWAY_MODEL` or the 70B default, allows cache, and names a fallback. `modelForTask("triage")` uses `AI_GATEWAY_SMALL_MODEL` or `@cf/meta/llama-3.1-8b-instruct-fast` and skips cache. Metadata keeps five string entries and drops `cf.*` keys and prompt text.
- [ ] **Step 2: Write failing gateway tests.** A policy sets `cf-aig-metadata`, `cf-aig-cache-key`, `cf-aig-cache-ttl` (at least 60), `cf-aig-request-timeout`, `cf-aig-max-attempts` (at most 5), `cf-aig-retry-delay`, and `cf-aig-backoff` on the compat request. The Workers AI binding receives `metadata`, `cacheTtl` or `skipCache`, and `cacheKey`. A call that throws after the model was invoked retries the fallback model once. A missing API key still throws `ModelUnavailableError` and does not call the fallback. An omitted policy keeps today's `{ gateway: { id } }` call.
- [ ] **Step 3: Implement the map and the policy.** Large tasks: summary, daily_report, revision_explanation, commercial_proposal, scope_outline, eval. Small tasks: classify, triage, morning_brief, stale_sweep. Timeouts: 20s small, 45s large. Two attempts, exponential backoff, 250ms delay. Cache TTL 3600 only when the caller supplies an evidence hash.
- [ ] **Step 4: Pass the policy from `requestJobAi` and `StrongfoamAgent.draft`.** The model string on the draft input is still the model that is called. Routing chooses that string before the call.
- [ ] **Step 5: Run `npx vitest run src/lib/cloudflare/model-routing.test.ts src/lib/cloudflare/gateway.test.ts src/lib/ops/ai-gateway.test.ts`.**

### Task 2: Usage ledger

**Files:**
- Create: `src/lib/cloudflare/ai-usage.ts`
- Create: `src/lib/cloudflare/ai-usage.test.ts`
- Modify: `src/lib/cloudflare/gateway.ts`
- Modify: `src/lib/cloudflare/platform.ts`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Write a failing test.** `usageDataPoint` writes `indexes: [organizationId]`, blobs for purpose, model, status, and cache, and doubles for latency, attempts, and character counts. No prompt text. A missing dataset does not throw.
- [ ] **Step 2: Record the point at the end of `completeThroughGateway` when a dataset is passed.**
- [ ] **Step 3: Add the binding** `{ "binding": "AI_USAGE", "dataset": "ai_usage" }`.
- [ ] **Step 4: Run the usage and gateway tests.**

### Task 3: Golden-set harness

**Files:**
- Create: `src/lib/ops/ai-eval.ts`
- Create: `src/lib/ops/ai-eval.test.ts`

- [ ] **Step 1: Write failing tests.** Three fixed job packs. The offline runner uses `demoAiResult`. Each case checks citation ids, required sections, and the absence of price, total, send, and approve fields. A case that cites an unknown id fails. `AI_EVAL_LIVE=1` is the only path that calls a model, and the test does not set it.
- [ ] **Step 2: Implement `evaluateGoldenSet(runner)`.** Return pass count, failures, and citation-validity rate.
- [ ] **Step 3: Run `npx vitest run src/lib/ops/ai-eval.test.ts`.**

### Task 4: AI-017 estimate revision explainer

**Files:**
- Create: `src/lib/ops/estimate-revision.ts`
- Create: `src/lib/ops/estimate-revision.test.ts`
- Modify: `src/components/ops/estimate-version-diff.tsx` or a sibling panel
- Modify: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Modify: `docs/strongfoam-crm-erp-prd.md` status row when the screen shows it

- [ ] **Step 1: Write failing tests.** Added, removed, and changed lines are named only when they appear in the diff. The total delta matches `diff.totals`. A total that crosses `secondApproverTotalCents` says the second approver is required. The text does not say approved, rejected, or sent. A model paraphrase keeps only sentences that match the grounded list.
- [ ] **Step 2: Implement `explainEstimateRevision`.** The page renders that result next to the existing diff. No model call on render. No approval write.
- [ ] **Step 3: Run the estimate-revision tests.**

### Task 5: Document text and ClamAV

**Files:**
- Modify: `src/lib/ops/document-extraction.ts`
- Modify: `src/lib/ops/document-scanner.ts`
- Modify: `src/worker/clamav.ts`
- Modify: `src/worker/handlers/scan-document.ts`
- Tests beside those modules

- [ ] **Step 1: Write failing tests.** Markdown with a page break becomes two pages and then the existing chunker. A `toMarkdown` error falls back to pdfjs. `scanner_unconfigured` and `scanner_unsupported` quarantine with `retry: false`. A scanner failure still retries. The INSTREAM client writes the length-prefixed chunks and parses `OK` / `FOUND` through an injected socket.
- [ ] **Step 2: Call `env.AI.toMarkdown` from extraction when the binding exists, then pdfjs.** Record provider `workers-ai-to-markdown` or `pdfjs`.
- [ ] **Step 3: Connect with `cloudflare:sockets`.** If the import or the connect fails, return `scanner_unsupported` and leave the file quarantined. Missing host returns `scanner_unconfigured`.
- [ ] **Step 4: Run the extraction and scanner tests.**

### Task 6: Schedules

**Files:**
- Create: `src/lib/ops/automation-schedule.ts`
- Create: `src/lib/ops/automation-schedule.test.ts`
- Modify: `src/worker/registry.ts`
- Modify: `cloudflare-worker.ts`
- Modify: `wrangler.jsonc`
- Modify: `scripts/cloudflare-deploy.test.ts`
- Modify: `src/lib/ops/commercial-flags.ts` heartbeat window
- Delete: `src/worker/index.ts`
- Modify: `src/lib/ops/background-jobs.test.ts`
- Modify: `package.json` (remove `pg-boss` and the `worker` script)

- [ ] **Step 1: Write failing tests.** Cron map:

| UTC cron | America/Toronto intent | Work |
|---|---|---|
| `* * * * *` | every minute | `worker-heartbeat` |
| `15 9 * * *` | mid-morning retain | `data-import.retain` |
| `0 10 * * *` | about 06:00 EDT | morning-brief fan-out |
| `0 11 * * *` | about 07:00 EDT | stale-sweep fan-out |
| `30 21 * * *` | about 17:30 EDT | daily-autopilot fan-out |

A fan-out of two active jobs emits two `ops.daily-autopilot` messages and does not include a send, price, or approve flag. Morning brief text comes from `buildMorningBrief`. Stale rows come from `listOperationsExceptions`. A proposal's status is `proposed`.
- [ ] **Step 2: Implement the pure planner and the queue handlers.** The scheduled export enqueues the plan on `JOBS`. Without the binding it runs the same handlers inside the request context. Child messages draft one record. The handler stores the proposal on a `background_jobs` row of kind `ops.proposal` when D1 is available, and does nothing else. It never calls the field-note, reschedule, or mail commands.
- [ ] **Step 3: Heartbeat.** The minute cron calls the existing heartbeat handler, which also `touchWorkerHeartbeat`. Raise `WORKER_HEARTBEAT_MAX_AGE_MS` from 60s to 180s so a one-minute cron still counts as healthy. Update the stale-heartbeat test.
- [ ] **Step 4: Remove pg-boss.** Delete `src/worker/index.ts`. Remove the `worker` script and the `pg-boss` dependency. Point the worker-process tests at the cron plan instead of `startWorker`.
- [ ] **Step 5: Show the proposals on Home** as a review list with links. The list has no approve or send button.
- [ ] **Step 6: Run the schedule tests and `scripts/cloudflare-deploy.test.ts`.**

### Task 7: Turnstile

**Files:**
- Create: `src/lib/leads/turnstile.ts`
- Create: `src/lib/leads/turnstile.test.ts`
- Modify: `src/lib/leads/create-lead.ts`
- Modify: `src/app/api/leads/route.ts`
- Modify: `src/components/estimate-survey/estimate-survey.tsx`
- Create: `src/components/marketing/turnstile-field.tsx`
- Create: `src/components/marketing/contact-inquiry-form.tsx`
- Modify: `src/app/(marketing)/contact/page.tsx`
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: Write failing tests.** No secret → verification is skipped and `createLead` still succeeds. A secret and a failing Siteverify → `{ ok: false, error: "spam" }` so the public route stays on the existing error set. The widget URL is the official `challenges.cloudflare.com` script. No site key → the component renders nothing.
- [ ] **Step 2: Verify on the server** with `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`. Pass the token from the raw JSON body. The parsed lead schema does not need a new field.
- [ ] **Step 3: Render the widget** on the estimate survey submit step and on a general-inquiry form on `/contact` that posts `intakeType: "general"` to `/api/leads`.
- [ ] **Step 4: Run the lead and turnstile tests.**

### Task 8: Docs and verification

**Files:**
- Modify: `README.md`, `.env.example`, `docs/CHANGELOG.md`
- Modify: `docs/strongfoam-crm-erp-prd.md` (AI-017 status, decision log, version) after the screen exists

- [ ] **Step 1: Document** `AI_USAGE`, the crons, `AI_GATEWAY_SMALL_MODEL`, `AI_GATEWAY_FALLBACK_MODEL`, Turnstile keys, and the ClamAV quarantine behavior. Remove the instruction to run `npm run worker` as the production worker.
- [ ] **Step 2: Run `npx tsc --noEmit`, `npm run lint`, and `npm test`.** Fix regressions from this work.

## Rollout

1. Merge the branch. The forms keep working when Turnstile keys are absent. Schedules no-op when D1 has no active jobs. Gateway calls behave as today when no policy is passed; job drafts pass a policy and still use `AI_GATEWAY_MODEL`.
2. The owner completes the dashboard steps above, then `npm run deploy`.
3. Watch the first `ai_usage` points and one cron invocation in `npx wrangler tail`.
4. Open an estimate with two versions and confirm the explainer matches the diff and does not approve.
5. Submit `/request-estimate` and `/contact` with keys unset (must succeed) and, after keys exist, with a bad token (must fail).

## Rollback

- Revert the Worker deploy. Crons and the `AI_USAGE` binding disappear with the previous `wrangler.jsonc`.
- Unset `TURNSTILE_SECRET_KEY` to skip Siteverify without a code change.
- Unset `AI_GATEWAY_FALLBACK_MODEL` to stop the second model attempt. The primary model is unchanged.
- Proposals already stored as `ops.proposal` stay in D1. They do not change jobs, estimates, or mail. Leaving them is safe. Deleting those rows is optional.
- ClamAV quarantine does not delete the object. A later scan can run when a host is configured.

## Acceptance criteria

- Every job and agent model call that goes through `completeThroughGateway` with a policy sends metadata, a timeout, and retries, and caches only when an evidence hash is present.
- A missing credential still fails with `model-unavailable` and does not call another model.
- `evaluateGoldenSet` passes offline in Vitest and does not call the network.
- The three schedules enqueue proposals. No test and no handler calls a customer send, a price write, or an approval write.
- Bid extraction uses `toMarkdown` when the binding returns text, and pdfjs otherwise.
- An unconfigured or unreachable scanner quarantines the file and does not enqueue extraction.
- `pg-boss` is not a dependency and `src/worker/index.ts` is gone. `postgres` remains for `client-options`.
- `/request-estimate` and `/contact` render Turnstile only when the site key exists, and the server skips Siteverify only when the secret is absent.
- The estimate screen explains scope, quantity, and price changes and names the approval rule that the new total crosses. It does not approve.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass.

## Deferred

| Item | Why it waits |
|---|---|
| Guardrails, DLP, gateway rate limits, log retention, spend alerts | Dashboard only. Listed in the owner steps. |
| In-app "AI cost this month" panel and KV daily caps | Needs a SQL read against Analytics Engine and a cap product decision. The write path lands now. |
| Nightly cron that replays fifty live packs | The harness is offline-first. Live replay waits on `AI_EVAL_LIVE` and a stored pack export. |
| Email Routing intake, Workflows, AI Search, MCP, vision, QBO | Phases 3–10. |
| Moving Deepgram through the gateway | Separate vendor path. |
| Removing `postgres` and `@vercel/blob` | Still imported. |
| Batch-review screen that confirms every autopilot draft in one action | Home lists the proposals. Confirm stays on the existing daily-report command. |
| Per-organization AI daily cap | The previous agent plan's Task 8. Not required to land the ledger. |
