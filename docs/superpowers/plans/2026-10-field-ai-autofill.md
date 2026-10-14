# Field AI autofill

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write the failing test first. Ship as stacked draft pull requests. Do not merge and do not deploy.

**Goal:** A field worker speaks once, snaps a photo, and confirms. The app drafts the daily report, quantities, blockers, material requests, captions, and labor. A person confirms before a job is blocked, production is verified, an inspection is signed, or anything is sent.

**Architecture:** Pure functions under `src/lib/ops` decide prefill, grounded drafts, transcription routing, captions, the end-of-day report, geofence distance, and the offline outbox. Server actions and one queue handler perform writes. Drafts are `background_jobs` rows of kind `field.draft` (demo mode keeps the same shape in memory). Confirming a draft never sends mail and never verifies production by itself.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, OpenNext, D1, R2, Queues, Workers AI via AI Gateway `strongfoam`, Deepgram through that gateway, Vitest, pdf-lib.

**Base:** `main` at `c0ea29c`.

## Source requirements

- The field app is `/field`, backed by `src/app/app/field`, `src/app/field/actions.ts`, and `src/lib/ops`.
- Task complete is already one tap (`TaskStatusButton`). Leave that as the confirm.
- Voice today calls Deepgram Nova-3 at `api.deepgram.com` with `DEEPGRAM_API_KEY` (`src/lib/ops/voice-transcribe.ts`). `extractFieldVoiceNote` writes a task or field note immediately, and a blocker also sets the job to `blocked`.
- `VOICE_EXTRACT_KINDS` has no quantity. Field-log quantity, labor piece, and production drafts are three separate writes.
- Photos upload through `/api/field/job-uploads`. The field gallery is `editable={false}`.
- Sites have an address line and no coordinates. There is no service worker, no geofence, and no web push.
- Field roles have `inspection.read` and `quality.read`, not edit. `workforce.verify` is office and administrator only.
- Model calls go through AI Gateway. A fallback runs only after a call was attempted and failed. A missing key or a missing AI binding is not a failed call. Usage goes to `AI_USAGE`. Metadata is at most five strings, with no prompt text and no `cf.*` keys.
- Organization id comes from the session or a server-built message, never from model output.
- `StrongfoamAgent` is the Durable Object class bound as `STRONGFOAM_AGENT`. Migration tag `v1` already lists it in `new_sqlite_classes`. The Worker entry re-exports the class. Wrangler reports that the entry does not export it. The class is used by `namedAgent` and must stay.

## Pull requests

| PR | Branch | Base | Scope |
|---|---|---|---|
| A | `cursor/field-ai-autofill-a-f858` | `main` | This plan, the `StrongfoamAgent` entry export, prefill, confirm cards, language, glove layout |
| B | `cursor/field-ai-autofill-b-f858` | A | One voice note to quoted drafts, gateway transcription, end-of-day report, in-app prompt |
| C | `cursor/field-ai-autofill-c-f858` | B | Photo captions and vision drafts, daily report photos, closeout photo log, photo report PDF |
| D | `cursor/field-ai-autofill-d-f858` | C | Offline outbox, site geofence labor draft, inspection and quality notes from confirmed drafts |

Each PR stays a draft. Each must pass `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Global constraints

- Drafts set `sendsToCustomer`, `setsPrice`, and `approves` to false.
- A voice or photo draft is kept only when its quote or reading is grounded in the source the server already has (transcript text, or a number the model returned that the server did not invent beyond the model JSON).
- Confirming a blocker is the only field action that sets job status to `blocked`, and the card says "This marks the job blocked."
- Confirming a quantity or a labor row does not verify production. The verify button says that the row will count on the worker's record.
- Confirming a deficiency note does not set an inspection result to passed or failed.
- Photo captions describe only what the model claims is visible. The caption must not say thickness is certified or that the work complies.
- No customer email, no `EMAIL.send` to a customer, no price, no auto-approve.
- Do not redeploy `handoff`, `handoff-hq`, `abracadabra-marketing`, or `readiness-check`.

## What the whole series leaves out

- Certified spray thickness from a phone photo.
- Background GPS trails. Arrival is one consented reading and a confirmed labor row.
- Auto clock-in without a confirm.
- Field workers verifying their own production or signing inspections.
- Merging and deploying. Owner steps are listed at the end.

---

### Task 1: Worker entry exports `StrongfoamAgent`

The binding is correct. The class is the production model door. Do not remove it.

- [ ] **Step 1:** Declare `export class StrongfoamAgent` in `cloudflare-worker.ts` so the entry module itself exports the class, extending the implementation in `src/lib/cloudflare/agent.ts`.
- [ ] **Step 2:** Keep migration tag `v1` and `new_sqlite_classes: ["StrongfoamAgent"]`. Do not add a second `new_sqlite_classes` tag for the same class. Wrangler rejects that once the class exists.
- [ ] **Step 3:** Extend `scripts/cloudflare-deploy.test.ts` so the entry file contains `export class StrongfoamAgent`.

### Task 2: Prefill from today's dispatch

- [ ] **Step 1:** `fieldPrefill` in `src/lib/ops/field-prefill.ts`. One dispatched job today selects that job. Zero or several dispatched jobs do not guess a job. One open task assigned to the user on that job selects the task, its work area, and its stated unit when the unit is a field unit. Bags or square feet also prefill the labor unit. Several tasks do not guess.
- [ ] **Step 2:** Labor, production, the field log, and the voice form use that prefill. The save button names the job when one is selected.

### Task 3: Confirm cards

- [ ] **Step 1:** `src/lib/ops/field-drafts.ts` defines draft kinds, the effect sentence, quote grounding, and confirm versus dismiss. Dismiss does not write a business row.
- [ ] **Step 2:** `src/lib/ops/field-draft-store.ts` stores drafts as `background_jobs` kind `field.draft`. Demo mode uses memory.
- [ ] **Step 3:** Voice "Create record" saves a draft. It does not call `extractJobVoiceNote` and it does not block the job. A card confirms or dismisses. Confirm of a blocker writes the field note and then sets the job blocked. Confirm of any other voice kind calls the existing extract.
- [ ] **Step 4:** The manual blocker submit button reads "Mark the job blocked." The plan-mark submit button reads "Mark the job blocked" or "Record a deficiency on this mark" when those statuses are selected. The workforce verify button reads "Verify this production. It counts on the worker's record."

### Task 4: Language

- [ ] **Step 1:** `en`, `fr`, and `es` in `src/lib/ops/field-language.ts`. Anything else falls back to `en`.
- [ ] **Step 2:** A preference row kind `staff.language`, idempotency `staff.language:${userId}`. The field home has a language select. The voice upload sends that code. Deepgram already maps `en` to `en-US`.

### Task 5: Gloves and consent

- [ ] **Step 1:** A header control stores `strongfoam-field-glove` on the device and sets `data-field-glove` on the document. Buttons, selects, and inputs grow under that attribute.
- [ ] **Step 2:** The first voice save stores `strongfoam-field-voice-consent` on the device. Later recordings send consent without another checkbox, and the worker can clear it.

### Task 6: One voice note, many quoted drafts (PR B)

- [ ] **Step 1:** `voiceDraftsFromTranscript` asks for JSON cards of `daily_report`, `quantity`, `blocker`, and `material_request`. A card is dropped when its quote is not a substring of the transcript. Quantity is a whole number greater than zero with a field unit, and only when the quote contains that number.
- [ ] **Step 2:** Route audio to AI Gateway Deepgram (`/deepgram/listen`, model `nova-3`). If that call fails, call Workers AI `@cf/openai/whisper` through the same gateway options. If neither the gateway key nor the AI binding is configured, return the current empty manual transcript and do not pretend a call failed. Log both attempts to `AI_USAGE`.
- [ ] **Step 3:** After a transcript completes, store the grounded drafts. The worker confirms each card. Confirm still does not verify production.

### Task 7: End-of-day report and prompt (PR B)

- [ ] **Step 1:** `confirmedDailyReport` builds a paragraph only from confirmed drafts and done tasks for that working day. It does not include dismissed drafts.
- [ ] **Step 2:** The existing `30 21 * * *` autopilot stores that paragraph as a `field.draft` of kind `daily_report` when there is at least one confirmed row. The foreman or the worker confirms it before it becomes a field note.
- [ ] **Step 3:** The field job page shows an in-app prompt when that draft is still proposed. The prompt opens the confirm card. It does not email a customer. Push delivery waits for the service worker in PR D.

### Task 8: Photo AI (PR C)

- [ ] **Step 1:** On a field photo upload, enqueue `field.photo-caption` when `JOBS` exists. Otherwise run inline. The vision input is the image plus job name, area names, today's task title, and scope. The model is `@cf/meta/llama-3.2-11b-vision-instruct` through the Workers AI binding gateway. A failed call may use `@cf/llava-hf/llava-1.5-7b-hf` only when that call was attempted and the fallback is configured. A missing AI binding stores no caption.
- [ ] **Step 2:** Parse JSON into drafts: caption, area tag (only an area id that exists on the job), drum lot, gauge reading, coverage flag, safety flag. Drop any caption that claims certified thickness or code compliance. Gauge and lot drafts are readings, not verified production.
- [ ] **Step 3:** The worker edits the caption text and confirms with one tap. Confirm writes `caption` on the document. The field gallery shows it and allows that edit.
- [ ] **Step 4:** Golden cases in `src/lib/ops/field-ai-eval.ts` cover a grounded voice split and a caption that is rejected when it certifies thickness.

### Task 9: Reports (PR C)

- [ ] **Step 1:** The confirmed daily report lists confirmed captions for that day.
- [ ] **Step 2:** `draftCloseoutPacket` gains a photo log of confirmed captions. The narrative still does not say the packet was sent.
- [ ] **Step 3:** `jobPhotoReportPdf` uses pdf-lib, the same approach as proposal PDFs. Filters are a date range and an optional area. Confirmed captions are the lines. A route under the field or office session returns the PDF. No Browser Rendering binding unless pdf-lib cannot draw the page.

### Task 10: Offline queue (PR D)

- [ ] **Step 1:** `fieldOutbox` is a pure reducer: enqueue, list, drop after ack. The browser stores it in IndexedDB `strongfoam-field` / `outbox`. A service worker at `public/field-sw.js` retries when the network returns.
- [ ] **Step 2:** `POST /api/field/sync` accepts only draft payloads for the signed-in field user. It never sets job status and never verifies production. Synced voice and photo bytes are drafts until a confirm card.

### Task 11: Arrival labor (PR D)

- [ ] **Step 1:** Table `site_geofences` (site id, organization id, latitude, longitude, radius meters default 150). Office can save a point on the company page. No coordinates means no geofence.
- [ ] **Step 2:** `geofenceContains` is haversine. The field button "I'm here" asks for browser location only after a consent checkbox. The server creates a labor draft when the point is inside the radius. Confirm writes today's labor row for the signed-in user. Dismiss writes nothing. Do not store the raw trail.

### Task 12: Inspections and quality (PR D)

- [ ] **Step 1:** Confirming a deficiency or safety-flag draft writes a field note of kind `deficiency`. It does not change `inspections.result`.
- [ ] **Step 2:** A field lead may also propose a quality record of kind `deficiency` and status `open`. Office confirm creates that quality row. A field worker confirm stops at the field note.
- [ ] **Step 3:** Confirmed captions whose area matches a deficiency note are listed on that note's card and in the photo report.

## Owner steps (after merge, not this series)

1. Deploy the `strongfoam` Worker from the merge commit with `CLOUDFLARE_API_TOKEN` for account `6f6959ecba86d1de4d6cf6aa0b34528d`. `npm run deploy` only. Do not deploy the other Workers.
2. Apply D1 migrations, including `site_geofences` and `job_documents.caption` when those land, before or as part of that deploy.
3. Confirm the script exports `StrongfoamAgent`. Migration `v1` stays the sqlite class tag.
4. Secrets already expected: `DEEPGRAM_API_KEY` for the gateway Deepgram hop, `AI_GATEWAY_API_KEY` for `cf-aig-authorization`. Workers AI uses the `AI` binding. No new customer-mail secret.
5. AI Gateway `strongfoam`: enable the Deepgram provider and Workers AI. Log the calls. Do not cache voice or photo bodies.
6. Set site latitude and longitude on each job site before arrival drafts can appear. Radius defaults to 150 meters.
7. Push notifications need a VAPID key pair if a later deploy turns the in-app prompt into Web Push. This series ships the in-app prompt without that secret.

## File map

| Path | Responsibility |
|---|---|
| `cloudflare-worker.ts` | Entry `export class StrongfoamAgent` |
| `src/lib/ops/field-prefill.ts` | One job, one task, one unit |
| `src/lib/ops/field-drafts.ts` | Draft shape, effects, grounding, confirm |
| `src/lib/ops/field-draft-store.ts` | `field.draft` rows |
| `src/lib/ops/field-language.ts` | `en` / `fr` / `es` preference |
| `src/lib/ops/voice-transcribe.ts` | Gateway Deepgram, Whisper fallback |
| `src/lib/ops/voice-drafts.ts` | Quoted multi-draft extract |
| `src/lib/ops/field-daily-report.ts` | Report from confirmed rows |
| `src/lib/ops/photo-caption.ts` | Vision parse and safety filter |
| `src/lib/ops/job-photo-report.ts` | pdf-lib photo log |
| `src/lib/ops/field-outbox.ts` | Offline reducer |
| `src/lib/ops/geofence.ts` | Distance and contain |
| `src/lib/ops/field-ai-eval.ts` | Golden cases for voice and captions |
| `src/components/field/*` | Confirm cards, glove toggle, language, arrival |
| `public/field-sw.js` | Replay the outbox |

## Verification

- `npx tsc --noEmit`
- `npm run lint` (two existing unused-variable warnings are already on main)
- `npm test`
- No browser session is available without `CLOUDFLARE_API_TOKEN` and a field login. UI behavior is covered by the pure tests and the action tests. Say that in the PR.
