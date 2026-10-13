# Proposal follow-ups, morning digest, and batch review

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write the failing test first.

**Goal:** After a proposal delivery is recorded, a Cloudflare Workflow waits and drafts follow-up email on day 3, 7, and 14 for a person to approve. Inbound replies to that proposal become a status-change proposal. Home shows a morning digest, and staff who opt in can receive that digest by email. A batch screen confirms or dismisses many automation drafts at once.

**Architecture:** Durable waits live in a Workflow class exported beside `StrongfoamAgent`. The step sequence, reply classification, digest sections, and batch decisions are pure functions under `src/lib/ops` so Vitest never imports `cloudflare:workers`. Drafts are `background_jobs` rows. Confirming a draft does not send customer mail. The one send this phase adds is the internal digest, and only to a staff address that opted in.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, OpenNext, Cloudflare Workflows, D1, Email Routing, the existing `EMAIL` binding, Workers AI via AI Gateway `strongfoam`, Vitest.

---

## Source requirements

- AI-006 and AI-007 in `docs/strongfoam-crm-erp-prd.md`. Scheduled automations surface stale work and at-risk jobs. The morning report states what is waiting, in plain language, with a link back to the record. High-impact writes stay on an explicit confirmation.
- Weeks 1–2 schedules already store `ops.proposal` rows for `daily_report`, `morning_brief`, and `stale_sweep` (`src/lib/ops/automation-schedule.ts`, `src/lib/ops/automation-run.ts`). Home lists them and does not send them (`src/app/app/page.tsx`).
- Commercial delivery is `recordProposalDelivery` then `recordProposalDeliveryAction` in `src/app/app/opportunities/[id]/estimates/actions.ts`. Success copy is "Delivery recorded. Nothing was sent automatically." Revoke is `revokeProposalAction`. Lifecycle is `proposalLifecycleStatus` in `src/lib/ops/proposals.ts`.
- Inbound mail from the email-intake phase is `handleRoutingEmail` in `src/worker/inbound-email.ts`. It does not reply, forward, reject, or send. This phase adds a proposal-reply branch in front of lead intake.
- `background_jobs` already has a unique `(organization_id, idempotency_key)`. Status check is `queued|running|retry_wait|completed|dead_letter|cancelled`. No new migration. `users` has no preference column; digest opt-in is a `background_jobs` row.
- Latest main for this phase is `3a4ee28` (merge of PR #61).

## What this phase includes

- A Workflow instance per commercial proposal, started when delivery is recorded, instance id equal to the proposal id.
- Sleep gaps of 3 days, then 4 days, then 7 days, so drafts land on day 3, 7, and 14 from the start. Each step drafts only when the proposal is still open.
- Cancel that instance when the proposal is revoked, and when a person confirms an accepted or lost reply.
- Classify a matched inbound reply as `accepted`, `question`, `lost`, or `other`, and store a status-change proposal. A person confirms it before any proposal event is written.
- A morning digest on Home: stale leads, quotes awaiting a decision, at-risk jobs, pending automation drafts.
- An optional digest email to staff users who opt in. It is internal. It is not a customer send.
- `/app/automation` to confirm or dismiss many drafts at once.

## What this phase leaves out

- Auto-send of follow-up email. Batch confirm marks a follow-up reviewed. Sending it stays a separate administrator confirmation of the stored draft, the same rule as the inbound first reply.
- Creating an `EstimateAcceptance` or converting a project from an email classification. Confirming `accepted` appends the proposal event so the lifecycle closes and the workflow stops. The signed acceptance record still requires the existing public attestation.
- A new D1 table or a change to the `background_jobs` status check.
- AI Search, customer auto-replies, and dashboard DLP. DLP on gateway `strongfoam` remains an owner step from the email-intake plan.
- Deploy and merge. This phase opens a draft pull request only.

## Global constraints

- Organization id comes from the session or from the proposal row on the server. It is not read from model output or from the inbound message.
- Follow-up drafts name the estimate number and the day. They do not include a price and do not say the work is approved.
- A model classification is kept only when the email text supports that label. Otherwise the keyword reader decides. The status proposal quotes a sentence that appears in the email.
- `sendsToCustomer`, `setsPrice`, and `approves` stay false on every draft in this phase.
- Batch confirm and batch dismiss never call `EMAIL.send`.
- Question and other do not append `accepted` or `rejected`.
- The digest email sender refuses any address that is not on the opt-in list for that organization.
- The email handler still never calls `reply`, `forward`, `setReject`, or `EMAIL.send`.
- A missing Workflows binding is a no-op. Delivery, revoke, and drafts still succeed.
- A requested small model is used for reply classification, or the keyword reader is used when the gateway is not configured. A failed call may use the configured fallback. A missing key does not swap models.
- Do not redeploy `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.

## Open and closed

Open for another follow-up draft: `generated`, `delivered`, `viewed`.

Closed, which skips the remaining drafts and is the reason to terminate: `accepted`, `rejected`, `expired`, `revoked`.

"Proposal is sent" in this phase means `recordProposalDelivery` appended a `delivered` event. That action still does not send mail by itself.

## Owner steps (Cloudflare)

Code declares the binding. The instance does not run until the Worker that exports `ProposalFollowupWorkflow` is deployed. Do not deploy from this pull request.

1. From the merge commit, with `CLOUDFLARE_API_TOKEN` that can edit Workers scripts on account `6f6959ecba86d1de4d6cf6aa0b34528d`, run `npm run deploy` for the `strongfoam` Worker only.
2. The deploy publishes `workflows` binding `PROPOSAL_FOLLOWUPS`, workflow name `strongfoam-proposal-followup`, class `ProposalFollowupWorkflow`. No new secret. No new D1 migration.
3. After a delivery is recorded, `npx wrangler workflows instances describe strongfoam-proposal-followup <proposal-id>` should show the instance. Until that deploy, `create` and `terminate` no-op and no day-3 draft is produced by the workflow.
4. Digest email also needs the existing `EMAIL` binding and at least one staff user opted in on Home. Without opt-in, the digest still shows on Home and nothing is mailed.
5. Leave Email Routing as set for intake. A reply that matches an open proposal becomes a status-change draft instead of a new lead. It still sends nothing back.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/ops/proposal-followups.ts` | Sleep plan, open check, grounded draft, reply class, match, status proposal, create and cancel against a binding |
| `src/lib/ops/morning-digest.ts` | Four digest sections and the internal staff message |
| `src/lib/ops/review-drafts.ts` | Batch confirm and dismiss. No send |
| `src/lib/ops/proposal-followup-store.ts` | Persist drafts, opt-in rows, open-proposal lookup, append a confirmed status event |
| `src/worker/proposal-followup-workflow.ts` | `WorkflowEntrypoint` that calls the pure runner. Imported only from `cloudflare-worker.ts` |
| `src/types/cloudflare-workers.d.ts` | `declare module "cloudflare:workers"` so the class file typechecks |
| `cloudflare-worker.ts` | Export the class. Pass a reply matcher into `email` |
| `wrangler.jsonc` | `workflows` binding |
| `src/app/app/opportunities/[id]/estimates/actions.ts` | Start after delivery. Terminate on revoke |
| `src/worker/inbound-email.ts` | Status-change branch before lead intake |
| `src/lib/ops/automation-run.ts` | Morning cron also stores the digest and emails opted-in staff |
| `src/app/app/page.tsx` | Digest section, opt-in, link to batch review |
| `src/app/app/automation/page.tsx` | Batch review |
| `src/app/app/automation/actions.ts` | Confirm, dismiss, and the separate follow-up send |

---

### Task 1: Follow-up runner

**Files:** `src/lib/ops/proposal-followups.ts`, `src/lib/ops/proposal-followups.test.ts`

- [x] **Step 1: Write failing tests.** Three sleeps are `3 days`, `4 days`, then `7 days`. An open proposal saves a draft on each day and never calls `send`. A closed proposal after day 3 saves nothing further. The draft contains the estimate number and the day, and does not contain a price or the word approved. `accepted` from the model is dropped when the text has no accept language. A quote is a substring of the email. Match prefers one estimate number in the subject or body, then a unique recipient address. Two matches return no match. `create` uses the proposal id. `terminate` runs on cancel. A missing binding returns unavailable and does not throw.
- [x] **Step 2: Implement the pure functions.** Keyword classes: accept language → `accepted`; decline, another vendor, or no longer moving forward → `lost`; a question mark or clarify language → `question`; otherwise `other`.
- [x] **Step 3: Run `npx vitest run src/lib/ops/proposal-followups.test.ts`.**

### Task 2: Morning digest

**Files:** `src/lib/ops/morning-digest.ts`, `src/lib/ops/morning-digest.test.ts`

- [x] **Step 1: Write failing tests.** An open request with a past next-action date is a stale lead. An open request untouched for seven days is a stale lead. A won request is not. A delivered or viewed proposal is a quote awaiting a decision. An accepted proposal is not. A blocked job and a job with a missing daily log are at risk. Pending drafts are listed. The staff message names those sections and does not include a price. `assertInternalRecipient` allows only an address on the opt-in list. A customer address is refused even if it appears in a lead.
- [x] **Step 2: Implement `buildMorningDigest` and `staffDigestMessage`.**
- [x] **Step 3: Run `npx vitest run src/lib/ops/morning-digest.test.ts`.**

### Task 3: Batch decisions

**Files:** `src/lib/ops/review-drafts.ts`, `src/lib/ops/review-drafts.test.ts`

- [x] **Step 1: Write failing tests.** Confirming a follow-up, morning brief, stale sweep, daily report, or digest sets status `confirmed` and returns no status event and no send. Confirming `status_change` `accepted` returns one `accepted` event and one cancel id. Confirming `lost` returns one `rejected` event and one cancel id. Confirming `question` or `other` returns neither. Dismiss sets `dismissed` and returns no event and no cancel. Unknown ids are ignored. The decision object has no `send` function.
- [x] **Step 2: Implement `applyBatchDecision`.**
- [x] **Step 3: Run `npx vitest run src/lib/ops/review-drafts.test.ts`.**

### Task 4: Workflow class and delivery hooks

**Files:** `src/worker/proposal-followup-workflow.ts`, `src/types/cloudflare-workers.d.ts`, `cloudflare-worker.ts`, `wrangler.jsonc`, `src/lib/cloudflare/platform.ts`, `src/app/app/opportunities/[id]/estimates/actions.ts`, `scripts/cloudflare-deploy.test.ts`

- [x] **Step 1: Declare the module and the binding.** Workflow name `strongfoam-proposal-followup`, binding `PROPOSAL_FOLLOWUPS`, class `ProposalFollowupWorkflow`. Export the class from `cloudflare-worker.ts`. Do not import the class from a tested module.
- [x] **Step 2: After a successful delivery event, call `create` when the binding exists.** After a new revoke event, call `terminate`. A replayed revoke does not terminate again. A missing binding leaves the action success copy unchanged.
- [x] **Step 3: Extend `scripts/cloudflare-deploy.test.ts` so the workflows array is required.** Keep `runWithCloudflareRequestContext` at three. The reply matcher is passed inside the existing `email` callback.
- [x] **Step 4: Run `npx vitest run scripts/cloudflare-deploy.test.ts`.**

### Task 5: Inbound reply branch

**Files:** `src/worker/inbound-email.ts`, `src/worker/inbound-email.test.ts`, `cloudflare-worker.ts`

- [x] **Step 1: Write a failing test.** When `matchProposalReply` returns a proposal, the handler stores one status-change proposal, does not insert a lead proposal, and leaves `reply`, `forward`, `setReject`, and `send` at zero. When the matcher returns null, the existing lead path still stores one inbound proposal and still does not send.
- [x] **Step 2: Implement the branch before `prepareInboundProposal`.** Production `email` loads open proposals for the organization and passes the matcher. Classification uses the pure function. The small model may suggest a label; the pure function drops it unless the text supports it.
- [x] **Step 3: Run `npx vitest run src/worker/inbound-email.test.ts`.**

### Task 6: Digest persistence, Home, and the morning cron

**Files:** `src/lib/ops/proposal-followup-store.ts`, `src/lib/ops/automation-run.ts`, `src/app/app/page.tsx`, `src/app/app/automation/digest-actions.ts`

- [x] **Step 1: Store opt-in as kind `staff.digest-opt-in`, idempotency `staff.digest-opt-in:${userId}`, payload `{ userId, email, optedIn }`.** Listing opted-in addresses returns only rows with `optedIn: true` whose email is also an active user in the organization.
- [x] **Step 2: On the morning-brief fan-out, build one digest proposal for the organization and, when `EMAIL` exists, send `staffDigestMessage` only to those addresses.** A refused address is not passed to `send`.
- [x] **Step 3: Render the four sections on Home from the same pure builder, with a link to `/app/automation` and an opt-in form for the signed-in user.** A legacy session without `userId` does not show the opt-in form.

### Task 7: Batch review screen

**Files:** `src/app/app/automation/page.tsx`, `src/app/app/automation/actions.ts`, `src/components/ops/app-sidebar.tsx`

- [x] **Step 1: List proposed drafts for the session organization, including follow-ups and status changes.** Office roles can confirm or dismiss the checked ids. The action calls `applyBatchDecision`, writes status events only for the returned accepted or rejected rows, and terminates those proposal ids. It never calls `EMAIL.send`.
- [x] **Step 2: A follow-up send control is separate from the batch buttons.** It sends only when the session is an administrator, `confirmSend` is `yes`, and the body is the stored draft. The recipient is the address stored on that draft.
- [x] **Step 3: Add an Automation item in the sidebar.**

### Task 8: Docs and the full check

- [x] **Step 1: Update README and CHANGELOG.** State the workflow binding, that follow-ups are drafts, that the digest email goes only to opted-in staff, and that batch confirm does not send.
- [x] **Step 2: Run `npx tsc --noEmit`, `npm run lint`, and `npm test`.**

## Rollout

1. Merge is a later decision. This branch stays a draft pull request.
2. After merge, deploy `strongfoam` so the Workflows binding exists. Record one delivery and describe the instance. Confirm no email left the building.
3. On day 3 the instance should store a follow-up draft. Confirm it on `/app/automation`. Confirm that confirm did not send. Send only from the separate administrator control.
4. Revoke a proposal, or confirm a lost reply, and confirm the instance terminates.
5. Opt in on Home. The next morning cron may email that staff user. A customer address is not a recipient.

## Rollback

Deploy the previous Worker. New deliveries stop creating instances. Existing instances can be terminated with `npx wrangler workflows instances terminate strongfoam-proposal-followup <proposal-id>`. Leave the `background_jobs` rows. They do not send customer mail on their own. Opt-in rows can stay; the previous Worker does not read them.

## Acceptance criteria

- Day 3, 7, and 14 drafts are saved only while the proposal is open, and the runner never calls send.
- Revoke and a confirmed accepted or lost reply terminate the instance when the binding exists.
- A reply that names one open estimate becomes a status-change proposal and does not create a lead. The handler still does not reply or send.
- A model label that the email text does not support is not stored.
- Home shows stale leads, quotes awaiting a decision, at-risk jobs, and pending drafts.
- Digest email is sent only to opted-in staff addresses.
- Batch confirm and dismiss update many drafts and do not send. Question and other write no accepted or rejected event.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass.
