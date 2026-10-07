# Cloudflare Agents Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write the failing test first.

**Goal:** Make `StrongfoamAgent` the only production model door, with one instance per organization and record, while D1 stays the system of record for every draft.

**Architecture:** A pure module builds instance names. Server actions reach the named instance with `getAgentByName`. The agent calls the gateway with the requested model and returns the draft. The server action stores the run and the proposal in `ai_runs` and `ai_proposals`. Confirm and dismiss update that proposal in the same command that writes the business row. Later capabilities use the same door and start only when their source records exist.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, OpenNext, Agents SDK (`agents` 0.26), Wrangler, D1, Workers AI, AI Gateway, Vitest.

---

## Source requirements

- Design: `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`.
- PRD: `docs/strongfoam-crm-erp-prd.md`, section 24, AI-008 through AI-027.
- Existing code:
  - `src/lib/cloudflare/agent.ts`, `gateway.ts`, `platform.ts`
  - `src/lib/ops/ai-gateway.ts`, `ai-evidence.ts`
  - `src/lib/ops/commercial-ai.ts`, `commercial-flags.ts`
  - `src/lib/ops/store.ts` (`recordCommercialDraft`, `dismissAiProposal`)
  - `src/db/schema.ts` (`ai_runs`, `ai_proposals`, `job_plan_annotations`, `document_pages`)
  - `cloudflare-worker.ts`, `wrangler.jsonc`, `scripts/cloudflare-deploy.test.ts`

## Global constraints

- Do not open a public `/agents` route.
- Do not store prompts or chain-of-thought. D1 stores the run, cited ids, model, output, and outcome. Agent state stores only in-flight run status.
- Demo mode and a missing binding never call the network.
- A citation is kept only when its id is in the server-built pack.
- The organization id comes from the signed-in session, never from the pack or the request body.
- A requested model is used or the run fails with `model-unavailable`. It is never swapped.
- The agent does not set a price, send a message, change efficiency, or score an inspection.
- A plan quantity is calculated by the server from a confirmed scale and confirmed geometry. A model-supplied quantity is rejected.
- Production writes go through the existing field-note, plan-mark, reschedule, task, estimate, and change-order commands.
- `commercialAiGateReasons` stays in front of every commercial and takeoff call.
- Do not redeploy `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.

## Before Task 1

- [ ] Commit the current uncommitted quality, closeout, Cloudflare, and docs work when the user asks, so this plan starts from a clean tree.
- [ ] Set `OPS_STAFF_EMAILS` and `OPS_STAFF_PASSWORD` with `npx wrangler secret put` from a password the user supplies. Without them no staff page on the live Worker can be checked.
- [ ] Audit the opportunity page: which AI-016 and AI-018 actions a staff user can run today, and whether apply writes an estimate version. Correct the PRD status from that audit.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/cloudflare/agent-session.ts` | Instance name. Pure |
| `src/lib/cloudflare/agent-session.test.ts` | Name format, non-UUID ids rejected |
| `src/lib/cloudflare/agent.ts` | Durable Object. Calls the gateway, tracks in-flight runs |
| `src/lib/cloudflare/gateway.ts` | Model routing without a silent swap, JSON mode |
| `src/lib/cloudflare/platform.ts` | Binding type matches `getAgentByName` |
| `src/lib/ops/ai-gateway.ts` | Job drafts use the named job instance |
| `src/lib/ops/commercial-ai.ts` | Commercial drafts use the named opportunity instance |
| `migrations/0006_ai_runs_capabilities.sql` | Widen `ai_runs` capability ids and add a record id for job drafts |
| `src/lib/ops/takeoff.ts` | Deterministic measurement |
| `migrations/0007_plan_takeoffs.sql` | Confirmed takeoff record |
| `scripts/cloudflare-deploy.test.ts` | Entry export and binding stay in sync |

---

### Task 1: Instance name

**Files:**
- Create: `src/lib/cloudflare/agent-session.ts`
- Create: `src/lib/cloudflare/agent-session.test.ts`

- [ ] **Step 1: Write failing tests.** `agentInstanceName` returns `org:{organizationId}:job:{jobId}` and the opportunity, estimate, and project forms. A non-UUID id throws.
- [ ] **Step 2: Implement it.**
- [ ] **Step 3: Run `npx vitest run src/lib/cloudflare/agent-session.test.ts`.**

---

### Task 2: Model routing without a swap

**Files:**
- Modify: `src/lib/cloudflare/gateway.ts`
- Modify: `src/lib/cloudflare/gateway.test.ts`

- [ ] **Step 1: Write failing tests.** An `@cf/` model calls `env.AI.run` with gateway `strongfoam`. A non-`@cf/` model does not reach `env.AI.run` with Llama. It uses the gateway provider route or fails with `model-unavailable`. A JSON request passes JSON mode on both paths.
- [ ] **Step 2: Replace the fallback to `WORKERS_AI_MODEL` with explicit routing.**
- [ ] **Step 3: Run `npx vitest run src/lib/cloudflare/gateway.test.ts`.**

---

### Task 3: D1 draft record for every capability

**Files:**
- Create: `migrations/0006_ai_runs_capabilities.sql`
- Modify: `src/db/schema.ts`, `src/db/schema.test.ts`

- [ ] **Step 1: Write a failing schema test.** `ai_runs` accepts the shipped job capability ids (AI-008, AI-009, AI-021, AI-023) and still rejects an unknown id. `ai_proposals` can belong to a job as well as an opportunity.
- [ ] **Step 2: Write the migration.** D1 cannot alter a CHECK in place, so rebuild `ai_runs` and `ai_proposals` with copy, drop, and rename inside the migration.
- [ ] **Step 3: Run the schema test, then `npx wrangler d1 migrations apply strongfoam --local`.**

---

### Task 4: Named job instance

**Files:**
- Modify: `src/lib/ops/ai-gateway.ts`, `src/lib/ops/ai-gateway.test.ts`
- Modify: `src/lib/cloudflare/platform.ts`

- [ ] **Step 1: Write failing tests.** `requestJobAi` gets the stub through `getAgentByName(binding, "org:{organizationId}:job:{jobId}")`, with the organization id from the session argument. It never uses the name `strongfoam`. Citations outside the pack are dropped. Demo mode does not call the stub. No binding uses the HTTP fallback.
- [ ] **Step 2: Implement it, and record the run and proposal in D1.**
- [ ] **Step 3: Run the tests.**

---

### Task 5: In-flight status on the agent

**Files:**
- Modify: `src/lib/cloudflare/agent.ts`

- [ ] **Step 1: Write a failing test** for a pure reducer: starting a run adds `{ runId, purpose, status: "running" }`. Finishing one run does not change another run on the same instance. No prompt key is stored.
- [ ] **Step 2: Use the reducer in `draft()` around the gateway call.**
- [ ] **Step 3: Add a Durable Object test with `@cloudflare/vitest-pool-workers` that calls `draft()` on a named instance with a mocked `AI` binding.**

---

### Task 6: Confirm and dismiss on the job screens

**Files:**
- Modify: the job summary, daily report, closeout narrative, and dispatch recommendation actions and components that show a draft

- [ ] **Step 1: Write failing action tests.** Confirm writes the existing business row and marks the proposal `applied` in one transaction. Dismiss marks it `dismissed` and writes nothing else. A repeated confirm returns the first result.
- [ ] **Step 2: Load the latest `proposed` draft from D1 on page render, so a refresh shows it again.**
- [ ] **Step 3: Run the action tests and check one job page in the demo app.**

---

### Task 7: Commercial drafts use the agent

**Files:**
- Modify: `src/lib/ops/commercial-ai.ts`, `src/lib/ops/commercial-ai.test.ts`, `src/lib/ops/store.ts`

- [ ] **Step 1: Write failing tests.** With a stub, `requestCommercialProposal` calls the opportunity instance and not `fetch`. Price, cost, markup, tax, and total fields are still rejected. `commercialAiGateReasons` still blocks the call. `recordCommercialDraft` idempotency still replays.
- [ ] **Step 2: Implement it.**
- [ ] **Step 3: Run the tests.**

---

### Task 8: Per-organization limit and gateway logging

**Files:**
- Modify: the shared model call path from Tasks 4 and 7
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: Write a failing test.** A run over the organization's daily limit, counted from `ai_runs`, returns `limit-reached` without calling the model.
- [ ] **Step 2: Implement it with a new `AI_DAILY_RUN_LIMIT` setting.**
- [ ] **Step 3: Set AI Gateway log retention for `strongfoam` and record the setting in the README.** Do not put commercial documents through the gateway until open decision 10 on residency is answered.

---

### Task 9: Live check

**Files:**
- Modify: `scripts/cloudflare-deploy.test.ts`, `docs/CHANGELOG.md`

- [ ] **Step 1: Keep the static test.** `cloudflare-worker.ts` exports `StrongfoamAgent`, and `wrangler.jsonc` binds it and lists it in `new_sqlite_classes`.
- [ ] **Step 2: Deploy only when asked.** Read the deploy output for the `STRONGFOAM_AGENT` Durable Object binding. Ignore the local platform proxy warning.
- [ ] **Step 3: Sign in as staff, run one job draft, and confirm in Workers observability that the call went through the Durable Object and gateway `strongfoam`.** Record the version id in the changelog.

---

### Task 10: Deterministic plan measurement

**Files:**
- Create: `src/lib/ops/takeoff.ts`, `src/lib/ops/takeoff.test.ts`

- [ ] **Step 1: Write failing tests.**
  - A 0–1 rectangle on a 2592 × 1728 point page at `1/4" = 1'-0"` returns the known square footage.
  - Two-point calibration gives the same result as the printed scale.
  - A polygon with an opening subtracts it.
  - A polyline returns linear feet. Height times length returns wall square feet.
  - A count returns the point count.
  - It rejects an unconfirmed scale, `NTS`, a missing page size, an open polygon, and any model field named quantity, bags, price, or total.
- [ ] **Step 2: Implement `measureTakeoff`.** Inputs are fractional points, page size, and a confirmed scale. It does not call the model.
- [ ] **Step 3: Run `npx vitest run src/lib/ops/takeoff.test.ts`.**

---

### Task 11: Takeoff record and manual screen

**Files:**
- Create: `migrations/0007_plan_takeoffs.sql`
- Modify: `src/db/schema.ts`, the plan viewer, and the estimate-version command

- [ ] **Step 1: Write failing tests.** A confirmed takeoff stores the organization, document version, page, page size, scale method and value, geometry, openings, factor, quantity, unit, run id, and confirmer. The estimate line references it. Another organization's document version is rejected.
- [ ] **Step 2: Build the manual flow first:** calibrate or enter the scale, draw the region, see the calculated quantity, and confirm. No model is needed.
- [ ] **Step 3: Run the tests and check the flow in the demo app.**

---

## Later tasks

Do not start these until the predecessor records in the design spec exist. Each one calls the named instance, records its run in D1, and writes only through the existing command.

- [ ] **AI-027 proposal.** After Task 11 works without a model: the browser uploads the rendered page image to R2. A vision model proposes a scale citation and one region. The person edits and confirms. Run the evaluation set of Strong Foam plans with known manual takeoffs before turning it on.
- [ ] **AI-017 and AI-019.** Revision explanation and change-order draft. No price in the model response. A person sets the price.
- [ ] **AI-022.** Index approved note and transcript text in Cloudflare AI Search. The job agent retrieves it. Audio files are not indexed.
- [ ] **AI-026.** After job costing and the accounting connection, a job instance explains variance and posts nothing.
- [ ] **AI-025.** After a portal or inbound mailbox, a closed-project instance proposes a warranty job. A person creates it.

Workforce quality, efficiency, inspections, and the public estimate request stay outside these tasks.
