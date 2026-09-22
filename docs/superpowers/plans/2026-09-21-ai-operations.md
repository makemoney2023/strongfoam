# AI Operations Release A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship a cited office job summary, a confirmed daily-report draft, and a Home exception list for the field records Strong Foam already stores.

**Architecture:** Build a pure evidence pack and pure exception detectors first. A server-only gateway adapter turns that pack into cited text, or returns disabled/demo without a network call. The office job page renders the summary and draft. Confirming the draft calls `addJobFieldNote`. Home renders detector rows from data it already loads plus voice-note status.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Tailwind 4, existing shadcn/ui components, Vercel AI Gateway.

---

## Source requirements

- PRD: `docs/strongfoam-crm-erp-prd.md`, AI-008, AI-009, AI-013, and the boundaries in section 24.10.
- Design: `docs/superpowers/specs/2026-09-21-ai-operations-design.md`.
- Existing commands and reads:
  - `src/lib/ops/store.ts` (`addJobFieldNote`, job tasks, field notes, voice notes, events)
  - `src/lib/ops/field-workspace.ts`
  - `src/lib/ops/home.ts`
  - `src/app/app/jobs/[id]/page.tsx`
  - `src/app/app/page.tsx`
- Before adding client components, read `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`.

## Global constraints

- Implement AI-008, AI-009, and AI-013 only. Leave AI-010 through AI-026 unimplemented.
- The model sees one job evidence pack. Drop citations whose ids are not in that pack.
- Demo mode and a missing `AI_GATEWAY_API_KEY` or `AI_GATEWAY_MODEL` never call the network.
- Saving a daily report goes through `addJobFieldNote` with `kind: "daily_report"`.
- Do not add embeddings, pgvector, geometric takeoff, prices, or customer sending.
- Do not store prompts or chain-of-thought.
- Use `America/Toronto` when the job's project calendar has no time zone.
- Use the repository-required `makemoney2023` author and committer environment for every commit, then verify the author before pushing.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/ops/ai-evidence.ts` | Pure evidence pack, citation filter, daily-report body |
| `src/lib/ops/ai-evidence.test.ts` | Pack caps, citation drops, working-day boundary |
| `src/lib/ops/ai-exceptions.ts` | Pure AI-013 detectors |
| `src/lib/ops/ai-exceptions.test.ts` | One fixture per exception type |
| `src/lib/ops/ai-gateway.ts` | Gateway, demo stub, disabled result |
| `src/lib/ops/ai-gateway.test.ts` | Missing key and demo mode skip fetch |
| `src/app/app/jobs/ai-actions.ts` | Office-only summary, draft, and save |
| `src/components/ops/job-ai-panel.tsx` | Summary and daily-report panel |
| `src/lib/ops/home.ts` | Exception rows for the dashboard |
| `src/app/app/page.tsx` | Operations exceptions section |
| `.env.example` | `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL` |

---

### Task 1: Evidence pack and citation filter

**Files:**
- Create: `src/lib/ops/ai-evidence.ts`
- Create: `src/lib/ops/ai-evidence.test.ts`

- [x] **Step 1: Write failing tests**

Cover a pack that keeps every open task, caps field notes at 40, voice notes at 20, and events at 20, and drops a citation whose id is not in the pack. Cover the `America/Toronto` working-day label.

- [x] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/lib/ops/ai-evidence.test.ts`

- [x] **Step 3: Implement the pure pack and filter**

Export `buildJobEvidencePack`, `filterCitations`, and `assembleDailyReportBody`. Citation kinds are `task`, `field_note`, `voice_note`, `plan_mark`, and `job_event`.

- [x] **Step 4: Run the tests and confirm they pass**

---

### Task 2: Exception detectors

**Files:**
- Create: `src/lib/ops/ai-exceptions.ts`
- Create: `src/lib/ops/ai-exceptions.test.ts`

- [x] **Step 1: Write failing tests for all five AI-013 rules**

Use a fixed `now` inside `America/Toronto`. Assert missing daily log, failed transcription, blocked job, overdue task, and completed transcript without a `voice_note_extracted` event. Assert a transcript with that event is absent.

- [x] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/lib/ops/ai-exceptions.test.ts`

- [x] **Step 3: Implement `listOperationsExceptions`**

Return at most 8 rows with `kind`, `label`, `href`, and `occurredAt`. Sort oldest first.

- [x] **Step 4: Run the tests and confirm they pass**

---

### Task 3: Gateway adapter

**Files:**
- Create: `src/lib/ops/ai-gateway.ts`
- Create: `src/lib/ops/ai-gateway.test.ts`
- Modify: `.env.example`

- [x] **Step 1: Write failing tests**

Missing key returns `{ status: "disabled" }` and does not call `fetch`. `OPS_DEMO=1` returns `{ status: "demo", provider: "demo" }` with citations taken only from the pack.

- [x] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/lib/ops/ai-gateway.test.ts`

- [x] **Step 3: Implement the adapter**

Server-only module. Gateway success returns paragraph, bullets or sections, and raw citations. Run `filterCitations` before returning. On a non-OK response, return `{ status: "failed" }` with a short message and no partial business write.

- [x] **Step 4: Document `AI_GATEWAY_API_KEY` and `AI_GATEWAY_MODEL` in `.env.example`**

- [x] **Step 5: Run the tests and confirm they pass**

---

### Task 4: Office job panel

**Files:**
- Create: `src/app/app/jobs/ai-actions.ts`
- Create: `src/components/ops/job-ai-panel.tsx`
- Modify: `src/app/app/jobs/[id]/page.tsx`
- Test: `src/app/app/jobs/ai-actions.test.ts`

- [x] **Step 1: Write failing action tests**

Reject a field session. Disabled gateway returns the disabled state and writes no field note. Confirm calls the field-note path once. Discard writes nothing.

- [x] **Step 2: Run the tests and confirm they fail**

- [x] **Step 3: Add the panel above `VoiceNotesPanel` on the office job page**

Actions: **Summarize job**, **Draft today's report**, **Save daily report**, **Discard**. Show citation links. Keep the rest of the job page usable.

- [x] **Step 4: Record a job event for a completed summary or draft request**

Payload: capability id, provider, model, citation ids. Skip the event when status is `disabled`.

- [x] **Step 5: Run the action tests and confirm they pass**

---

### Task 5: Home exception list

**Files:**
- Modify: `src/lib/ops/home.ts`
- Modify: `src/lib/ops/home.test.ts`
- Modify: `src/app/app/page.tsx`
- Modify: the office Home loader in `src/lib/ops/store.ts` and `src/lib/ops/demo-store.ts`

- [x] **Step 1: Extend Home tests**

A fixture with one of each exception produces five rows and the specified hrefs. A job with today's daily report is not a missing-log row.

- [x] **Step 2: Run the Home tests and confirm they fail**

Run: `npx vitest run src/lib/ops/home.test.ts`

- [x] **Step 3: Load the fields the detectors need and render Operations exceptions**

Place the section under Schedule attention. Empty copy: "No operations exceptions."

- [x] **Step 4: Run the Home tests and confirm they pass**

---

### Task 6: Verify Release A

- [x] **Step 1: Run the focused tests**

Run: `npx vitest run src/lib/ops/ai-evidence.test.ts src/lib/ops/ai-exceptions.test.ts src/lib/ops/ai-gateway.test.ts src/lib/ops/home.test.ts src/app/app/jobs/ai-actions.test.ts`

- [x] **Step 2: Browser-verify demo mode**

Open the office job page, summarize, draft a report, save it, and confirm the field log shows one new daily report. Discard a second draft and confirm no extra note. Open Home and confirm the exception rows link to the job.

- [x] **Step 3: Confirm a missing gateway key on a non-demo boot shows the disabled state and the manual daily-report form still saves**

`src/app/app/jobs/ai-actions.test.ts` covers this path: with `OPS_DEMO` unset and no gateway key, summarize returns `disabled` and writes no field note or job event. This environment has no `DATABASE_URL`, so a non-demo server cannot open a job. The existing field-log form is unchanged.

---

## Follow-on plans

Do not start these inside Release A.

| Next plan | PRD | Starts after |
|---|---|---|
| Morning brief, speak onto the plan, schedule diff, quantity pace, pick list, deficiencies by sheet | AI-010, AI-011, AI-012, AI-014, AI-015, AI-020 | Shipped. AI-014 compares installed bags or square feet with the quantity still stated on open tasks |
| Reversible task commands | AI-003 | Shipped for status and a one-working-day due date, including chained undo and one-click complete |
| Exact schedule diff | AI-012 | Accept writes the shown moves only. A later failure restores earlier moves. Bulk reassignment is still not a command |
| Transcript record | AI-004 | One blocker, deficiency, material request, or new task from a completed transcript. A later sentence stays available, dismissing one sentence writes nothing, and the home queue keeps the note while a sentence remains. A daily report stays the AI-009 draft |
| Commercial drafts | AI-016 through AI-019, AI-021 | Price-book items exist. Estimate versions, assemblies, and change orders are still open |
| Retrieval, dispatch, photo review, warranty, cost explanation | AI-022 through AI-026 | The dependency named in section 24.10 |
