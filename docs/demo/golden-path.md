# Golden-path recording

One Cambridge warehouse, from the inbound email to closeout. The words on screen come from fixtures that still go through the grounding checks, so a second take matches the first.

This is a local recording. Do not pass `--remote`. Do not deploy.

## Start

```bash
OPS_DEMO=1 npm run demo:golden
OPS_DEMO=1 DEMO_GOLDEN=1 npm run dev
```

The first command only checks the guard and prints URLs. It does not open D1. The dev server keeps the warehouse in memory.

Local worker, still without remote bindings:

```bash
OPS_DEMO=1 DEMO_GOLDEN=1 npx wrangler dev
```

Reset is a restart without `DEMO_GOLDEN`:

```bash
OPS_DEMO=1 npm run demo:reset
```

Leave `AI_GATEWAY_API_KEY` and `DEEPGRAM_API_KEY` unset. If either is set, the live model is used and the words can change. `DEMO_AI_LIVE=1` does the same.

## Logins

Password for both: `StrongFoamDemo1!`

| Who | Email | Where |
|---|---|---|
| Office | `admin@strongfoam.demo` | http://localhost:3000/app/login |
| Field | `field@strongfoam.demo` | http://localhost:3000/field/login |

Say the password once, off camera if you prefer. The rest of the script is what to say while the page is up.

## What you are looking at

Riverside Logistics, 1200 Industrial Road, Cambridge, Ontario. A 2,400 sq ft commercial warehouse retrofit. Roof deck closed-cell, east wall, west bay. Estimate `EST-2400`.

Sample files, generated in this repo, not scraped:

- `assets/demo/warehouse-roof.png`
- `assets/demo/warehouse-note.wav`

The job already has that photo and that voice note. Re-upload or replay them if you want the fixture to run again on camera. The caption and the transcript stay the same.

## Click path

Base URL `http://localhost:3000`.

### 1. Inbound email

Open `/app/login`. Sign in as the office user.

Open `/app/requests/inbound`.

Say: "This arrived by email. The model suggested a company, a city, and a phone. We kept them only because they are written in the message: Riverside Logistics, Cambridge, 519-555-2400."

Point at the message, then at `Riverside Logistics · Cambridge · 519-555-2400`.

Click **Accept match**.

Say: "Accept records the estimate request. It does not send a reply."

### 2. Triage on the request

Open `/app/requests/24000000-2400-4400-8400-240000000004`.

Say: "Priya Shah, Riverside Logistics, Cambridge. The next call was due yesterday, so this lead is already on the morning list."

### 3. Opportunity

Open `/app/opportunities/24000000-2400-4400-8400-240000000005`.

Say: "Same company, same site. The opportunity is the Cambridge warehouse retrofit."

### 4. Estimate and the cited bid draft

Open `/app/opportunities/24000000-2400-4400-8400-240000000005/estimates/24000000-2400-4400-8400-24000000000a`.

Say: "The bid draft cites the scope sheet. 2400 square feet, 2 inches, 600 square feet, 1800 square feet. A quantity that is not in the document is dropped. Nothing here sets a price by itself."

Point at **AI suggestions**.

### 5. Version diff

Open `/app/opportunities/24000000-2400-4400-8400-240000000005/estimates/24000000-2400-4400-8400-24000000000a?version=2&compare=1`.

Say: "Version 1 was 2400 square feet and 48 bags. Version 2 is 2600 square feet and 52 bags, for the mezzanine. The diff is the only thing that changed."

### 6. Proposal and accept

On the same estimate page, scroll to the proposal.

Say: "Delivery was recorded. Priya accepted EST-2400. Accepting does not email anyone, and it does not start work by itself. The project was opened after that acceptance."

### 7. Project, schedule, job

Open `/app/projects/24000000-2400-4400-8400-240000000006`.

Say: "The project is the warehouse. One job, roof deck, this week."

Open `/app/projects/schedule`.

Say: "Spray the roof deck is on today's schedule."

Open `/app/jobs/24000000-2400-4400-8400-240000000007`.

Say: "The east-wall conduit is an open deficiency. The closeout packet is still preparing. The photo log uses the confirmed caption. This draft is not sent to the customer."

### 8. Dispatch and field prefill

Sign out. Open `/field/login`. Sign in as the field user.

Open `/field`.

Say: "Jordan has one dispatch today, so the warehouse is already selected. The open task is Spray the roof deck, 2400 square feet. Two dispatches would not guess."

### 9. Voice note

Open `/field/jobs/24000000-2400-4400-8400-240000000007`.

Say: "One sentence used to be a typed daily report, a quantity, a blocker, and a material request. That was about fifteen minutes at the end of the day. This is one voice note."

Read the transcript out loud:

"Sprayed 2400 square feet on the warehouse roof deck. The east wall is blocked until the electrician moves the conduit. Need 12 bags of closed-cell for the west bay."

Point at the four cards. Click confirm on the quantity only if you want the row written. Say: "Confirm writes the note. It does not verify production, and it does not tell the customer."

Before: a foreman typed the report, the quantity, the hold, and the material ask separately.

After: one recording, four cards, one tap each.

### 10. Photo, lot, and gauge

On the same job, open **Photos**.

Say: "The caption, the roof deck tag, drum lot SF-2400-A, and the gauge reading came off the photo. The gauge is a draft reading. It is not a certified thickness."

Point at `Closed-cell foam on the warehouse roof deck, studs covered in the bay.`

Before: type the caption, the lot, and the gauge.

After: take the photo, read the cards, tap confirm.

### 11. Arrival

Point at **I'm here**.

Say: "After one consent on this device, arrival drafts today's labor. The map point is not stored. Confirm writes the hours."

Before: a timesheet line typed at the trailer.

After: one tap on site, one confirm.

### 12. Daily report

Say: "The daily report is still a draft. The foreman confirms it. It is built from the rows someone already confirmed, including the caption."

### 13. Deficiency and quality

Back on `/app/jobs/24000000-2400-4400-8400-240000000007` as the office user if you switched.

Say: "The conduit note is a deficiency. Quality stays open until office corrects it. Confirming the note does not sign the inspection."

### 14. Closeout and the photo report

On the job, open the closeout packet.

Say: "The packet includes the photo log. It is still a draft."

Open `/field/jobs/24000000-2400-4400-8400-240000000007/photos/report`.

Say: "This PDF is the photo report. Same caption, no extra typing."

Before: paste photos into a document and write captions again.

After: the confirmed caption is already the log line.

### 15. Automation batch

Open `/app/automation` as the office user.

Say: "Day-3 follow-up, the morning digest, and the warehouse daily report are waiting. Confirm or dismiss. Nothing is emailed. The follow-up stays a draft even after confirm. Sending it is a separate step, and we are not taking it."

### 16. Morning digest

Open `/app`.

Say: "Stale lead: Riverside Logistics, the call was due yesterday. Pending drafts are on the list. EST-2400 is not under quotes awaiting, because it was accepted. Before accept, that quote sat in this list."

Before: someone built that list from the board every morning.

After: it is on Home when you sign in.

## Time, side by side

| Step | Before | On camera |
|---|---|---|
| Daily report, quantity, blocker, material | About 15 minutes of typing | One voice note, then confirm |
| Photo caption, lot, gauge | Type each field | Confirm the cards |
| Arrival labor | Timesheet line | I'm here, then confirm |
| Bid quantities | Retype the scope sheet | Cited lines from the document |
| Version change | Read both versions | Diff from 2400 to 2600 sq ft |
| Morning list | Walk the board | Home digest |
| Closeout photo log | Paste and caption again | Confirmed caption |

## Optional Playwright file

`scripts/demo/record.spec.ts` exports `goldenPathRecording` with the URLs and the lines above. Playwright is not installed. `npm test` does not launch a browser. A later recording pass can wrap that list.

## Limits

- Memory only. Restarting the server without `DEMO_GOLDEN` drops the warehouse. `npm run demo:reset` does not delete production rows because it never connects.
- `OPS_DEMO=1` ignores D1, including a local D1 file. The CRM screens read the demo store.
- A live gateway key or Deepgram key turns the fixtures off.
- The sample wav is silence. The transcript is the fixture, not speech recognition.
- The sample png is a generated drawing.
- This script was not click-tested in a browser in the environment that added it.
