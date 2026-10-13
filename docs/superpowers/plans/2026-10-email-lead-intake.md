# Email-to-lead intake and first-reply draft

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write the failing test first.

**Goal:** Turn mail that Email Routing delivers to the `strongfoam` Worker into a deduplicated estimate-request proposal, store allowed attachments in R2, draft a first reply, and send that reply only after an owner confirms it.

**Architecture:** The Worker `email` handler parses the message, writes attachments to the `FILES` bucket, and stores one `background_jobs` row of kind `leads.inbound`. The small model may classify the message. A deterministic reader drops any fact the message does not contain. Accepting the match inserts a lead with `notifyStatus: "held"` and does not call `EMAIL.send`. The owner sends the stored draft from `/app/requests/inbound`.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, OpenNext, Email Routing, D1, R2, Queues, Workers AI via AI Gateway `strongfoam`, Vitest.

---

## Source requirements

- Roadmap rank 1 and rank 2 in `docs/superpowers/plans/2026-10-ai-platform-weeks-1-2.md`.
- Existing lead insert: `src/lib/leads/create-lead.ts`, `src/lib/leads/adapters.ts`, `src/db/schema.ts` (`leads`, `background_jobs`).
- Existing mail binding: `src/lib/cloudflare/email.ts`, `send_email` binding `EMAIL` in `wrangler.jsonc`.
- Existing object binding: `FILES` R2 bucket `strongfoam`.
- Small-model route: `modelForTask("triage")` in `src/lib/cloudflare/model-routing.ts`.
- Weeks 1–2 shipped on main `8ba0bc1`. This phase does not add a D1 migration. `background_jobs` already has a unique `(organization_id, idempotency_key)`.

## What this phase includes

- Inbound Email Routing handler on the `strongfoam` Worker.
- Deduped intake. The same Message-ID, or the same sender, subject, and body when the Message-ID is missing, stores one proposal.
- Attachments with an allowed type go to R2 under `inbound/{organizationId}/{dedupeKey}/{filename}` and are recorded as the bid-package files on the lead when a person accepts the match.
- Small-model triage. Missing model, missing binding, and demo mode stay on the keyword reader and do not call the network.
- A first-reply draft. Sending it requires an administrator confirmation. Intake never replies, forwards, or sends.

## What this phase leaves out

- Proposal follow-up cadence, batch confirm for the week 1–2 schedules, Workflows waits, AI Search, and customer auto-replies.
- Dashboard Email Routing DNS, the routing rule, and DLP. Those are owner steps below.
- A new table. D1 cannot change the `background_jobs` status check in place, and the existing unique key is enough.

## Global constraints

- The handler never calls `message.reply`, `message.forward`, or `EMAIL.send`.
- `setReject` is not used. A bounce is a reply.
- `sendsToCustomer`, `setsPrice`, and `approves` on the proposal are false until an administrator confirms the send. Confirm is the only path that calls `EMAIL.send`, and it sends the stored draft to the original sender only.
- Organization id is `STRONG_FOAM_ORGANIZATION_ID` from server code. It is not read from the message.
- Triage may keep a company, phone, or city only when that string appears in the message text. The model cannot invent a price, a send, or an approval.
- A requested small model is used for triage, or the keyword reader is used when the gateway is not configured. A failed call may use the configured fallback. A missing key does not swap models.
- Accepting a match inserts the lead and does not notify the sender or the estimating inbox.
- Do not redeploy `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.

## Owner steps (dashboard)

Code cannot turn Email Routing on. Do these in account `6f6959ecba86d1de4d6cf6aa0b34528d` after this Worker is deployed.

1. Cloudflare dashboard → the zone that owns the public domain (the zone for `strongfoam.com` if that is where estimating mail should arrive) → Email → Email Routing → Enable. Accept the MX and SPF records Email Routing writes. Do not unlock those records afterward.
2. Email Routing → Routing rules → Create address `estimates@` that domain → Action: Send to Worker → Worker `strongfoam`. Leave the catch-all disabled, or set the catch-all to Drop. Do not set the catch-all to Send to an email address that auto-replies.
3. Confirm the Worker route is the `strongfoam` script that exports `email`. Do not point the rule at `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.
4. AI Gateway `strongfoam` → DLP profile for email, phone, and banking, applied to the gateway, before staff rely on the model triage. Keyword triage still runs if the model is off.
5. `EMAIL_FROM` is already `Strong Foam <estimates@strongfoam.com>`. The approved reply uses that From address. Change the var only if the routing address is different, and redeploy.
6. No new secret is required for intake. `AI_GATEWAY_API_KEY` is still required for the small-model call. Without it, triage stays on the keyword reader.
7. Send a message to the routing address from outside Cloudflare. The Worker should store one proposal and send nothing back. A second delivery of the same message stays one proposal.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/leads/inbound-mail.ts` | Parse, dedupe, allowlist, triage grounding, reply draft, accept and send decisions |
| `src/lib/leads/inbound-store.ts` | `background_jobs` row, R2 keys, lead insert with notify held |
| `src/worker/inbound-email.ts` | Adapt the Email Routing message and refuse reply/forward/send |
| `cloudflare-worker.ts` | `email` export inside the request context |
| `src/worker/registry.ts` | `leads.inbound` queue handler for a retry of the stored metadata |
| `src/app/app/requests/inbound/page.tsx` | Review list |
| `src/app/app/requests/inbound/actions.ts` | Accept, dismiss, and confirmed send |

---

### Task 1: Pure intake

**Files:** `src/lib/leads/inbound-mail.ts`, `src/lib/leads/inbound-mail.test.ts`

- [ ] **Step 1: Write failing tests.** Message-ID dedupes. Missing Message-ID dedupes on sender, subject, and body. A different body does not. PDF and image attachments get an R2 key. An executable does not. Company, phone, and city from the model are kept only when they appear in the text. A price in the model output is dropped. The reply draft names the sender and subject, does not say the work is approved, and does not include a price.
- [ ] **Step 2: Implement the pure functions.** Keyword intent is `estimate` when the text contains estimate, quote, bid, tender, drawing, or spec. Otherwise a non-empty body is `general`. An empty body is `other`.
- [ ] **Step 3: Run `npx vitest run src/lib/leads/inbound-mail.test.ts`.**

### Task 2: Store, R2, and the lead insert

**Files:** `src/lib/leads/inbound-store.ts`, tests beside the pure module

- [ ] **Step 1: Write failing tests against a fake bucket and a fake job table.** The first save returns `created`. The second save with the same key returns `duplicate` and does not write the object again. Accept inserts one lead, copies the R2 keys onto `files`, sets `notifyStatus` to `held`, and does not call a mailer. A second accept returns the same lead id.
- [ ] **Step 2: Implement the store with `onConflictDoNothing` on `(organization_id, idempotency_key)`.** Idempotency key is `leads.inbound:${dedupeKey}`.
- [ ] **Step 3: Run the store tests.**

### Task 3: Worker email handler

**Files:** `src/worker/inbound-email.ts`, `cloudflare-worker.ts`, `src/worker/registry.ts`

- [ ] **Step 1: Write a failing test.** Given a message with `reply` and `forward` spies, handling it stores the proposal and leaves both spies at zero calls. `EMAIL.send` is not called.
- [ ] **Step 2: Export `email` from `cloudflare-worker.ts`.** Run it inside `runWithCloudflareRequestContext`. When `JOBS` exists, enqueue `leads.inbound` with the metadata and R2 keys only, after the bytes are stored. Without `JOBS`, write the proposal inline.
- [ ] **Step 3: Run the handler test and `scripts/cloudflare-deploy.test.ts`.**

### Task 4: Review screen and confirmed send

**Files:** `src/app/app/requests/inbound/page.tsx`, `src/app/app/requests/inbound/actions.ts`

- [ ] **Step 1: Write a failing test for the send decision.** `confirmSend: false` does not call the binding. `confirmSend: true` from a non-administrator does not call it. An administrator confirmation sends the stored draft once, to the original sender, from `EMAIL_FROM`.
- [ ] **Step 2: Render the list for a signed-in office user.** Accept and dismiss are office actions. Send uses the existing confirm dialog and an administrator session.
- [ ] **Step 3: Run the send-decision test.**

### Task 5: Docs

- [ ] **Step 1: Update README and CHANGELOG** with the `email` handler, the R2 prefix, and the statement that intake does not send mail.
- [ ] **Step 2: Run `npx tsc --noEmit`, `npm run lint`, and `npm test`.**

## Rollout

1. Deploy the Worker that exports `email`.
2. Complete the owner steps. Until the routing rule exists, no mail arrives and the review list stays empty.
3. Send one message with a PDF. Confirm one proposal, one R2 object, and no reply in the sender's inbox.
4. Accept the match. Confirm an estimate request whose notify status is held.
5. An administrator confirms the draft. Confirm one `EMAIL.send`.

## Rollback

Deploy the previous Worker. Disable the Email Routing rule, or set it to Drop. Leave the `leads.inbound` rows and the R2 objects. They do not send mail on their own.

## Acceptance criteria

- A repeated Message-ID creates one proposal and does not write the attachment twice.
- Disallowed attachments are listed as skipped and are not stored.
- Model facts that are not in the message are absent from the stored triage.
- The email handler does not reply, forward, reject, or send.
- Accept creates one lead and does not send.
- Only an administrator confirmation sends the stored draft.
