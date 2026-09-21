# AI Operations — Design Specification

**Date:** 2026-09-21  
**Product:** Strong Foam Operations Platform  
**Status:** Release A implementation-ready; Releases B and C tracked  
**PRD requirements:** AI-001 through AI-026, RPT-001  
**Primary surfaces:** `/app/jobs/[id]`, `/app`, `/app/field/jobs/[id]`

## Executive summary

The operations agent drafts and explains work the staff can already do. It is
not a second database, and turning it off leaves Office and Field unchanged.

Release A is the first build. It uses tasks, field notes, voice transcripts,
plan marks, and job events that already exist:

1. **AI-008** cites a job progress summary and writes nothing.
2. **AI-009** drafts today's daily report and saves it only after confirm,
   through the existing field-note command.
3. **AI-013** lists missing daily logs, failed transcriptions, blocked jobs,
   overdue tasks, and unextracted voice notes on Home.

AI-010, AI-011, AI-012, AI-014, AI-015, and AI-020 stay in Release A and wait
until those three are citing and confirming correctly. Release B waits on
estimate, price-book, and change-order records. Release C waits on the Render
worker, crew capacity, an evaluation set, a portal or inbox, or an accounting
system.

## Goals

1. Answer "what happened on this job" with links to the records used.
2. Turn a day's field evidence into a daily report the foreman confirms.
3. Put the exceptions Home can already detect into one review list.
4. Keep every later AI capability tied to a PRD ID and a predecessor record.
5. Leave manual workflows intact when the model is unconfigured or failing.

## Non-goals

- Geometric takeoff from plan PDFs.
- Generated price, markup, tax, or autonomous approval.
- Autonomous safety or compliance sign-off.
- Sending customer or subcontractor messages.
- Embeddings, pgvector, or a Render worker in Release A.
- A general chat box over the whole company.
- Reading captures that are still only on a device.

## Provider

Release A calls the Vercel AI Gateway from the Next.js server. The model id
comes from `AI_GATEWAY_MODEL`. When `AI_GATEWAY_API_KEY` or the model id is
missing, every AI action returns a disabled result and the pages render the
manual workflow.

Demo mode (`OPS_DEMO`) uses a deterministic local draft built from the evidence
pack. It does not call the gateway.

Audio stays in private storage. The model receives transcript text, note text,
and structured fields. It does not receive file bytes.

## Evidence pack

All Release A model calls start from one server-built pack for a single job.
The pack is the authorization boundary: the model cannot see records the pack
omits, and a citation is valid only when its id is in the pack.

```text
job
tasks[]
fieldNotes[]          kind, body, quantity, unit, task, area, createdAt
voiceNotes[]          status, transcript, source, task, createdAt
planMarks[]           title, status, sheet, task
recentEvents[]        kind, summary, createdAt
```

The pack includes the latest 40 field notes, 20 voice notes, and 20 job events.
Open tasks and non-voided marks on the current plan revision are included
without that cap. Each item carries `kind` and `id` stable enough to cite:

| Citation kind | Record |
|---|---|
| `task` | Job task |
| `field_note` | Field note |
| `voice_note` | Voice note |
| `plan_mark` | Plan annotation |
| `job_event` | Job event |

The office job page loads this pack with the same session already required to
view the job. Field users do not receive the office summary in Release A.

## AI-008 Cited job summary

The office job page shows **Summarize job** beside the field log. The action
sends the evidence pack and asks for:

- A short progress paragraph.
- Bullets for completed work, blockers, and open decisions.
- Citations on every bullet.
- An explicit uncertainty sentence when the pack is thin.

The panel renders the paragraph and bullets. Each citation is a link to the
existing anchor on the job page (`#tasks`, `#field-log`, `#voice-notes`,
`#plan`). Unknown citation ids are dropped. If a bullet loses every citation,
the bullet is dropped. The response is not stored as a business record.
Refreshing the page clears it.

Failure and disabled states replace the panel body with one sentence. They do
not toast an error over the rest of the job.

## AI-009 Daily report draft

The same panel can **Draft today's report**. The model returns four sections,
each with citations:

- Completed
- Held
- Material
- Next

The working day is the current date in the job project's working-calendar
time zone, falling back to `America/Toronto`.

**Save daily report** posts the combined sections as one field note:

- `kind = daily_report`
- `body` is the confirmed text, at most 4,000 characters
- actor is the signed-in office user
- command is `addJobFieldNote`

**Discard** clears the draft. Editing the textarea before save is the confirm
step. A second save creates a second daily report, matching the existing field
log.

## AI-013 Exception queue

Home gains an **Operations exceptions** section under Schedule attention. The
detectors are pure functions over records the Home page can already load, plus
voice-note status and whether a completed transcript has been extracted.

| Exception | Rule | Link |
|---|---|---|
| Missing daily log | Field-active job with no `daily_report` note on the working day | `/app/jobs/{id}#field-log` |
| Failed transcription | Voice note with status `failed` | `/app/jobs/{id}#voice-notes` |
| Blocked job | Job status `blocked` | `/app/jobs?status=blocked` |
| Overdue task | Open task past planned completion or due date | Existing portfolio overdue filter |
| Unextracted voice note | Status `completed`, non-empty transcript, no extract event | `/app/jobs/{id}#voice-notes` |

The section shows up to 8 rows, soonest or oldest first, and a count. Empty
means "No operations exceptions." Blocked jobs stay in the existing Needs
attention card as well.

Extraction is evidenced by a `voice_note_extracted` job event for that voice
note. Release A does not infer extraction from similar field-note text.

## Audit

Release A writes a job event when a summary or draft is requested, and when a
daily report is saved. The saved report already writes the field-note event.
The AI event records actor, capability id, model id or `demo` or `disabled`,
and citation ids. It does not store chain-of-thought or the raw prompt.

## Authorization

- Office summary, draft, and save require the office session and job access
  already enforced by the job page.
- Home exceptions use the same office session as Home.
- Field sessions cannot call the office summary action.
- The gateway key never reaches the browser.

## Release A follow-ons

These are specified so the next plan can start without a new product pass.
They are not part of the Release A implementation plan.

**AI-010 Morning brief.** On the field job landing, a read-only card lists
site, today's assigned tasks, current plan revision, open blockers, and open
material requests. Citations use the field user's own assignment scope.

**AI-011 Speak onto the plan.** From the open sheet, a confirmed transcript
proposes one mark (kind, status, task) plus the transcript attachment. Confirm
calls the existing mark command and voice-note command. The preview shows the
exact effect.

**AI-012 Schedule diff.** A blocker or quantity note can propose finish-to-start
moves already allowed by the schedule validator. Accept calls the existing
reschedule command. Reject leaves the schedule unchanged.

**AI-014 Quantity pace.** Compare summed `bags` or `sq_ft` quantities on the
job with quantities stated on open tasks. Warn when installed quantity exceeds
the stated remaining quantity. No currency.

**AI-015 Material pick list.** Group open `material_request` notes by job and
the request text. The result is a copyable draft. It does not create a
purchase order.

**AI-020 Deficiencies by sheet.** Group `deficiency` notes and deficiency marks
by document and page. The office plan page lists the groups. It does not file
a new punch-list entity.

## Release B

Start a commercial AI requirement only after its predecessor record ships.

| ID | Predecessor | Agent output | Person decides |
|---|---|---|---|
| AI-016 | Price book | Scope outline on the request | Estimator accepts it onto the opportunity |
| AI-017 | Estimate versions | Plain-language revision diff and threshold | Approver |
| AI-018 | Price book and assembly fields | Draft lines for location, R-value, area, depth, product, bags | Item and price |
| AI-019 | Change order | Location, quantity, schedule impact, customer wording | Price and approval |
| AI-021 | Assembly fields | Closeout and rebate narrative | Whether it is published |

Public lead qualification stays deterministic.

## Release C

| ID | Wait for | Output |
|---|---|---|
| AI-022 | Render worker and pgvector | Hybrid search over notes and transcripts |
| AI-023 | Crew capacity | Assignment diff for an open task |
| AI-024 | Evaluation set | Proposed photo deficiency; a person files it |
| AI-025 | Portal or inbound mailbox | Proposed warranty job |
| AI-026 | Accounting system of record | Variance explanation linked to budget and quantities |

## Acceptance for Release A

- A job with tasks, a blocker, and a transcript produces a summary whose
  visible claims link to those records.
- A citation id outside the pack never renders.
- Missing gateway configuration shows the disabled state and still allows a
  manual daily report.
- Confirming a draft creates one `daily_report` field note and a job event.
- Discarding a draft creates neither.
- Home lists each AI-013 exception type from fixture data and links to the
  record.
- Field and logged-out requests to the office AI actions are rejected.
- Demo mode returns the deterministic draft with provider `demo`.

## Testing

Pure tests cover the evidence pack, citation filtering, daily-report body
assembly, the working-day boundary in `America/Toronto`, and each exception
detector. Action tests cover disabled gateway, demo stub, unauthorized field
access, and confirm versus discard. Browser verification covers the office job
summary, the confirm path, and the Home exception list in demo mode.
