# Strong Foam CRM / ERP Product Requirements Document

**Product:** Strong Foam Operations Platform
**Document owner:** Strong Foam Insulation Inc.
**Status:** Draft source of truth
**Version:** 1.43
**Created:** 2026-09-18
**Last updated:** 2026-10-06

## 1. Purpose

This document defines the product direction and implementation requirements for
evolving the Strong Foam website into a centralized construction CRM and
operations platform.

The platform will begin with three capabilities:

1. An internal list and review workflow for estimate requests submitted through
   the existing lead-generation survey.
2. A field job workflow in which technicians can review plans, mark completed
   work directly on a blueprint or diagram, and attach speech-to-text notes.
3. A governed AI operations agent that can summarize authorized records, create
   and update tasks, draft administrative work, and surface exceptions.

The long-term product will support customer relationship management, estimating,
project execution, field reporting, job costing, and operational review for
insulation, drywall, flooring, and home-building work while using safe
automation to reduce repetitive administration.

## 2. Source-of-truth policy

This PRD is the source of truth for the CRM / ERP product scope, priorities, and
user-facing requirements.

- The existing lead survey remains governed by
  `docs/superpowers/specs/2026-09-16-lead-generation-survey-design.md`.
- The Import Center implementation contract is
  `docs/superpowers/specs/2026-09-22-data-import-center-design.md`; its
  test-first sequence is
  `docs/superpowers/plans/2026-09-22-data-import-center.md`.
- The Cloudflare agent runtime is
  `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`; its
  test-first sequence is
  `docs/superpowers/plans/2026-10-06-cloudflare-agents.md`.
- Implementation plans may add technical detail but must not silently change
  requirements in this PRD.
- Material scope or workflow decisions must update this document's decision log
  and version.
- Database schemas, API contracts, and UI specifications must trace back to a
  requirement ID in this document.

## 3. Current state

The existing application is a Next.js marketing site with a public estimate
survey. It currently provides:

- A multi-step estimate-request form.
- Deterministic lead qualification.
- Lead persistence in Neon PostgreSQL through Drizzle ORM.
- Private file uploads through Vercel Blob.
- Estimating and customer notifications through Resend.
- Qualified-lead booking through Calendly.
- Automated tests for the lead intake domain.

The survey creates **estimate requests**, not priced estimates. Staff can now
sign in to a session-gated review workspace, search and update requests, add
tasks and comments, convert a request into company, contact, site, and
opportunity records, and convert won work into a project plus one or more
jobs. A job can hold work areas, tasks, and authenticated plan or photo
uploads. Field staff have a mobile-first landing page for active assignments
plus a job view for task completion, notes, quantities, photos, blockers,
material requests, and daily reports. Every one of these records can be
created, edited, and deleted from the app, and each list filters by status,
type, and date range. Staff land on a Home dashboard after sign-in; creation
happens behind labelled buttons, detail pages read first and edit in dialogs,
and deletes are confirmed. The staff workspace uses shadcn/ui.
The application now includes a project Schedule with job/task roll-up,
dependencies, critical path, controlled rescheduling, baselines, resource
lanes, and working calendars. Office staff can create individual application
users and assign active field identities to jobs and tasks. Field has a
separate login and application shell, and server authorization limits its job
list and mutations to those assignments. Job events drive automatic two-way
screen refreshes for online office and field sessions. Office and Field can
now mark current plan revisions with pins, circles, ellipses, polygons,
arrows, and text; filter those layers; and export a marked-up PDF closeout.
Image and PDF sheets are supported. Field and office users can record
private voice notes on a job, task, plan mark, document, or daily report;
transcription runs after save (demo stub, Deepgram Nova-3 when
`DEEPGRAM_API_KEY` is set, otherwise an empty transcript the user can type
from audio). Selected
transcript text can become a task, blocker, deficiency, material request, or
daily-log entry. Office users can request a cited job summary (AI-008),
draft a daily report that saves only after confirm (AI-009), and review the
Home exception queue (AI-013). Field users get a read-only morning brief
(AI-010). Office users can copy a material pick list (AI-015) and review
deficiencies grouped by sheet (AI-020). A completed transcript can place one
pin on the current plan after confirm (AI-011). A blocker or quantity note
can propose a one-working-day schedule slip that accepts through the existing
reschedule (AI-012). Accept writes only the moves shown, and restores earlier
moves if a later move fails. Office users can preview a task status or one-working-day due-date
change and apply it (AI-003). One-click complete and reopen record the same
command. Undo restores the previous version, so an earlier command stays
undoable when nothing else edited the task. A field user can undo only their
own change. A spoken pin confirm refuses when the shown sentence changed. A completed
transcript can propose one blocker, deficiency, material request, or new task.
Saving one sentence leaves a different sentence available. Dismissing a sentence
writes nothing and the next sentence can be confirmed on its own. The home
exception queue keeps that note until no sentence remains. A product name
alone is not a material request. A spoken pin confirm checks the mark that
will be written (AI-004, AI-011).
An open task can store a stated quantity in bags or square feet. Home and the
job warn when installed field quantities of that unit are ahead of the amount
still stated on open tasks (AI-014). The warning does not state dollars,
margin, or a price. Office users keep a price book of reusable unit prices
by trade, in bags, square feet, hours, or each. A retired item stays in the
book. Estimate versions, proposals, change orders, and commercial approval
rules are stored. Assemblies and scope templates are not. AI-016 and AI-018
store drafts. AI-017, AI-019, AI-022, AI-024, AI-025, and AI-026 are not built.
Production runs on the Cloudflare Worker `strongfoam`, with D1 as the database
and R2 as private file storage. Storage in the United States is acceptable.
A governed spreadsheet
Import Center is now specified for customers, workforce, price book,
opportunities, projects, jobs, assignments, work areas, and tasks. The full
permission matrix, crews, durable offline sync, and financial workflows remain
to be completed.

## 4. Product vision

Provide one centralized location where office staff and field teams can move a
construction opportunity from initial inquiry through estimate, job execution,
completion, billing, and warranty.

The system should answer:

- What work is waiting to be reviewed?
- Who owns the next action?
- What was quoted, approved, and changed?
- What work is scheduled and who is performing it?
- Where on the plan has work been completed?
- What happened at the jobsite today?
- What labor, materials, and equipment did the job consume?
- Is the project on schedule and profitable?
- What information needs management attention?

## 5. Product principles

1. **Centralized history:** Customer, estimate, project, field, document, and
   financial activity must be reviewable from a shared record.
2. **Field-first simplicity:** Field workflows must use large touch targets,
   minimal typing, fast media capture, and resilient uploads.
3. **Structured before free-form:** Notes are useful, but important information
   should become statuses, tasks, quantities, deficiencies, or costs.
4. **Immutable evidence:** Original plans, uploaded media, audio, estimate
   versions, and approvals must not be overwritten.
5. **Traceable change:** Material actions must record actor, timestamp, and
   before/after state.
6. **Incremental delivery:** Build the operational core first. Do not attempt to
   recreate an accounting general ledger in the initial product.
7. **Trade-aware, not trade-locked:** Shared workflows should support multiple
   construction trades while allowing trade-specific fields and templates.

## 6. Goals

### 6.1 Initial goals

- Give staff a secure, searchable view of every survey submission.
- Establish ownership, status, next action, and review history for each request.
- Convert a request into a customer, project, estimate, or job without
  re-entering information.
- Import Strong Foam's existing customer, workforce, product/cost, project, and
  job spreadsheets through a reviewed, auditable migration workflow.
- Let staff create manual jobs that did not originate from the survey.
- Let technicians mark completed or blocked work on plan sheets.
- Let technicians record voice notes and receive editable transcripts.
- Keep plans, annotations, photos, audio, notes, and status history together.
- Let authorized users ask the AI agent to summarize records and create or
  update reversible tasks with confirmation and audit history.

### 6.2 Long-term goals

- Manage companies, contacts, opportunities, estimates, projects, and jobs.
- Produce trade-specific estimates and proposals.
- Schedule crews and capture field production.
- Manage changes, inspections, deficiencies, and closeout.
- Track labor, materials, commitments, revenue, and job profitability.
- Integrate with accounting and other construction systems.
- Give management centralized operational and financial reporting.

## 7. Non-goals for the first release

- Building a complete general ledger, payroll processor, or tax engine.
- Live multi-user collaborative drawing.
- Native iOS or Android applications.
- Full BIM authoring or editing IFC/Revit files.
- Storing a plan quantity the model invented. AI-027 calculates area, length, or count only after a person confirms the scale and the region.
- Inferring price from a drawing.
- Replacing existing accounting software.
- A customer or subcontractor portal.
- AI-generated pricing or autonomous approval decisions.
- Treating an uploaded spreadsheet as authority to delete or deactivate
  omitted records.
- Importing plaintext passwords or automatically activating imported users.
- Importing individual payroll wages into the generally available price book.

These may be reconsidered after the core data and operating workflows are stable.

## 8. Users and roles

| Role | Primary responsibilities |
|---|---|
| Administrator | Users, roles, configuration, integrations, import commit, audit review |
| Office | Prepare, map, validate, and reconcile imports; no import commit |
| Sales / estimator | Review requests, qualify opportunities, perform takeoff, issue estimates |
| Project manager | Convert won work, plan execution, manage changes and closeout |
| Dispatcher / coordinator | Schedule jobs, assign crews, manage next actions |
| Foreman | Coordinate the crew, review plans, record production and issues |
| Technician / installer | Complete tasks, annotate plans, capture notes and media |
| Accounting | Review approved costs, invoices, payments, and job profitability |
| Executive / manager | Review pipeline, operations, risks, productivity, and margins |
| Subcontractor | Future restricted access to assigned work only |
| Customer | Future restricted access to proposals, progress, and closeout |

Users may hold multiple roles. Authorization must be based on organization
membership and explicit permissions rather than UI visibility alone.

### 8.1 Identity and application boundaries

**IAM-001:** The Field product must be a separate application surface with its
own login, mobile shell, session cookie, navigation, and deployment boundary.
It must not expose office CRM navigation or rely on the office session.

**IAM-002:** An authorized office administrator must create, activate, and
deactivate users from the main application. Field must not provide public
self-registration.

**IAM-003:** One person must have one stable user identity. Memberships attach
that identity to an organization and role; job and task assignments reference
the stable user ID rather than a free-text name or email.

**IAM-004:** Deactivating either the user or membership must prevent the next
Field request and realtime connection from accessing internal records while
retaining attributable history.

**IAM-005:** Field authorization must be enforced on every read, mutation,
upload, download, and realtime subscription. Knowing a job, task, document, or
event identifier must not grant access.

**IAM-006:** The initial single-company launch may use one seeded organization,
but identity, membership, assignment, API, and event contracts must remain
organization-scoped so multi-organization support does not require replacing
identity keys.

### 8.2 User administration

**IAM-007:** Office staff must sign in with individual user credentials tied to
the same stable identity and organization membership used by Field. The
environment-configured shared Office credential may remain only as a documented
bootstrap and migration fallback, and must not override a database-backed
account with the same email.

**IAM-008:** Only an active administrator may open user administration or
create, edit, activate, deactivate, reset credentials for, or revoke sessions
from another user. Navigation visibility is not an authorization control.

**IAM-009:** User administration must let an administrator create a user, edit
their display name and email, assign an organization role, activate or
deactivate their identity and membership, set a temporary password, reset a
password, and revoke all active sessions.

**IAM-010:** Changes to a user's email, organization role, password, or active
state must invalidate previously issued Office and Field sessions no later than
the next authenticated request. Session tokens must be signed, time-limited,
and checked against current identity and membership state.

**IAM-011:** The system must prevent an administrator from deactivating their
own account and must preserve at least one active administrator. A field user
with current job or task assignments may not be changed to an Office-only role
until those assignments are resolved.

**IAM-012:** Every user lifecycle command must record the target user, actor,
event type, timestamp, and a human-readable summary. Passwords and password
hashes must never appear in audit payloads.

**IAM-013:** The user list must show name, email, organization role, access
state, assignment counts, creation date, last update, and actions appropriate
to the current administrator. It must also expose recent user-management
activity.

**IAM-014:** Password entry and reset must enforce the current password policy,
store only a slow password hash, and communicate temporary passwords through an
approved private channel. Public self-registration and password disclosure are
not permitted.

**IAM-015:** The future Supabase Auth migration must preserve stable application
user IDs, memberships, assignment references, audit history, administrator
authorization, and immediate deactivation/session-revocation behavior.

## 9. Core lifecycle

```text
Estimate request
  → Opportunity review
  → Site visit / information gathering
  → Estimate and revisions
  → Proposal sent
  → Won or lost
  → Project and job creation
  → Scheduling and field execution
  → Change management
  → Inspection and completion
  → Billing and closeout
  → Warranty / service
```

## 10. Release 1: Estimate-request review

### 10.1 Request list

**EST-001:** Authenticated staff must be able to open an estimate-request list.

The default list must show:

- Request number.
- Submission date and age.
- Customer or company.
- Contact name.
- Project location.
- Project type.
- Requested trades and services.
- Qualification.
- Workflow status.
- Assigned estimator.
- Next action and due date.
- File count.
- Potential value when available.

**EST-002:** Staff must be able to search by request number, company, contact,
email, phone, and location.

**EST-003:** Staff must be able to filter and sort by qualification, status,
assignee, service, project type, geography, date, next-action due date, and
potential value.

**EST-004:** Staff must be able to save personal views and reset to the
organization default.

**EST-005:** Authorized users must be able to bulk assign, update status, and
export the current result set.

Recommended initial statuses:

```text
New → Reviewing → Site Visit Needed → Estimating → Quote Sent
    → Won → Lost → Archived
```

Status transitions must be recorded as activity events. Lost requests require a
lost reason.

### 10.2 Request detail

**EST-006:** A request detail page must centralize:

- Original survey answers.
- Contact and company information.
- Site information.
- Requested services and qualification reasons.
- Plans, drawings, and photos.
- Calendly appointment state.
- Internal comments and mentions.
- Tasks, reminders, and next action.
- Assignment and status history.
- Emails and other recorded activity.
- Estimate versions after estimating begins.

**EST-007:** An authorized user must be able to assign an owner, change status,
set a next action, create a task, add an internal note, and download a private
file.

**EST-008:** Staff must be able to create or link a company, contact, site, and
opportunity from a request without re-entering captured information.

**EST-009:** Staff must be able to detect and resolve likely duplicate companies,
contacts, and opportunities without deleting the original submission.

**EST-010:** Staff must be able to convert approved or won work into a project
and one or more jobs.

**EST-011:** An authorized estimator must be able to attach a private,
versioned bid package to an opportunity before a project or job exists.

**EST-012:** Clean bid-package documents must be extracted asynchronously by
page and sheet. Machine text, human corrections, extraction status, and source
hashes must remain distinguishable.

**EST-013:** Uploading or extracting a bid package must not create an estimate,
price, project, job, task, budget, approval, proposal, or acceptance.

**EST-014:** An accepted, approved estimate must present the exact project,
jobs, work areas, starter tasks, budget, and document links before an
authorized user confirms conversion.

**EST-015:** Manual opportunity, estimate, approval, proposal, and job workflows
must remain available when document extraction or AI is disabled or failing.

### 10.3 Acceptance outcomes

- A new survey submission appears in the staff list without manual import.
- Unauthorized and unauthenticated users cannot access internal data or files.
- Every request has a visible owner, status, and next action.
- A reviewer can trace all assignments and status changes.
- Existing survey behavior and public lead submission remain operational.

## 11. Release 2: Jobs and field documentation

### 11.1 Job creation and management

**JOB-001:** Authorized office users must be able to create a job from a won
estimate, an existing project, or a manual entry.

**JOB-002:** A job must contain:

- Customer, project, and jobsite.
- Trade and scope of work.
- Job number and status.
- Planned start and completion dates.
- Assigned project manager, foreman, and crew.
- Tasks and checklists.
- Current plans and document revisions.
- Material and equipment requirements.
- Notes, photos, recordings, and activity.

**JOB-003:** A job may contain multiple work areas, units, rooms, floors, zones,
or phases.

**JOB-004:** Office staff must be able to schedule and reassign jobs. Field
workers must see only jobs permitted by their assignments and role.

**JOB-005:** Job status changes must be timestamped and attributable.

Recommended statuses:

```text
Draft → Ready to Schedule → Scheduled → In Progress → Blocked
      → Ready for Inspection → Complete → Closed
```

### 11.2 Mobile field workspace

**FLD-001:** The field interface must be mobile-first and usable in a phone or
tablet browser.

**FLD-002:** The job landing view must clearly show today's assignment, site
address, contacts, scope, latest plan set, tasks, safety information, and current
blockers.

**FLD-003:** Technicians must be able to:

- Start and complete assigned tasks.
- Record quantities completed.
- Add typed or dictated notes.
- Capture photos and videos.
- Attach evidence to a task, area, or annotation.
- Report a blocker or deficiency.
- Request materials or clarification.
- Submit a daily report.

**FLD-004:** Draft notes, annotations, and media upload intents must survive
temporary connectivity loss. The interface must visibly distinguish pending,
synced, and failed items.

**FLD-005:** A field user's landing page must contain only jobs for which that
stable user ID has a current job assignment or task assignment. Office-only
free-text project-manager, foreman, or assignee labels must not grant access.

**FLD-006:** Assigning a user to a job must make the job and its current
schedule available to that user without a second data-entry step. Removing the
last permitted assignment must remove access without deleting job history.

**FLD-007:** A task assigned to a field user must route to that same user's
Field workspace. A job-level assignment grants access to the job's task list;
a task-only assignment grants access to the job context and that assigned task.

**FLD-008:** Field users may complete permitted tasks and create field evidence,
but they must not delete office-authored task definitions or gain office access
through the Field application.

## 12. Release 3: Plans and blueprint annotation

### 12.1 Document management

**DOC-001:** Plans and diagrams must support PDF, JPEG, PNG, and WebP at minimum.

**DOC-002:** Documents must be private and associated with an organization and
an immutable document version. A version may link to an authorized request,
opportunity, estimate, project, or job without copying or moving its binary.

**DOC-003:** Uploading a replacement plan must create a new version. Existing
annotations must remain attached to the version on which they were created.

**DOC-004:** Users must be able to identify the current revision while retaining
access to authorized historical revisions.

### 12.2 Annotation requirements

**ANN-001:** A technician must be able to open a plan, select a sheet, zoom, pan,
and mark the location of work.

**ANN-002:** Initial drawing tools must include:

- Circle or ellipse.
- Polygon or freehand boundary.
- Arrow.
- Pin.
- Text label.
- Eraser or void action that preserves audit history.

**ANN-003:** An annotation must include:

- Document version and page.
- Normalized page coordinates.
- Annotation geometry and style.
- Work status.
- Trade, task, area, or scope reference when applicable.
- Author and timestamps.
- Optional text note, voice note, transcript, and media.

Recommended work states:

| State | Meaning |
|---|---|
| Planned | Work is identified but not started |
| In progress | Work has begun |
| Completed | Work has been reported complete |
| Blocked | Work cannot proceed |
| Deficiency | Rework or review is required |

**ANN-004:** Users must be able to filter annotation layers by trade, status,
crew, author, and date.

**ANN-005:** Authorized office users must be able to review annotations in the
same coordinate space used by the field team.

**ANN-006:** The system must be able to produce a marked-up PDF or closeout
report containing selected annotations.

Live collaborative drawing is not required initially. Conflict handling must
prevent one user from silently overwriting another user's annotation.

## 13. Release 4: Voice notes and transcription

**VOC-001:** A field user must be able to record a voice note from a job, task,
daily report, document, or annotation.

**VOC-002:** The recording must upload to private storage and create an
asynchronous transcription request.

**VOC-003:** The interface must display transcription states: uploading,
queued, processing, completed, and failed.

**VOC-004:** Users must be able to review and edit a completed transcript while
the original machine transcript and audio remain available to authorized users.

**VOC-005:** A user must be able to turn selected transcript content into:

- A task.
- A blocker.
- A deficiency.
- A material request.
- A daily-log entry.

**VOC-006:** The platform must record language, transcription provider, model,
processing timestamps, and confidence data when provided.

**VOC-007:** Recording consent, retention, deletion, and access rules must be
configurable and communicated to users.

Transcription processing must not block note submission or job progress.

## 14. CRM requirements

### 14.1 Companies, contacts, and sites

**CRM-001:** The system must maintain companies, individual contacts, and
jobsites as separate records.

**CRM-002:** A company may have multiple contacts, sites, opportunities,
projects, and jobs.

**CRM-003:** A contact may have different roles on different opportunities or
projects.

**CRM-004:** The record must present a unified activity timeline containing
requests, calls, emails, meetings, notes, tasks, estimates, jobs, and changes.

### 14.2 Opportunity management

**CRM-005:** Opportunities must support stage, owner, expected value,
probability, expected close date, service mix, source, lost reason, and next
action.

**CRM-006:** Activities and follow-ups must be assignable and overdue work must
appear in centralized review views.

**CRM-007:** The system should preserve source, campaign, referral, and survey
attribution from intake through won revenue.

### 14.3 Future portals

Future releases may provide:

- Customer proposal review and acceptance.
- Progress and closeout document access.
- Warranty requests.
- Subcontractor assignment and compliance access.

Portal permissions must be explicit, time-bounded where appropriate, and limited
to the relevant company, project, or job.

## 15. Estimating and commercial requirements

**QTE-001:** Estimates must support multiple immutable versions.

**QTE-002:** An estimate must support labor, material, equipment,
subcontractor, overhead, markup, tax, alternates, allowances, inclusions, and
exclusions.

**QTE-003:** Reusable price-book items, assemblies, and scope templates must be
available by trade. A price-book item must support an organization-unique item
code, item kind (material, labour, equipment, subcontractor, or allowance),
trade, description, unit, optional supplier, optional internal unit cost, and
Canadian-dollar selling price. Cost and selling-price changes must create an
immutable draft revision that an administrator approves. An item can be
retired without deleting it. Existing estimate versions continue to use their
snapshotted approved selling price. Assemblies and scope templates are not
stored yet.

**QTE-004:** Authorized users must be able to compare revisions and require
internal approval based on configurable thresholds.

**QTE-005:** The system must generate a branded proposal and record delivery,
view, acceptance, rejection, and expiration.

**QTE-006:** A won estimate must create an approved project budget without
discarding the estimate history.

**QTE-007:** Change orders must have scope, price, schedule impact, status,
approval evidence, and budget effect.

### 15.1 Bid package to approved jobs

**BID-001:** An opportunity must accept private PDF, JPEG, PNG, and WebP bid
documents before a project or job exists. Upload tokens must be short-lived,
organization-bound, opportunity-bound, and object-bound.

**BID-002:** Every replacement file must create an immutable document version.
The platform must retain filename, kind, revision, byte size, content type,
SHA-256, private object key, uploader, and predecessor.

**BID-003:** Untrusted uploads must remain quarantined until scan success.
Malware-positive files must not be rendered, extracted, downloaded broadly, or
sent to an AI provider.

**BID-004:** Document scan, text extraction, OCR, and page chunking must run as
idempotent durable worker jobs with checkpoints, retry budgets, and dead-letter
visibility.

**BID-005:** Every extracted or AI-proposed claim must cite an authorized
immutable document version, page, optional sheet, text span or bounding box,
and content hash. Human correction must not destroy machine output.

**BID-006:** AI may propose scope, job packages, estimate lines, clauses,
alternates, questions, candidate price-book items, and an explicitly written
quantity. Upload and AI proposal write no business record until a person
selects and applies the suggestion.

**BID-007:** A written quantity may be cited only when it is explicit in the
document. A measured quantity is AI-027: a person confirms the scale and the
region, and the server calculates square feet, linear feet, or a count.
Missing, ambiguous, conflicting, or unscaled geometry must display **Takeoff
required**. The model must not supply the stored quantity or the price.

**BID-008:** AI must not generate or select price, cost, markup, overhead, tax,
discount, total, approval, proposal delivery, project, or live job. The server
must reject prohibited output before storing a proposal.

**BID-009:** A price-book item must have immutable human-approved revisions.
An estimate line must snapshot the chosen revision, unit, quantity, CAD unit
price, pricing method, taxable state, calculation policy, and rounded amount.
Changing or retiring an item must not alter a prior estimate version.

**BID-010:** Estimate quantities must use bounded decimal precision and money
must use integer CAD cents. The server must calculate line, overhead, markup,
tax, alternate, and total amounts deterministically and ignore client/model
totals.

**BID-011:** Every estimate edit must create a new immutable version.
Comparison must identify changed scope, quantity, selected price revision,
amount, clause, alternate, job package, approval threshold, and total.

**BID-012:** Approval, proposal, delivery, view, acceptance, rejection,
expiration, and revocation must bind to the exact estimate version and content
hash. Proposal generation does not send it, and customer acceptance does not
create operational records.

**BID-013:** An authorized internal confirmation must convert one accepted
estimate exactly once. One transaction creates or links one project, every
approved job package, its work areas and starter tasks, the approved project
budget, selected document links, status changes, audit events, and publication
outbox events.

**BID-014:** Duplicate, concurrent, retried, stale, expired, revoked, or
cross-organization acceptance and conversion requests must create no duplicate
or partial effect.

**BID-015:** Bid documents, extraction, commercial records, AI proposals,
pricing, approval, proposal events, acceptance, exports, and conversion must
be organization-scoped and append-only where the PRD requires immutable or
auditable evidence. Field users must not receive commercial access.

## 16. Project and operational requirements

Future operational releases should provide:

- Project milestones and dependencies.
- Calendar, dispatch board, crew capacity, and scheduling. The day dispatch
  board in section 16.2 is the first slice. Crew capacity remains future work.
- Daily field reports and weather/site conditions.
- Labor time and piece work. Hours and piece counts are specified in
  section 16.3. A wage is not stored.
- Material requests, purchase orders, receipts, and delivery tickets. A
  purchase order that cites material requests is section 16.5. Receipts and
  delivery tickets remain future work.
- Equipment assignment and usage. A named assignment is section 16.6.
  Rentals and inventory remain future work.
- Safety forms and incidents.
- RFIs, submittals, inspections, and deficiencies. A named inspection on a
  job is section 16.7. RFIs, submittals, and deficiency workflows remain
  future work.
- Punch lists and rework.
- Customer completion sign-off.
- Closeout packages and warranty service.

### 16.1 Project schedule roll-up

The project detail page must give project managers one schedule view across all
jobs and job tasks. Delivery is incremental within this feature: the first
phase uses existing job dates and task due dates, and subsequent phases add
task durations, dependencies, critical path, and controlled rescheduling
without changing the roll-up's hierarchy.

**SCH-001:** An authorized user must be able to open a **Schedule** section on a
project and see every job attached to that project.

**SCH-002:** The schedule must use a two-level hierarchy:

```text
Project
  → Job
      → Job task
```

Job rows must be expandable and collapsed job rows must still show job-level
progress and schedule state.

**SCH-003:** A job with planned start and completion dates must render as a bar
across that range. A job with one date must render as a milestone. A job with
no planned dates must appear in a clearly labelled **Unscheduled** group rather
than disappearing.

**SCH-004:** In the first release, a task with a due date must render as a
milestone. Tasks without a due date remain visible beneath their job in an
**Unscheduled tasks** group. The interface must not imply a task duration that
has not been entered.

**SCH-005:** Each job row must show completed tasks, total tasks, and percentage
complete. Project progress is:

```text
completed tasks across project ÷ total tasks across project
```

Projects or jobs with no tasks display **No tasks** instead of an inferred
percentage. Job status remains visible and is not replaced by calculated task
progress.

**SCH-006:** The schedule must visibly distinguish open, complete, blocked,
overdue, and unscheduled work. Status must use text or an icon in addition to
color. A vertical **Today** marker must use the organization time zone.

**SCH-007:** Managers must be able to:

- Expand or collapse job task rows.
- Switch between week and month density.
- Filter to all, remaining, complete, blocked, overdue, or unscheduled work.
- Move the visible window backward, forward, or back to today.
- Open a job or task from its schedule row.

**SCH-008:** The visual schedule must have an accessible tabular alternative
that contains job/task, status, assignee, planned start, planned completion or
due date, and progress. Keyboard and screen-reader users must not need the
graphical timeline to retrieve schedule facts.

**SCH-009:** Completed work remains visible by default. A manager may hide
completed rows, but the application must not delete or silently exclude them
from progress totals.

**SCH-010:** The schedule is read-only in its first release. Managers edit job
dates and task details through the existing validated edit dialogs. Dragging a
bar or milestone must not silently change a schedule.

**SCH-011:** The task-scheduling enhancement must add optional planned start,
planned completion, and actual completion timestamps to job tasks. A task with
both planned dates then renders as a bar; a task with only a due date remains a
milestone.

**SCH-012:** Planned task completion must not precede planned task start.
Task dates outside the parent job range are allowed because field conditions
may require them, but the UI must show a schedule warning.

**SCH-013:** Completing a task must set its actual completion timestamp.
Reopening it must clear that timestamp. Both changes remain attributable in the
job activity history.

**SCH-014:** Authorized managers must be able to create and remove
finish-to-start task dependencies across jobs in the same project. Duplicate,
self-referential, cross-project, and circular dependencies must be rejected.
Each relationship may include a non-negative working-day lag.

**SCH-015:** The schedule must calculate and identify the project critical path
from scheduled task duration, finish-to-start dependencies, and lag. Critical
status must use a label or icon in addition to color. Unscheduled tasks and
tasks outside the dependency network must not be presented as critical.

**SCH-016:** Authorized managers must be able to drag a scheduled job or task to
propose new dates. The UI must show the exact before/after dates and require
confirmation before saving. Task moves preserve duration; due-only milestones
move the due date. A dependency violation must be rejected with the conflicting
predecessor or successor named.

**SCH-017:** Every reschedule must be server-validated, authorization-checked,
protected against stale writes, and recorded with actor, source dates, target
dates, entity version, and timestamp. Keyboard users must have a non-drag
reschedule control with equivalent behavior.

**SCH-018:** The project schedule must remain usable with at least 100 jobs,
1,000 tasks, and 2,000 dependency edges through bounded project-scoped queries,
collapsed rows, and horizontal timeline virtualization or bounded rendering.

**SCH-019:** Authorized managers must be able to capture a named schedule
baseline and compare current job/task dates with it. The schedule must show
start variance, finish variance, and newly scheduled or removed items without
changing the immutable baseline.

**SCH-020:** Managers must be able to switch to a resource overlay grouped by
stable assigned user identity for field foremen, technicians, and task
assignees. Project-manager labels may remain informational until office
identity migration is complete. Legacy free-text field labels must appear as
unassigned rather than being treated as a real worker. Concurrent assignments
for the same user ID must be highlighted as potential conflicts; the overlay
does not infer hours or capacity that the system does not store.

**SCH-021:** Schedule geometry, critical path, dependency lag, and rescheduling
must use a configurable working-day calendar. The initial calendar treats
Saturday and Sunday as non-working and allows authorized managers to add dated
closures or working-day exceptions. Stored timestamps remain unchanged.

**SCH-022:** Job and task bars must use the same stable assignment records that
authorize Field. When an authorized manager assigns, unassigns, schedules, or
reschedules work, the affected worker's Field application must receive the
change through the realtime event path. The Schedule must not imply that a
free-text name can sign in or receive the job.

**SCH-023:** Authorized managers must be able to open a dedicated portfolio
**Schedule** and see every active project in a Project → Job → Job task
hierarchy. Projects with no jobs or no dates must remain visible.

**SCH-024:** The portfolio Schedule must support shareable URL filters for
project status, project manager, schedule state, search, Work/Resources view,
week/month density, visible date anchor, latest-baseline comparison, and hidden
completed rows. Active projects are the default scope.

**SCH-025:** Portfolio project rows must roll up task progress, earliest
scheduled start, latest scheduled finish, blocked/overdue/unscheduled counts,
and latest-baseline finish variance without inventing dates.

**SCH-026:** Critical paths, dependency facts, working-day geometry, and
baseline variance must remain isolated to each project. The application must
not present a portfolio-wide critical path or cross-project dependency.

**SCH-027:** The portfolio Schedule is read-only. Schedule edits, dependency
management, baseline capture/removal, and calendar management must drill into
the owning project Schedule so authorization, calendar, and optimistic version
checks remain unambiguous.

**SCH-028:** The portfolio Resources view must group normalized project
manager, foreman, and task assignee values across projects. It may label a
**Potential overlap** only when two assignment ranges share a date that both
projects treat as a working day. It must not infer hours or capacity.

**SCH-029:** Latest-baseline portfolio comparison must independently select the
most recently captured non-deleted baseline for each project, display its name
and capture date, and label projects without one as **Not baselined**.

**SCH-030:** The portfolio Schedule must use bounded set-based reads for
projects, jobs, tasks, dependencies, calendars, exceptions, baseline headers,
and baseline items. Query count must not grow with project count, and every
exceeded bound must show a partial-result warning.

**SCH-031:** Home must provide schedule-attention widgets for overdue tasks,
unscheduled active work, projects behind their latest baseline, and potential
resource overlaps, plus the next five schedule events within 14 days. Widgets
must use the same portfolio projection as the full page.

**SCH-032:** Every schedule dashboard widget must link to a matching filtered
portfolio Schedule. The portfolio chart must have an equivalent table and
remain keyboard-usable and horizontally scrollable at 375px with 44px targets.

#### 16.1.1 Acceptance outcomes

- A manager can identify completed, remaining, blocked, overdue, and
  unscheduled work without opening each job.
- Every project job appears, including jobs with missing dates.
- Expanding a job shows all of its tasks, including tasks without due dates.
- Progress totals update after a task is completed or reopened.
- Clicking a job or task reaches the underlying source record.
- Valid dependency links appear between scheduled tasks, and cycles are
  rejected.
- Critical tasks are identified consistently from task duration, dependencies,
  and lag.
- Dragging or keyboard-rescheduling shows a before/after confirmation and only
  saves after server validation.
- A captured baseline remains immutable and displays current date variance.
- The resource overlay groups existing assignments and flags overlapping work.
- A scheduled bar assigned to a stable user appears for that exact Field user,
  while an unassigned or legacy-labelled bar grants no Field access.
- Calendar exceptions change schedule calculations without rewriting stored
  dates.
- Active projects roll up into one portfolio Schedule without per-project
  query loops.
- Portfolio critical paths, calendars, and baselines remain project-specific.
- Dashboard schedule widgets agree with and drill into the portfolio Schedule.
- Cross-project assignment overlaps are labelled as potential conflicts
  without invented utilization.
- Week and month views preserve the same records and facts.
- The tabular alternative communicates the same schedule information as the
  chart.
- The 375px layout keeps row labels readable and makes the timeline
  horizontally scrollable without shrinking touch targets.

### 16.2 Day dispatch

A dispatch places one active field member on one job for one work date. It
does not replace the durable job assignment, move the schedule, or recommend
a crew. Closeout stays future work. Hours and
piece work are section 16.3. Purchase orders are section 16.5. Equipment is
section 16.6. Inspections are section 16.7.

**DSP-001:** An office user can open a Dispatch board for one work date. The
default date is the working day in America/Toronto.

**DSP-002:** A dispatch stores the job, the field member, the work date, an
optional note, and a status of scheduled or cancelled. Job assignments remain
a separate record.

**DSP-003:** One organization has one row for the same job, person, and date.
Cancelling keeps that row. Scheduling the same triple again returns it to
scheduled instead of creating a second row.

**DSP-004:** The same person may be scheduled on two jobs the same day. The
board and Home show that double booking. The save is not refused.

**DSP-005:** A closed job cannot be dispatched. The person must be an active
field member of the organization.

**DSP-006:** Administrators and office users can schedule and cancel. Field
users can read only their own scheduled rows for the working day on the field
landing. The query enforces that scope. A scheduled dispatch for that day
also lets the field member open that job. A cancelled dispatch does not.

**DSP-007:** Home shows active jobs with no scheduled dispatch that day, and
people scheduled on more than one job, to users who can read dispatch.

**DSP-008:** Schedule and cancel write an audit event for the session
organization.

### 16.3 Field labor

Field labor is either time or piece work. Piece work is the count of bags or
square feet a person completed. Hours are the time they worked. The same
person can have both on one job and day. The record stores no rate and no
pay. Individual compensation stays out of scope under IMP-024.

**LAB-001:** A labor entry is one field member, one job, one work date, and
one measure: hours or piece work.

**LAB-002:** Piece work is a whole number of bags or square feet. Hours are a
duration greater than zero and no more than 24 hours. Both measures may exist
for the same person, job, and day, including bags and square feet together.

**LAB-003:** Saving the same person, job, day, and measure updates that entry
instead of adding a second row. Removing an entry writes an audit event.

**LAB-004:** Administrators and office users can record and remove any field
member's labor. A field member can record and remove only their own labor, and
only on a job they are assigned to or dispatched to that working day.

**LAB-005:** A closed job cannot take labor. The person must be an active
field member of the organization.

**LAB-006:** The dispatch board lists that day's labor. The field landing
records the signed-in person's labor for the working day.

**LAB-007:** Record and remove write an audit event. The payload has the
measure and no wage.

### 16.4 Production attribution and workforce efficiency

Field labor is the capture foundation for workforce performance, but a piece
count by itself is not enough to rank a worker or crew. The complete data
contract and implementation sequence are in
[`workforce-performance-spec.md`](workforce-performance-spec.md). The first
operational slice is enabled in production. `OPS_WORKFORCE_PERFORMANCE` is `1`
for production and preview. Demo mode enables the same flag when the variable
is unset, and `0` hides the feature. It records production, verifies it,
calculates comparable efficiency, shows a private field view, and shows an
unranked office review. Deficiency and rework records in section 16.9
appear as a separate quality label. Named inspections in section 16.7 are
recorded and are not scored. Rankings, wages, and the financial bridge are
not enabled.

**WFP-001:** Installed production must be an authoritative record with
organization, job, work date, optional task and work area, trade or work type,
one unit, quantity, attribution mode, review status, recorder, and timestamps.
It must not be inferred by adding every worker's piece count.

**WFP-002:** A stated task quantity is planned or remaining work, not installed
production. A quantity field note may create or link to one production record,
but analytics must not count both. A labor piece count remains valid
operational evidence and is not verified production until explicitly linked or
reviewed.

**WFP-003:** A production record may be crew-only or have individual
allocations. Individual allocations must not exceed verified production. Crew
production without an individual allocation may produce a crew metric but not
an individual score.

**WFP-004:** Actual crew-hours are the sum of linked participant minutes.
Individual efficiency requires both an individual production allocation and
the person's linked hours for comparable work. Overlapping labor and
over-allocated production must be rejected or excluded with a visible reason.

**WFP-005:** A production target must be approved, immutable, and
effective-dated. It must identify organization, trade, work type, unit, target
basis, and target rate. Bags, square feet, and materially different work
classes must not be compared as raw totals.

**WFP-006:** Earned hours equal verified quantity divided by the matching target
rate. Efficiency equals earned hours divided by actual comparable hours,
multiplied by 100. Roll-ups use total earned hours divided by total actual
hours; they must not average percentages.

**WFP-007:** A result is not calculable when production is unverified, hours or
an approved target are missing, units are incompatible, attribution is
incomplete, or records overlap. The API and UI must return the exclusion reason
instead of zero or a guessed score.

**WFP-008:** Verify, correct, void, allocate, target-approve, export, and rollout
actions require organization authorization and audit evidence. A person cannot
verify an entry or allocation that affects their own individual score. Voiding
preserves the original record.

### 16.5 Purchase orders

A purchase order cites open material requests on one job. It is not a price,
a receipt, or a vendor bill. The material request stays in the field log.
Deleting a cited request is refused so the order keeps its evidence.

**PO-001:** An office user can draft a purchase order on an open job. The
draft stores a supplier, an optional note, and one or more lines. Each line
copies one material request's description and, when present, its quantity and
unit. A material request can store an optional whole quantity and field unit.
A quantity entry still requires both. Other field notes leave quantity blank.
No price is stored.

**PO-002:** One material request can sit on one draft or ordered purchase
order. A second draft that cites it is refused.

**PO-003:** Ordering a draft marks that order ordered and locks it. A closed
job cannot be drafted or ordered. Cancelling a draft or ordered row keeps the
order and releases the material requests so they can be drafted again.

**PO-004:** Administrators and office users can draft, order, and cancel.
Field users can read purchase orders on a job they can open and cannot change
them.

**PO-005:** The job page lists the orders and the material requests still
waiting. Home lists draft orders and uncited material requests on open jobs
for users who can read purchase orders.

**PO-006:** Create, order, and cancel write an audit event with the supplier,
status, and line count. The payload has no price.

**PO-007:** A later edit to the material request does not change the copied
line. Receipts, delivery tickets, inventory, and cost stay unbuilt.

### 16.6 Equipment

An equipment assignment names one piece of equipment on one job. It is not a
rental rate, an inventory count, or a maintenance log. Two machines need two
names.

**EQ-001:** An office user can assign equipment to an open job. The row stores
the name and an optional note. No rate is stored.

**EQ-002:** One organization has one row for the same job and equipment name,
ignoring letter case. Assigning that name again while it is assigned is
refused.

**EQ-003:** Releasing keeps the row. Assigning the same job and name again
marks that row assigned.

**EQ-004:** A closed job cannot take a new assignment. Releasing an existing
row stays available after the job closes.

**EQ-005:** Administrators and office users can assign and release. Field
users can read equipment on a job they can open and cannot change it.

**EQ-006:** Home lists a name that is assigned to more than one open job. A
released row and a closed job do not count.

**EQ-007:** Assign and release write an audit event with the name and status.
The payload has no rate.

### 16.7 Inspections

An inspection records one named result on one job. It is not a price, a
deficiency workflow, or a closeout packet.

**INS-001:** An office user can record an inspection on an open job. The row
stores a name of 1 to 80 characters, a result of open, passed, or failed, and
an optional note of at most 500 characters. No price is stored.

**INS-002:** One organization has one row for the same job and inspection
name, ignoring letter case. Recording that name again updates the result, the
display name, and the note, and keeps the same row.

**INS-003:** A closed job cannot take a new inspection or a change to an
existing one. Existing rows stay readable.

**INS-004:** Administrators and office users can record inspections. An
estimator uses the office permissions. Field leads and field workers can read
inspections on a job they can open and cannot change them.

**INS-005:** Home lists open and failed inspections on jobs that are not
closed. A passed row and a closed job do not count. The list is failed, then
open, then job name, then inspection name.

**INS-006:** Recording an inspection writes an audit event with the job, name,
and result. The payload has no price or rate.

### 16.8 Closeout

A closeout is one completion record on one job. It is not a price, a customer
send, or a warranty claim.

**CLO-001:** An office user can record closeout on an open job. The row stores
a status of preparing, ready, or signed, and an optional note of at most 500
characters. One job has one closeout. Recording again updates that row. No
price is stored.

**CLO-002:** Signed is refused while any inspection on that job is open or
failed. A job with no inspections can be signed. Preparing and ready do not
wait on inspections.

**CLO-003:** A closed job cannot take a new closeout or a change. The existing
row stays readable.

**CLO-004:** Administrators and office users can record closeout. An estimator
uses the office permissions. Field leads and field workers can read closeout
on a job they can open and cannot change it.

**CLO-005:** Home lists preparing and ready closeouts on jobs that are not
closed. A signed row and a closed job do not count. The list is ready, then
preparing, then job name.

**CLO-006:** Recording a closeout writes an audit event with the job and
status. The payload has no price.

**CLO-007:** An office user can record one insulation assembly on an open job:
location, target R-value, area, bag count, and product, plus an optional
rebate program. Recording again updates that row. The agent drafts a closeout
packet from that assembly, job photos, stated quantities, and plan marks.
Saving the draft stores it on the closeout. Saving does not send it and does
not change the closeout status.

### 16.9 Deficiencies and rework

A quality record is one deficiency or one rework item on one job. It is not a
price, an inspection, or a workforce score. Inspections in section 16.7 stay
on their own list. Quality is shown beside efficiency and does not change the
efficiency number.

**QAL-001:** An office user can record a deficiency or a rework item on an
open job. The row stores a kind, a name of 1 to 80 characters, a status of
open, corrected, or reopened, and an optional note of at most 500 characters.
No price is stored.

**QAL-002:** One organization has one row for the same job, kind, and name,
ignoring letter case. Recording that name again for the same kind updates the
status, the display name, and the note, and keeps the same row. The same name
may exist once as a deficiency and once as rework.

**QAL-003:** A closed job cannot take a new record or a change. Existing rows
stay readable.

**QAL-004:** Administrators and office users can record quality. An estimator
uses the office permissions. Field leads and field workers can read quality
on a job they can open and cannot change it.

**QAL-005:** Home lists open and reopened records on jobs that are not closed.
A corrected row and a closed job do not count. The list is reopened, then
open, then deficiency before rework, then job name, then name.

**QAL-006:** Recording a quality row writes an audit event with the job, kind,
name, and status. The payload has no price.

**QAL-007:** Workforce quality is a separate label from efficiency. A worker
with no deficiency or rework on a job they worked, or were scheduled on that
day, shows “not available.” When every such record is corrected, the label is
“clear.” An open or reopened record names that exception. The efficiency
number does not change. Inspections do not change the label. The field view
shows only the signed-in worker. The office list stays unranked. Home names a
worker whose 28-day efficiency is at or above target and whose quality is an
exception.

## 17. Trade-specific requirements

The platform must use shared project and job primitives while allowing
trade-specific templates and fields.

### 17.1 Insulation

- Assembly location: attic, wall, rim joist, basement, crawlspace, or roof.
- Existing and target R-value.
- Area, depth, density, and coverage.
- Product type, manufacturer, batch, and lot.
- Bag count or installed quantity.
- Air-barrier and vapor-barrier conditions.
- Thermal images and blower-door results.
- Rebate and energy-program documentation.

### 17.2 Drywall

- Board type, thickness, fire rating, and moisture rating.
- Wall, ceiling, and room quantities.
- Sheet or square-foot takeoff.
- Finish level.
- Hanging, taping, sanding, and repair stages.
- Room-level deficiencies and completion.

### 17.3 Flooring

- Room-level area and perimeter.
- Waste factor and pattern direction.
- Flooring product, manufacturer, and dye lot.
- Subfloor condition and preparation.
- Moisture-test results.
- Acclimation and cure-time logs.
- Stairs, transitions, trims, and baseboards.

### 17.4 Home building

- Community, lot, model, and phase.
- Bid packages and trade partner assignments.
- Selections, options, and allowances.
- Permits and inspections.
- Purchase orders and construction draws.
- Deficiencies, handover, and warranty claims.

## 18. Job costing and financial requirements

The platform should become the operational source for job cost detail while
integrating with established accounting software.

Future financial capabilities include:

- Original, revised, committed, and actual budgets.
- Labor, material, equipment, and subcontractor costs.
- Purchase orders, receipts, and vendor bills.
- Inventory and warehouse transfers.
- Timesheets and payroll export.
- Progress billing, deposits, retainage, invoices, and payments.
- Revenue and cost forecasting.
- Profitability by project, job, trade, crew, estimator, and customer.
- Synchronization with QuickBooks, Sage, or another selected accounting system.

A general ledger, payroll calculation, and tax engine remain outside the initial
scope.

Workforce efficiency is operational before it is financial. WFP-001 through
WFP-018 may calculate verified production, crew-hours, earned hours, and
normalized efficiency without a wage. Standard labor cost, accounting actual,
estimate-to-actual variance, and margin belong in a restricted financial view
only after the accounting system of record and cost permissions are approved.

## 19. Centralized command center and reporting

**RPT-001:** Role-based dashboards must surface actionable exceptions rather
than only aggregate charts.

Examples include:

- Unreviewed estimate requests.
- Overdue next actions.
- Estimates waiting for internal or customer approval.
- Jobs without assigned crews.
- Jobs blocked in the field.
- Failed uploads or transcriptions.
- Open deficiencies and inspections.
- Unapproved change orders.
- Cost or schedule variance.
- Missing daily logs or time entries.

AI-013 covers the exception queue for records that exist today: missing daily
logs, failed transcriptions, blocked jobs, overdue tasks, and voice notes that
have not been extracted. Unapproved change orders and open or failed
inspections appear on Home. Cost variance appears in this queue only after
its source records exist.

**RPT-002:** Users must be able to navigate from a dashboard result to the
underlying record and activity history.

**RPT-003:** Reports must use consistent organization time zone, currency, and
status definitions.

### 19.1 Workforce performance

**WFP-009:** The field application must provide a private My Performance view
for the signed-in worker. It shows today's verified production and hours,
current pace, seven-day and 28-day trends, included sample, documentation
status, available quality context, personal bests for comparable work, and
factual next actions.

**WFP-010:** The field application must not expose coworker rankings, a public
leaderboard, wages, piece rates, payroll amounts, or inferred compensation. It
must not reward overtime, skipped breaks, unverified output, or unavailable
quality evidence.

**WFP-011:** Office users with workforce-performance permission must receive a
dedicated Workforce Performance view for workers and crews. It lists role,
trade, verified production by unit, actual hours, production rate, normalized
efficiency, trend, quality and documentation context, comparable sample, and
last active date.

**WFP-012:** The office view must filter by date, worker or crew, trade, work
type, unit, job, customer, role, eligibility, and review state. Every result
must drill into its production, labor, allocation, target revision, job, and
exception evidence.

**WFP-013:** Ranked office results require a configurable minimum comparable
sample. The initial proposed policy is three verified shifts and twelve actual
hours. A smaller sample stays visible as insufficient data and receives no
rank.

**WFP-014:** Quality, safety, rework, deficiencies, inspections, and
documentation must be separate, visible dimensions, not hidden deductions in
the efficiency formula. A missing source is “not available,” not a pass.

**WFP-015:** Home must show workforce exceptions rather than a leaderboard:
missing labor, missing production, production awaiting review, repeated
below-target comparable shifts, high efficiency with quality exceptions,
overlapping labor, and over-allocated production.

**WFP-016:** Performance metrics must not trigger an automated employment,
compensation, discipline, termination, or scheduling decision. Policy,
minimum-sample, comparison-class, and human-review controls require explicit
approval before office rankings are enabled.

**WFP-017:** After the accounting system of record is approved, a separately
authorized financial dashboard may add earned versus actual hours, standard
versus accounting labor cost, labor cost per unit, estimate-to-actual labor
variance, and margin by job, trade, or crew. Individual wages stay outside the
operational model and field application.

**WFP-018:** Rollout must be feature-flagged. Calculations first run in shadow
mode, then My Performance may open after reviewed validation, and office
rankings may open only after policy sign-off. Rollout monitoring must check
attribution errors, metric gaming, quality regressions, and worker feedback.

## 20. Notifications and activity

- Notifications must support in-app delivery first and email where useful.
- Users must be able to follow records or be notified through assignment,
  mentions, due dates, status changes, and exceptions.
- Notification delivery must be asynchronous and retryable.
- Business events must be distinct from delivery attempts.
- The activity timeline must distinguish human actions, system actions,
  integration actions, and field submissions.

### 20.1 Office and Field realtime contract

**RT-001:** Office and Field communicate through authoritative domain commands
and a versioned event stream. The applications must not call each other
directly or maintain separate writable job databases.

**RT-002:** Office-to-Field events include assignment, unassignment, schedule,
job status, scope, task, plan, and blocker-resolution changes. Field-to-Office
events include task completion, notes, quantities, blockers, material requests,
daily reports, photos, and later annotations and transcripts.

**RT-003:** An online client must reflect an authorized job event without a
manual browser refresh. Reconnect must load current authoritative state and
resume from a durable cursor or equivalent catch-up boundary.

**RT-004:** Realtime delivery may be at least once. Every event requires a
unique ID, organization and record scope, schema version, actor, timestamp, and
entity revision where updates may conflict. Clients must deduplicate; commands
must use idempotency and optimistic concurrency where retries could duplicate
effects.

**RT-005:** Subscription authorization must be rechecked independently of page
visibility. Field users may subscribe only to their assignment channel and jobs
currently permitted by IAM-005. Deactivation or unassignment must end access on
the next authorization check or reconnect.

**RT-006:** The current bounded server-sent event stream may provide the first
online implementation over durable `job_events`. Production migration must
move publication to the Render API/worker transactional outbox and private
Supabase Realtime channels without changing the event semantics.

## 21. Data model direction

The expected domain model includes:

```text
organizations, users, memberships, roles
companies, contacts, sites
leads, opportunities, activities
estimates, estimate_versions, estimate_lines
projects, jobs, work_areas, tasks, assignments
documents, document_versions, annotations
voice_notes, transcripts, photos
crews, time_entries, production_entries
materials, equipment, purchase_orders, receipts
costs, invoices, payments
change_orders, inspections, deficiencies, daily_logs
notifications, audit_events, integration_events
outbox_events, background_jobs, dead_letter_jobs
data_import_batches, data_import_sheets, data_import_rows
data_import_mapping_profiles, external_record_keys, data_import_events
ai_runs, ai_steps, ai_citations, ai_proposals, ai_approvals
ai_tool_executions, knowledge_chunks, embedding_versions
```

Data-model rules:

- Every business record must be scoped to an organization.
- Public lead intake must not gain access to internal records.
- Files belong in private object storage; searchable metadata belongs in
  PostgreSQL.
- Documents and estimate versions are immutable.
- Annotation geometry is stored independently from document binaries.
- Human-edited transcripts must not destroy original machine output.
- Business events and audit events should be append-only.
- Deletion and retention must respect legal, contractual, and privacy needs.

### 21.1 Supabase Data Import Center

The Import Center moves Strong Foam's existing spreadsheets into the canonical
CRM/ERP model. Upload and analysis are staging operations. They do not create
or update customers, users, prices, opportunities, projects, jobs, assignments,
work areas, or tasks until an administrator commits the exact validated
preview.

The canonical first-release workbook supports companies, contacts, sites,
workforce, price-book items, opportunities, projects, jobs, assignments, work
areas, and tasks. Stable source codes preserve relationships and support safe
repeat imports. Binary plans, photos, audio, historical estimates, proposals,
acceptances, payroll, and accounting transactions require separate migration
contracts.

#### Authority and private storage

**IMP-001:** An Office user may upload, map, validate, reconcile, and cancel an
uncommitted import. Only an administrator may commit.

**IMP-002:** Field roles must not list, read, upload, validate, download, or
commit import files or staged records.

**IMP-003:** Organization scope must come from the authenticated session and
stored batch. A workbook, URL, form, or job payload may not choose another
organization.

**IMP-004:** XLSX and CSV source files must use a private Supabase Storage
bucket with server-generated organization/batch object paths and short-lived,
object-scoped upload and download authorization.

**IMP-005:** Supabase secret/service credentials, database credentials, and
unrestricted object access must never reach browser code.

#### Parsing, mapping, and validation

**IMP-006:** Release 1 must accept `.xlsx` and UTF-8 `.csv` within documented
file, sheet, row, ZIP-entry, and uncompressed-size limits. Legacy `.xls`,
macros, protected workbooks, embedded objects, and unsupported external links
must fail closed.

**IMP-007:** A durable worker must scan a source for malware and bound XLSX
archive expansion before parsing. Analysis is checkpointed, retryable, and
writes no business record.

**IMP-008:** Mapping profiles may store sheet, header, constant, and value
mappings. They must not store source row values.

**IMP-009:** The server must not evaluate workbook formulas. A formula requires
a safe cached scalar value or correction in the source workbook.

**IMP-010:** The server must normalize codes, emails, CAD money, quantities,
dates, booleans, roles, statuses, services, trades, units, and item kinds
deterministically. It must not guess ambiguous dates or enum values.

**IMP-011:** Every staged row must retain source sheet/row, normalized payload,
source key, proposed operation, row hash, resolved references, warnings, and
errors.

**IMP-012:** Any row error, missing required relationship, or unresolved
conflict must block commit.

**IMP-013:** An existing source-key crosswalk or exact protected natural key may
resolve a record. Fuzzy company, project, worker, address, phone, or name
matches are suggestions only and must never merge automatically.

**IMP-014:** Preview counts, operations, mappings, resolutions, and row hashes
must be bound to the committed batch revision. A stale preview must be
revalidated.

**IMP-015:** Omission from a spreadsheet must not delete, retire, deactivate,
or unassign an existing record. Destructive synchronization requires a
separate explicit workflow.

#### Transactional commit and replay

**IMP-016:** Commit must reload session authority, organization, batch,
mapping, staged rows, crosswalks, and current target records server-side. It
must not accept normalized business payloads or target IDs from the browser.

**IMP-017:** Release 1 must commit a validated batch of at most 25,000 rows in
one transaction under an organization-scoped PostgreSQL advisory lock.

**IMP-018:** Commit must be idempotent by organization and idempotency key.
Source-key crosswalk uniqueness must prevent duplicate records across repeat
imports.

**IMP-019:** Import must not send messages or notifications, generate or
approve an estimate, create a proposal or acceptance, run won-work conversion,
or invoke an AI model.

**IMP-020:** Completion must produce source/create/update/skip/warning/error
counts by entity, target IDs by source row, zero unresolved-reference count,
an audit correlation ID, and a downloadable reconciliation report.

#### Price book and workforce

**IMP-021:** Price-book imports must support item code, item kind, trade,
description, unit, optional supplier, optional internal unit cost, selling
price, effective date, and active state.

**IMP-022:** A changed imported price-book row must create or update one draft
revision. It must not mutate or silently approve an approved revision.

**IMP-023:** Estimates must continue to price from a human-selected approved
selling-price revision. Internal cost must not replace selling price in an
estimate total.

**IMP-024:** Generic crew or role-based labour estimating rates may be imported
as hourly price-book items. Individual compensation and payroll wages are out
of scope and require a separately restricted model.

**IMP-025:** Workforce import must accept no password. A new workforce identity
must be inactive and unable to authenticate until an administrator completes
the normal activation/credential or future Supabase invitation flow.

**IMP-026:** Existing workforce may match only by stable crosswalk or exact
normalized email. A later Supabase Auth migration must preserve the stable
application user ID, membership, assignment, and audit history required by
IAM-015.

#### Audit, retention, and disabled operation

**IMP-027:** Upload, analysis, mapping, conflict resolution, authorization,
commit, retry, failure, cancellation, and retention must be audited without
copying raw rows, passwords, tokens, signed URLs, or file bytes into audit
payloads.

**IMP-028:** Import staging and crosswalk tables must live outside exposed
Supabase API schemas. Public business records remain organization-scoped and
subject to domain authorization and reviewed RLS.

**IMP-029:** Cancelled objects must be deleted after cancellation, failed
pre-analysis objects retained no longer than 7 days, completed source/raw data
no longer than 30 days, and normalized row reports no longer than 90 days.
Batch summaries, crosswalks, commit authorization, and audit events are
retained.

**IMP-030:** Demo mode may provide a deterministic, network-free preview but
must not claim durable completion. Supabase Storage, parser, worker, or import
failure must leave all manual CRM, pricing, user, project, job, and task
workflows usable.

## 22. Design system

### 22.1 Design direction

The authenticated operations product uses **shadcn/ui** (base-nova) as its
design system: sidebar navigation, cards, tables, badges, alerts, and form
controls from the shared component registry.

The public marketing site retains its cinematic, dark, motion-led presentation
and Strong Foam brand tokens. The two surfaces are intentionally separate so
staff tools stay dense and standard while the website stays branded.

Design dials for the authenticated product:

| Dial | Target | Meaning |
|---|---:|---|
| Visual variance | 4/10 | Modern and distinctive, but predictable |
| Motion | 3/10 | Subtle feedback rather than decorative animation |
| Information density | 8/10 office, 5/10 field | Efficient desktop review and touch-friendly field work |

### 22.2 Token architecture

The operations product uses shadcn semantic CSS variables (`background`,
`foreground`, `card`, `muted`, `primary`, `destructive`, `sidebar`, and
related tokens). Marketing pages keep the existing Strong Foam brand primitives.

The implementation uses three token layers:

```text
Primitive values → Semantic purpose → Component tokens
```

- Primitive tokens define brand colors, neutral ramps, type scales, spacing,
  radii, shadows, and motion.
- Semantic tokens define purpose, such as surface, foreground, action, success,
  warning, danger, focus, and work status.
- Component tokens define local behavior for buttons, tables, cards, fields,
  navigation, annotation tools, and AI surfaces.

Components must not introduce raw colors or arbitrary spacing when a token
exists. A machine-readable token file and generated CSS variables will become
the code-level source of truth when implementation starts.

### 22.3 Color system

Existing brand primitives are retained:

| Token | Value | Use |
|---|---|---|
| Strong Foam cyan | `#009EE2` | Primary actions, links, focus, active navigation |
| Strong Foam red | `#E8043D` | Brand accent and urgent/destructive emphasis |
| Ink | `#0B1218` | Dark navigation and dark-mode background |
| Concrete | `#151C24` | Elevated dark surfaces |
| Mist | `#E9EDEF` | Light neutral sections |
| White | `#FFFFFF` | High-contrast content and light surfaces |

The authenticated office product is a light shadcn dashboard for long
data-review sessions. The field experience may follow device theme but must
preserve outdoor contrast. Marketing remains dark.

Semantic status colors must include success, warning, danger, information, and
neutral states. Brand red must not represent routine selection. Annotation
states must use color plus icon, label, border pattern, or shape so meaning
never relies on color alone.

Every production color pair must pass WCAG 2.2 AA contrast: 4.5:1 for normal
text and 3:1 for large text, controls, focus indicators, and meaningful
graphics.

### 22.4 Typography

Reuse the existing type families:

- **Archivo:** page titles, section headings, metric values, and compact labels.
- **Source Sans 3:** body text, forms, tables, notes, and long-form reading.
- **System monospace:** identifiers, quantities, revision codes, and technical
  values only.

The base body size is 16px with a minimum 1.5 line height for prose. Dense
tables may use 14px text when zoom, contrast, and row targeting remain
accessible. Body text must never be smaller than 12px.

### 22.5 Layout and spacing

- Use a 4px base spacing grid with named semantic spacing tokens.
- Use 6px as the default application radius; larger radii are reserved for
  overlays and prominent cards.
- Desktop uses a persistent left navigation, top context bar, and flexible
  workspace.
- Tablet collapses secondary panels before reducing primary content.
- Field mobile uses no more than five bottom-navigation destinations.
- Office tables favor compact 36–40px rows; field actions use at least 44px
  touch targets with at least 8px separation.
- Primary actions remain visible without covering content or device safe areas.
- Drawers are used for quick inspection; full pages are used for multi-step or
  high-consequence work.

### 22.6 Core component language

The component system is shadcn/ui plus product-specific compositions and must
define:

- Application shell, sidebar, breadcrumbs, command palette, and mobile
  navigation.
- Data table, filters, saved views, bulk action bar, pagination, and empty
  states.
- Status badge, priority indicator, assignee, due date, and sync-state badge.
- Summary card, metric card, exception card, and progress indicator.
- Forms with visible labels, descriptions, inline validation, and unsaved-state
  protection.
- Activity timeline, comments, mentions, attachments, and approvals.
- Job card, daily log, task checklist, material request, and deficiency card.
- Plan viewer toolbar, layer panel, annotation properties, and revision banner.
- AI assistant panel, prompt composer, citations, proposed-change diff, approval
  control, execution result, and undo affordance.
- Skeleton, loading, success, warning, error, offline, pending-sync, and retry
  states.

Icons must come from one SVG icon family, initially Lucide. Emoji must not be
used as functional icons.

### 22.7 Interaction and motion

- Standard transitions use 150–250ms and communicate state or spatial change.
- Save, sync, upload, transcription, and AI actions always expose progress.
- Destructive and high-impact actions require clear consequences and recovery
  where possible.
- Keyboard navigation and visible focus are required for all office workflows.
- Hover cannot be the only way to reveal a required action.
- `prefers-reduced-motion` must remove nonessential motion.
- The field application must preserve drafts and make pending, synced, failed,
  and conflicted states unmistakable.

### 22.8 Data visualization

Dashboards prioritize actionable exception queues over decorative charts.
Charts must provide accessible legends, labels, tooltips, tabular alternatives,
and drill-through to source records. Color alone must not encode a series or
status.

### 22.9 Design-system governance

- New components require documented anatomy, variants, states, accessibility,
  responsive behavior, and content rules.
- Product pages consume shared components rather than local imitations.
- Visual regression, keyboard, contrast, and responsive checks are required
  before a component is marked stable.
- Supported review widths are 375px, 768px, 1024px, and 1440px at minimum.
- Page-specific exceptions must be documented rather than silently overriding
  global tokens.

### 22.10 Ease-of-use requirements and backlog

The operations app must let staff finish a task without hunting for the
action. The following conventions are in place and every new surface must
follow them:

- **UX-001 (shipped):** Creating a record happens behind a labelled primary
  button ("Add company", "New job", "Add contact") that opens a dialog. List
  and detail pages never render a permanently expanded create form.
- **UX-002 (shipped):** Detail pages read first and edit on demand. Records
  render a read-only summary with an **Edit** dialog pre-filled with current
  values.
- **UX-003 (shipped):** Every delete is confirmed before it runs, and
  record-level deletes sit in a separate "Remove …" card away from safe
  actions.
- **UX-004 (shipped):** Empty lists explain what belongs there and offer the
  action that fills them; filtered-out lists offer a "Clear filters" action.
- **UX-005 (shipped):** Login lands on a Home dashboard that shows attention
  counts linking to pre-filtered lists, the next open requests by due date,
  and a short "how work flows" guide.
- **UX-006 (shipped):** Field capture on a phone stays inline; only edits and
  deletes use dialogs so a technician can log a note in one tap.
- **UX-007 (shipped):** Save, delete, and upload feedback uses Sonner toasts
  written through a short-lived cookie. Redirects no longer carry `?saved=`
  or `?error=` banners.
- **UX-008 (shipped):** A command palette (`Cmd+K` / header Search) finds
  companies, contacts, requests, opportunities, projects, and jobs, and lists
  recently opened records when the box is empty.
- **UX-009 (shipped):** Request conversion uses an explicit link-or-create
  picker. Likely company and contact matches are radio choices; creating a
  new record is a separate confirmed option.
- **UX-010 (shipped):** Completing or reopening a task on job, field, and
  request pages is optimistic. Failures toast and the refreshed page restores
  the previous state.
- **UX-011 (shipped):** `ConfirmForm` uses a shadcn AlertDialog that names the
  record instead of `window.confirm`.
- **UX-012 (shipped):** Filter bars include Today, This week, Overdue, and
  Last 30 days presets that set the same `from`/`to` params.
- **UX-013 (shipped):** Closing a dirty edit dialog asks before discarding
  unsaved changes.
- **UX-014 (shipped):** Validation errors return as action state and render
  under the field. Only missing-record and authorization failures redirect
  with a toast.

Each item is complete when it is applied on every surface where the pattern
occurs, passes keyboard and 375px checks, and is browser-verified in demo
mode.

## 23. Technical and deployment architecture

### 23.1 Chosen platform

Production runs on Cloudflare, on one Worker named `strongfoam`, built with
OpenNext (`npm run deploy`).

```text
strongfoam.abracadabra-ai.workers.dev (custom domain later)
Worker strongfoam: Next.js App Router (OpenNext)
  ├── D1 strongfoam            system of record
  ├── R2 strongfoam            private uploads
  ├── Queue strongfoam-jobs    background jobs, consumed by the same Worker
  ├── Cron 15 9 * * *          import retention
  ├── Durable Object           StrongfoamAgent, one instance per organization and record
  └── Workers AI + AI Gateway  gateway id strongfoam
```

| Piece | Responsibility |
|---|---|
| Worker `strongfoam` | Public site, estimate survey, staff and field app, server actions, API routes, queue consumer, cron |
| D1 `strongfoam` | Organizations, users, CRM, jobs, estimates, documents, AI runs and proposals, rate limits |
| R2 `strongfoam` | Plans, photos, recordings, bid documents, and closeout files. Private |
| Queue `strongfoam-jobs` | Scan, extraction, commercial draft, and import work, with dead-letter queue `strongfoam-jobs-dlq` |
| `StrongfoamAgent` | Runs model calls for one record and tracks runs in progress. It does not store business records |
| AI Gateway `strongfoam` | Every model call, with logging, caching, and limits |

**Database decision:** D1 replaces the earlier Supabase plan. The schema is
Drizzle on SQLite, and migrations live in `migrations/`. Retrieval for AI-022
uses Cloudflare AI Search instead of pgvector.

**Data location decision (2026-10-06):** Canadian residency is not required.
Storage in the United States is acceptable. The live D1 database has no
jurisdiction, and the R2 bucket is in Eastern North America. Cloudflare D1,
R2, and Durable Objects offer EU, US, and FedRAMP jurisdictions, not a
Canada-only one.

### 23.2 Application boundaries

- The browser never receives D1, R2, or gateway credentials.
- Business writes go through server actions and API routes that check the
  staff or field session, then the organization of the record.
- Long work goes on `strongfoam-jobs` and returns a job identifier.
- Uploads go to R2 through short-lived, object-scoped access.
- A model draft never writes a business row. A person confirms, and the
  existing command writes.
- The public site keeps working when the model or the queue is degraded.

### 23.3 Background work

- The queue consumer and the cron run inside OpenNext's request context, so
  they reach D1, R2, and settings the same way a page does.
- Each handler is idempotent and retries with backoff. Exhausted messages go to
  `strongfoam-jobs-dlq` and show on Home.
- A commercial draft runs on the queue and calls the opportunity agent
  instance.
- **Gap:** the commercial gate needs a worker heartbeat. The heartbeat came
  from a long-running Node worker that does not exist on Cloudflare. A
  scheduled heartbeat from the queue consumer must replace it before
  commercial AI can turn on.

### 23.4 Data services

- D1 is the only system of record. JSON columns are stored as text.
- R2 objects use immutable keys for plans, recordings, evidence, proposals,
  import sources, and closeout documents.
- Every query filters by organization. D1 has no row-level security, so the
  server check is the only check and is tested for cross-organization access.
- D1 Time Travel restores the database to any minute in the last 30 days on the Workers Paid plan, or 7 days on Free.
- **Gap:** production has no malware scanner. Uploaded bid documents stay
  quarantined until a scanner the Worker can reach is configured.

### 23.5 Environment and release strategy

| Environment | Runtime |
|---|---|
| Production | Worker `strongfoam`, D1 `strongfoam`, R2 `strongfoam`, queue `strongfoam-jobs` |
| Local | `next dev` with OpenNext's dev bindings, or `OPS_DEMO=1` with no database |

A staging Worker with its own D1, R2, and queue is required before financial
workflows launch. Environments never share a database, bucket, queue, or secret.

Required release checks:

- Install, lint, type check, tests, and an OpenNext build.
- `wrangler deploy --dry-run` lists every binding, including `STRONGFOAM_AGENT`.
- New D1 migrations apply locally before `--remote`.
- Authorization and cross-organization tests pass.

Migrations are additive first. Apply the migration, deploy the Worker, then
remove obsolete columns only in a later release.

Secrets are set with `npx wrangler secret put` and never committed:
`OPS_SESSION_SECRET`, `OPS_STAFF_EMAILS`, `OPS_STAFF_PASSWORD`, and, when used,
`AI_GATEWAY_API_KEY`.

### 23.6 Migration from earlier infrastructure

The Vercel, Neon, Render, and Supabase plan is retired. The steps still open:

1. Import Strong Foam's master and operational records through the Import
   Center, with source-key crosswalks and reconciled counts.
2. Move any remaining private files to R2.
3. Point `strongfoam.com` at the Worker.
4. Remove unused Vercel and Neon credentials after cutover.

### 23.7 Observability and recovery

Workers observability and traces are on. Logs carry the organization id,
actor, deployment version, and job id, and no document text or prompts.

Watch:

- Worker errors and latency.
- Queue backlog, retries, and dead letters.
- D1 query time and size.
- Failed uploads, scans, extractions, and AI runs.
- AI Gateway errors, cost, and log retention.

Recovery: D1 Time Travel for the last 30 days, and a periodic D1 export to R2
for longer retention. Recovery targets stay RPO 15 minutes or less and RTO four
hours or less, and a restore is tested quarterly.

### 23.8 API rules

- Validate all inputs server-side.
- Authorize every internal read and mutation.
- Use idempotency keys for retryable submissions.
- Use signed, scoped, expiring access for private files.
- Do not expose storage or database credentials to clients.
- Use stable domain events for asynchronous work and integrations.
- Version externally consumed API contracts.

### 23.9 Commercial rollout controls

Estimate versions, bid-document extraction, signed proposals, accepted-estimate
conversion, and commercial AI each have an organization-scoped flag. Manual
estimates can stay on while commercial AI is off. Commercial AI cannot turn on
until manual estimate, approval, proposal, and conversion checks have passed,
the queue worker heartbeat is healthy, the scanner and the extraction model and
gateway model are configured, the evaluation suite has
rejected geometry, price, prompt injection, bad citations, and cross-organization
output, and cost and rate limits are set.

Failed or dead-letter scan, extraction, proposal, and conversion jobs appear on
Home with a link to that organization's opportunity or project. Field sessions
do not receive those links. Setting a flag to off stops new use of that
capability. It does not delete versions, approvals, or documents. Proposal token
revocation remains the way to stop an already issued review link.

The operating steps, environment names, and rollback flags are in the repository
README. These controls do not by themselves mark BID, QTE, or AI requirements
shipped.

## 24. AI operations agent

### 24.1 Purpose

The product will include an AI operations agent that reduces repetitive
administration while keeping humans accountable for customer, safety,
commercial, and financial decisions.

The agent is an interface to typed application capabilities, not a privileged
database administrator. Disabling AI must not disable any core workflow.

### 24.2 Initial capabilities

**AI-001:** The agent must answer questions about authorized customers,
requests, estimates, projects, jobs, tasks, notes, and documents with citations
to the source records and versions.

**AI-002:** The agent must summarize:

- Estimate-request history.
- Meeting and call notes.
- Daily field logs.
- Voice-note transcripts.
- Job progress, blockers, deficiencies, and outstanding decisions.
- Activity since a user's last review.

**AI-003:** Office users can preview and apply one reversible task command:
mark done, reopen, or move the due date one working day. The Complete and
Reopen buttons record the same command. Apply uses the existing task commands
and records the previous status, completion time, due date, and task version.
Undo restores that snapshot, including the version, so an earlier command can
be undone when nothing else edited the task. A field user can undo only their
own change. A schedule accept or spoken pin confirm refuses when the sentence
on screen no longer matches the current records. Description, priority,
checklist, and source-record link stay out until a task stores those fields.

**AI-004:** The agent should convert notes or transcripts into proposed tasks,
material requests, blockers, deficiencies, follow-ups, and daily reports.
A completed transcript proposes one blocker, deficiency, material request, or
new task from the sentence that states it. Confirm saves that sentence through
the existing voice extract. A blocker also marks the job blocked. Saving one
sentence leaves a different sentence available. Dismissing a sentence writes
nothing, and that later sentence can be confirmed without saving the first.
The home exception queue keeps the note until no sentence remains.
A manual extract, or an older
extract that did not record its text, still closes the transcript. A product
name alone is not a material request. A task is proposed only when the
sentence asks for work that is not already an open task. A daily report from
the same transcript stays the daily-report draft.

**AI-005:** The agent should draft customer communications, internal handoffs,
estimate scopes, closeout summaries, and status updates. External communication
requires human review and send approval.

**AI-006:** Scheduled automations may identify missing owners, stale
opportunities, overdue actions, unsummarized field notes, unresolved blockers,
missing daily logs, and jobs at risk. Results appear in an exception queue
rather than silently changing high-impact records.

**AI-007:** The agent must report completed changes, failures, and skipped
actions in plain language and link to the audit entry.

### 24.3 Action and approval policy

Agent authority is the intersection of:

```text
User permission ∩ organization policy ∩ record scope ∩ tool policy
```

| Action class | Examples | Initial policy |
|---|---|---|
| Read-only | Search, summarize, compare, explain history | Automatic within caller scope |
| Draft | Draft task, report, note, or communication | Automatic; no persistent side effect |
| Direct reversible command | “Move my task to Friday,” “mark this task done” | Execute when the requesting user has permission; confirm and offer undo |
| Proactive or multi-record mutation | Reassign tasks, bulk due-date changes, workflow transitions | Show exact diff and require approval |
| High impact | Customer send, estimate approval, project status, change order | Explicit step-up approval; second approver when policy requires |
| Restricted | Payments, permissions, deletion, pricing approval, safety/compliance sign-off | Never autonomous |

A direct user command serves as approval only for a reversible action whose
complete effect is stated in the command. Ambiguous, inferred, proactive, bulk,
cross-user, or high-impact changes require a preview.

Approvals bind to the exact command payload, actor, entity version, and
expiration. Execution must recheck authorization and optimistic-lock versions.
Changed or expired proposals require new approval.

### 24.4 Agent tool design

The agent receives narrow, schema-validated tools such as:

```text
searchAuthorizedRecords
summarizeRecordSet
getTask
createTask
updateTask
addInternalNote
draftDailyReport
draftCustomerMessage
proposeWorkflowChange
submitApprovedCommand
```

The agent must never receive raw SQL, unrestricted storage access, arbitrary
HTTP, generic email sending, or service credentials. Every tool independently
authorizes and validates its operation; model output is never trusted as an
authorization decision.

Retrieved content, uploaded plans, emails, and notes are untrusted data and
cannot modify system policy or tool permissions.

### 24.5 Retrieval

Structured facts such as status, assignment, dates, quantities, approvals, and
costs must come from authorized SQL/domain queries, not semantic search.

Unstructured content eligible for retrieval includes:

- Notes and comments.
- Transcripts and daily reports.
- Extracted document text.
- Scope descriptions and activity narrative.
- Approved internal knowledge and procedures.

Use hybrid retrieval on Cloudflare AI Search:

```text
Authorization prefilter
  → AI Search over approved text
  → cited context
  → StrongfoamAgent response through AI Gateway
```

Each indexed chunk must store organization, source entity and immutable version,
visibility scope, content hash, index version, timestamps, and deletion state.
Re-indexing must occur side by side so model changes do not interrupt search.
Audio binaries are never indexed; approved transcript text may be indexed.

No retrieval result, count, title, or citation may cross an organization or
record access boundary.

### 24.6 Durable execution

Interactive read-only responses may stream from the Render API. Transcription,
document extraction, embedding, bulk summarization, scheduled review, and
multi-step automation run as durable worker jobs.

The domain transaction writes the business change and transactional outbox
event together. The worker claims an idempotent job, checkpoints long work,
retries within a budget, records provider usage, and sends exhausted jobs to a
dead-letter queue with an operational alert.

### 24.7 AI records and audit

Maintain append-only records for AI runs, steps, retrieval citations,
proposals, approvals, tool executions, and outcomes.

Capture:

- Actor, organization, record scope, and correlation ID.
- Model/provider, prompt-template version, and tool-schema version.
- Redacted inputs and outputs needed for review.
- Source citations and immutable source versions.
- Proposed and actual before/after state.
- Approval evidence.
- Token, latency, and cost totals.
- Failure, retry, cancellation, and final outcome.

Do not store hidden chain-of-thought. Audit tables must not be writable or
deletable by ordinary application roles.

### 24.8 AI quality and safety requirements

- Feature flags, role enablement, and organization usage limits are required.
- Maintain a representative evaluation set for summaries, retrieval, task
  extraction, and authorization boundaries.
- Factual responses cite source records; uncertainty is stated.
- Cross-organization adversarial tests must return no content or metadata.
- Replayed tool requests produce one business effect.
- A worker restart resumes or safely retries incomplete work.
- Model/provider failure leaves manual CRM and field workflows available.
- Costs, latency, correction rates, approval rates, undo rates, and automation
  failures are measurable.

### 24.9 AI rollout

1. Release A on current records: AI-008, AI-009, AI-010, AI-011, AI-012,
   AI-013, AI-014, AI-015, and AI-020 are shipped. Release A on current
   records is complete.
2. Release B after the commercial records and durable document pipeline exist:
   AI-016 through AI-019 and AI-021. The agent drafts cited scope and may
   repeat an explicitly written quantity. A person selects the price-book
   revision and quantity, and an authorized approver decides.
3. Release C after the named platform dependency exists: AI-022 through
   AI-026.
4. Direct reversible task updates (AI-003) and exact-diff approvals stay in
   force for every mutation. Policy-driven automation waits until measured
   accuracy and adoption justify it.

### 24.10 Tracked capability catalog

Every AI capability below is trackable on its own. Disabling the model must
leave the underlying Office and Field workflow usable. A draft has no
persistent effect until the requesting user confirms it. Factual output cites
source records. Offline captures become visible to the agent only after they
sync.

These boundaries apply to every ID:

- AI-016 and AI-018 cite a quantity only when it is written in the document.
  They do not measure the drawing. AI-027 measures one page after a person
  confirms the scale and the region. The server calculates the quantity. The
  model does not supply it, and it does not set the price.
- The agent does not generate price, markup, tax, or an approval decision.
- Safety and compliance sign-off stays with a person. AI-024 may propose a
  deficiency and may not close one.
- Customer and subcontractor sending stays a human action.

| ID | Capability | Release | Status | Starts when |
|---|---|---|---|---|
| AI-008 | Cited job summary | A | Shipped | Office session and a model configuration |
| AI-009 | Daily report draft | A | Shipped | AI-008 evidence pack |
| AI-010 | Morning field brief | A | Shipped | After AI-008 cites the right records |
| AI-011 | Speak onto the plan | A | Shipped | After AI-009 confirmation works |
| AI-012 | Schedule diff from field truth | A | Shipped | After AI-011; uses the existing reschedule confirm |
| AI-013 | Exception queue on current records | A | Shipped | With AI-008 |
| AI-014 | Quantity pace warning | A | Shipped | Open tasks store a stated quantity in bags or sq ft |
| AI-015 | Material pick list | A | Shipped | After AI-014 |
| AI-016 | Cited bid/request scope outline | B | Partly built | `ai_runs` and `ai_proposals` store the draft with an idempotency key. Audit the opportunity screen before marking shipped |
| AI-017 | Estimate revision explanation | B | Blocked | QTE-001 and QTE-004 |
| AI-018 | Bid-package/walkthrough scope lines | B | Partly built | Same draft record as AI-016. Audit apply into an estimate version before marking shipped |
| AI-019 | Change-order draft | B | Blocked | Change-order records exist. Voice, photo, and plan-pin drafts are not built; a person sets the price |
| AI-020 | Deficiencies grouped by plan sheet | A | Shipped | After AI-011 |
| AI-021 | Closeout and rebate packet | B | Shipped | Assembly fields exist. The draft is saved on the closeout and is not sent |
| AI-022 | Hybrid retrieval of notes and transcripts | C | Later | Approved notes and transcripts indexed in Cloudflare AI Search |
| AI-023 | Dispatch recommendation | C | Shipped | Crew capacity is 1–3 jobs per day. Accepting assigns the open task |
| AI-024 | Photo deficiency proposal | C | Later | Evaluation set required by section 24.8 |
| AI-025 | Warranty and inbound email triage | C | Later | Customer portal or inbound mailbox |
| AI-026 | Cost variance explanation | C | Blocked | Accounting system chosen in open decision 6 |
| AI-027 | Plan takeoff | B | Specified | A document page and a scale a person can confirm. The server calculates the quantity |

**AI-008:** An authorized office user can request a progress summary for one
job. The summary covers tasks, field notes, blockers, deficiencies, quantities,
voice transcripts, and recent job events, and each claim links to the source
record. The summary writes nothing.

**AI-009:** From the same job evidence, the agent drafts the daily report for
the working day: work completed, holds, material shortfalls, and what is
needed next. Confirming the draft saves one `daily_report` field note through
the existing field-note command. Dismissing the draft saves nothing.

**AI-010:** Each assigned field user can open a short brief for today: site,
assigned tasks, current plan revision, open blockers, and material already
requested. The brief is read-only and cites those records.

**AI-011:** A completed transcript on the current plan sheet can propose one
pin at the center of page 1. The office user sees the exact effect first.
Confirming places that pin through the existing plan-mark command and attaches
the existing voice note. Preview writes nothing. This command does not change
the linked task's status or dates.

**AI-012:** A blocker or quantity note linked to a task that already has
planned dates can propose a one-working-day slip. Finish-to-start successors
move only when the slip would start them too early. Accepting calls the
existing reschedule once per moved task and records that the note was
accepted, so the same note does not propose another slip. Rejecting writes
nothing. The proposal does not calculate variance against a baseline.

**AI-013:** Home shows a review list, in addition to the existing attention
counts, for missing daily logs on active field jobs, failed voice
transcriptions, blocked jobs, overdue tasks, and completed voice notes whose
text has not been extracted. Each row links to the underlying record.

**AI-014:** The agent warns when installed quantity is ahead of the remaining
area or bag count described on the job. The warning uses field quantities
only. It does not state dollars, margin, or a price.

**AI-015:** Open material requests can be grouped into a draft pick list by
job and supplier wording in the request. Confirming the list does not create
a purchase order. Purchase orders remain section 16 work.

**AI-016:** After durable bid documents, approved price revisions, and manual
estimate versions exist, the agent may propose cited service mix, site
assembly, job packages, and scope wording from an estimate request and its
selected clean bid-package versions. The estimator selects suggestions and
applies them through the normal estimate-version command. Upload and proposal
write no estimate or job. Public survey qualification stays deterministic.

**AI-017:** When estimate versions exist, the agent explains what scope,
quantity, and price changed between two versions and which approval threshold
the change crosses. The approver still decides.

**AI-018:** A selected bid-package text span or an estimator/technician
walkthrough may become cited draft price-book lines for location, R-value,
area, depth, product, and bag count. A quantity from a document must be
explicitly written and unambiguous. A person chooses the price-book revision
and confirms or enters the quantity. Missing or conflicting quantity displays
Takeoff required. This is not geometric takeoff.

**AI-019:** A voice note, photo, and plan pin may become a draft change order
containing location, assembly, quantity, and schedule impact, plus
customer-ready wording. A person enters price and approval. The agent does
not send the change order.

**AI-020:** Open deficiency field notes and deficiency plan marks are grouped
by plan sheet for closeout review. The group is a view and a draft. It does
not replace a future punch-list workflow.

**AI-021:** The agent drafts the closeout and rebate narrative from the
insulation assembly, job photos, stated quantities, and plan marks. Saving
stores that draft on the closeout. Publishing the packet to a customer waits
on portal policy, so save does not send it.

**AI-022:** Approved note and transcript text may be indexed in Cloudflare
AI Search and retrieved by the job agent. Audio binaries are not indexed.
Interactive summaries in Release A do not require retrieval.

**AI-023:** A person can schedule a field member on a job for one day. Crew
capacity is 1, 2, or 3 jobs that day, and the default is 1. The agent
recommends a field member who still has capacity for an open task with no
person, and shows that assignment. Accepting writes only that assignee
through the existing task command. Overlap warnings on the dispatch board
remain the source for same-day conflicts.

**AI-024:** After an evaluation set exists, a photo may produce a proposed
deficiency attached to a plan region. A person files or discards it. The
agent cannot mark safety or compliance work complete.

**AI-025:** After a portal or inbound mailbox exists, a warranty message may
become a proposed warranty job linked to the closed project. Until then, field
deficiencies cover problems found by the crew.

**AI-026:** After an accounting system of record is chosen, the agent explains
cost and schedule variance in plain language and links to the source budget
and field quantities. It does not post invoices, bills, or payments.

**AI-027:** On one immutable plan page, the agent may propose a title-block
scale and one region in PDF page space. A person confirms the scale and may
edit the points. The server then calculates square feet, linear feet, or a
count. Confirming stores that quantity on the estimate. The person sets the
price. No confirmed scale displays **Takeoff required**. Bag count waits on a
person-entered thickness or yield. This is not BIM, and it does not trace
every symbol on the sheet.

Design and the Release A implementation plan live in
`docs/superpowers/specs/2026-09-21-ai-operations-design.md` and
`docs/superpowers/plans/2026-09-21-ai-operations.md`.

The agent runtime for the whole application lives in
`docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md` and
`docs/superpowers/plans/2026-10-06-cloudflare-agents.md`.

The bid-package, estimating, and accepted-job design and implementation plan
live in
`docs/superpowers/specs/2026-09-22-ai-bid-package-estimating-design.md` and
`docs/superpowers/plans/2026-09-22-ai-bid-package-estimating.md`.

## 25. Security, privacy, and compliance

- Enforce organization and record-level authorization server-side.
- Apply least-privilege roles.
- Require stronger authentication for administrative and financial access.
- Encrypt data in transit and at rest through platform-supported controls.
- Log authentication, permission, document, financial, approval, and export
  events.
- Use expiring file access and prevent public directory listing.
- Scan or quarantine untrusted uploads before broad internal distribution.
- Define retention for recordings, transcripts, plans, personnel data, and
  customer data.
- Obtain and record appropriate consent for audio recording and transcription.
- Provide account deactivation and access-revocation procedures.
- Back up business data and test restoration procedures.
- Review Canadian privacy obligations, including PIPEDA, with qualified counsel
  before production use of field recordings.

## 26. Reliability and performance

- Core list and detail pages should remain responsive with at least 100,000
  requests/jobs through pagination, indexing, and bounded queries.
- Mobile field screens must prioritize useful content under poor network
  conditions.
- Uploads must expose progress, retry, and final synchronization state.
- Background jobs must be idempotent, retryable, and observable.
- Import preview and commit must remain responsive through asynchronous parsing,
  bounded batches, pagination, and downloadable reports.
- An import transaction failure must expose a correlation ID and leave no
  partial customer, workforce, price, project, or job graph.
- Failed transcription or notification must not block field work.
- Plan rendering should load pages on demand rather than downloading every
  sheet at full resolution.
- Operational errors must have correlation IDs and centralized logs.

Final service-level objectives will be established before production rollout.

## 27. Product success measures

Initial metrics:

- Median time from request submission to first staff review.
- Percentage of requests with owner and next action.
- Request-to-estimate and estimate-to-win conversion.
- Number and age of overdue follow-ups.
- Percentage of active jobs with current plans and daily documentation.
- Field note and annotation synchronization success rate.
- Transcription completion and correction rate.
- Time from reported blocker to resolution.
- Percentage of completed jobs with required closeout evidence.
- Time saved on note summarization and task administration.
- Median time for a project manager to identify the next incomplete project
  task.
- Percentage of active project jobs and tasks with usable schedule dates.
- AI suggestion acceptance, correction, undo, and failure rates.
- Percentage of imported rows committed without manual correction.
- Import conflicts, errors, retries, orphan references, and reconciliation
  variance by batch.
- Percentage of imported price-book drafts reviewed and workforce accounts
  activated after reconciliation.

Later metrics:

- Estimate accuracy versus actual cost.
- Gross margin and variance by trade and job.
- Verified crew productivity and earned hours against an approved,
  effective-dated production target.
- Eligible worker efficiency trends, comparable sample size, attribution
  exceptions, and quality context. No automated employment decision.
- Change-order approval cycle.
- Schedule adherence.
- Customer repeat and warranty rates.

Metrics must not be used for automated employment decisions without an explicit
policy and human review.

## 28. Delivery sequence

### Foundation

1. Add version-controlled D1 migrations (done).
2. Run production on Worker `strongfoam` with its own D1 database and R2
   bucket (done). A separate staging Worker is still required before financial
   workflows.
3. Establish organization, user, membership, role, and audit-event models
   (done for the current staff and field roles). D1 has no row-level security,
   so every query checks the organization in server code.
4. Keep staff and field sessions on signed cookies. Individual database users
   exist beside the bootstrap staff login.
5. Run background work on queue `strongfoam-jobs`, with a dead-letter queue
   (done). Replace the missing long-running worker heartbeat before commercial
   AI turns on.
6. Keep the public site, office app, and field app in the one Worker, with
   separate routes and sessions (done).
7. Preserve and test the existing lead intake contract (done for the current
   survey).

### Data onboarding and import

1. Keep application and queue traffic on the D1 binding. Apply migrations with
   Wrangler, not through request traffic.
2. Store import files in the private R2 bucket `strongfoam` and keep staged
   rows out of any public response.
3. Add item codes, item kinds, supplier, internal cost, and selling-price
   snapshots to immutable price-book revisions before importing products or
   labour rates.
4. Add XLSX/CSV scan, bounded parse, column mapping, deterministic
   normalization, row validation, and saved mapping profiles.
5. Add exact source-key crosswalks, human conflict resolution, hash-bound
   preview, administrator commit, and one-transaction rollback.
6. Import and reconcile companies, contacts, sites, inactive workforce
   identities, and price-book drafts.
7. Import and reconcile opportunities, projects, jobs, assignments, work
   areas, and tasks in dependency order.
8. Approve price drafts and activate workforce accounts through their separate
   authorized workflows.
9. Add retention, reconciliation downloads, exception monitoring, and the
   staging-to-production cutover runbook.

### Estimate operations

1. Build the request list and filtering.
2. Build request detail, assignment, status, comments, and tasks.
3. Add company, contact, site, and opportunity conversion.
4. Add the centralized activity timeline.
5. Add private opportunity bid packages with immutable versions and durable,
   cited page extraction before a job exists.
6. Add manual deterministic estimate versions before commercial AI.

### Field jobs

1. Add projects, jobs, work areas, tasks, assignments, and scheduling basics.
2. Add authenticated job documents and media.
3. Build the mobile field workspace and offline-safe drafts.
4. Add daily notes, photos, quantities, blockers, and completion workflow.

### Project schedule

1. Add the read-only project Schedule roll-up using job date bars and task due
   date milestones.
2. Add task planned start, planned completion, and actual completion timestamps.
3. Upgrade scheduled tasks from milestones to duration bars and surface
   out-of-job-range warnings.
4. Add finish-to-start task dependencies with non-negative lag and cycle
   rejection.
5. Calculate and label the critical path.
6. Add confirmed drag and keyboard rescheduling with stale-write protection,
   dependency validation, and attributable before/after events.
7. Add immutable schedule baselines and current-versus-baseline variance.
8. Add assignment/resource overlays from project manager, foreman, and task
   assignee data with overlap warnings.
9. Add a configurable working-day calendar and apply it consistently to
   geometry, critical path, lag, and rescheduling.

### User administration

1. Replace the shared Office credential with individual database-backed
   administrator and Office identities while retaining a non-overriding
   bootstrap fallback.
2. Enforce administrator authorization on the user page and every lifecycle
   command.
3. Add profile and role editing, activation, deactivation, password reset, and
   explicit session revocation.
4. Add session-version checks to Office and Field cookies so credential and
   access changes invalidate existing sessions.
5. Record and display append-only user lifecycle events.
6. Keep these contracts on the signed staff and field sessions. There is no
   separate auth provider to migrate to.

### Usability pass

1. Full create, edit, and delete coverage plus status, type, and date filters
   on every surface (done).
2. Create behind buttons, read-first detail pages, confirmed deletes, empty
   states, and the Home dashboard (UX-001 to UX-006, done).
3. Toasts, command palette, company linking, optimistic tasks, alert dialogs,
   date presets, dirty-form protection, and inline validation (UX-007 to
   UX-014, done).

### Plans and voice

1. Add document versioning and plan rendering (done).
2. Add circle, polygon, pin, text, and status annotations (done).
3. Add marked-up exports (done).
4. Add audio recording, durable processing, Deepgram transcription, and
   transcript review (done).

### AI operations

1. Release A on current records: cited job summary (AI-008), daily-report
   draft (AI-009), and the exception queue (AI-013) (done).
2. Continue Release A: morning brief (AI-010, done), material pick list
   (AI-015, done), deficiencies by sheet (AI-020, done), speak onto the plan
   (AI-011, done), schedule diff (AI-012, done), and quantity pace (AI-014,
   done). An open task stores a stated quantity in bags or square feet. The
   warning compares installed field quantities with that remainder and does
   not state dollars.
3. Add reversible direct task updates with confirmation and undo (done for
   status and a one-working-day due date, including one-click complete and
   chained undo while the task is otherwise unchanged). Description, priority,
   and checklist wait until a task stores those fields.
4. Add exact-diff approvals for proactive and multi-record actions (done for
   a schedule slip: accept writes only the moves shown, and a later failure
   restores the earlier moves). Bulk reassignment stays out until that command
   exists.
5. Propose one field record from a completed transcript (done for a blocker,
   deficiency, material request, or new task). A later sentence can still be
   saved, including after the earlier sentence is dismissed without a write.
   A daily report from that transcript stays the daily-report draft.
6. Add hybrid retrieval (AI-022) when approved notes and transcripts are
   indexed in Cloudflare AI Search.

### Commercial and operational expansion

1. Finish organization authorization, audit, queue retry, and dead-letter
   visibility required by commercial files. The queue already exists. The
   worker heartbeat and malware scanner do not.
2. Add quarantined opportunity bid documents, immutable versions/links, text
   extraction, OCR, page/sheet citations, and human correction.
3. Harden price-book items with immutable approved revisions, then add manual
   deterministic estimate versions, lines, clauses, alternates, and job
   packages. Price-book items without revisions are the only stored commercial
   foundation today.
4. Add exact-version approvals, branded proposals, delivery/view/decision
   events, and customer acceptance evidence.
5. Add atomic idempotent accepted-estimate conversion to one project, every
   approved job package, its work areas/tasks, a project budget, document
   links, audit, and outbox events.
6. Then allow cited commercial AI drafts: scope outline (AI-016), revision
   explanation (AI-017), bid-package/walkthrough scope lines (AI-018), and
   change-order drafts (AI-019). A person selects price and quantity.
7. Add change orders under QTE-007 after initial estimate conversion is stable
   (done: a project change order stores scope, price, schedule-impact days, and
   status. An administrator approves or rejects it, using the existing
   second-approver threshold. Approval evidence is the actor, comment, and
   content hash. An approved order adds one budget effect to the revised
   project total and records the schedule-impact days. Task dates stay put.
   Draft and pending orders appear on Home. AI-019 drafts are not built).
8. Add dispatch, time, materials, equipment, inspections, and closeout, then
   the closeout packet (AI-021) and dispatch recommendation (AI-023). Day
   dispatch is done: an office user schedules or cancels one field member on
   one job for one date, a cancelled row stays as evidence, a second job the
   same day is shown as a double booking, Home lists active jobs with no
   dispatch, and the field landing shows that person's rows. Labor is hours or
   piece work in bags or square feet, with no wage stored. Purchase orders are
   done: an office user drafts a supplier order from material requests, marks
   it ordered, or cancels it. Cancelling keeps the row and releases the
   requests. No price is stored. Equipment is done: an office user assigns a
   named piece of equipment to an open job or releases it. Releasing keeps the
   row. The same name on two open jobs shows on Home. No rate is stored.
   Inspections are done: an office user records a named result of open, passed,
   or failed on an open job. Recording the same name updates that row. Home
   lists open and failed results on jobs that are still open. No price is
   stored. Closeout is done: an office user records preparing, ready, or
   signed on an open job. Signed waits until every inspection on that job has
   passed. Home lists preparing and ready closeouts. The insulation assembly
   and the saved packet draft do not send anything to the customer. Crew
   capacity is 1–3 jobs per day. AI-023 recommends a field member with
   remaining capacity, and accepting assigns that open task.
9. Add authoritative production attribution and approved production targets,
   then My Performance, the office Workforce Performance view, and workforce
   exception widgets under WFP-001 through WFP-018. The first slice is
   enabled in production with `OPS_WORKFORCE_PERFORMANCE=1`: production can be
   recorded and verified, efficiency is calculated, the field view is private,
   and the office review is unranked. Field labor alone must not produce rankings.
   Quality context uses deficiency and rework records from section 16.9. A
   missing record stays “not available,” and a fully corrected set is “clear.”
   Open or reopened records are named beside the efficiency number and do not
   change it. Inspections are recorded in section 16.7 and stay out of the
   score.
   Financial cost extensions wait for the accounting system of record.
10. Add job costing and accounting integrations, then cost variance
   explanation (AI-026).
11. Add customer and subcontractor portals if validated, then warranty triage
   (AI-025).

Each stage must include authorization tests, audit coverage, data migration,
operational monitoring, and user acceptance criteria.

## 29. Dependencies and risks

| Risk or dependency | Mitigation |
|---|---|
| Internal access is added before robust authorization | Build organization and permission checks before internal UI |
| Public uploads are reused for private operational files | Create authenticated, organization- and record-scoped document versions and links |
| Plan revisions invalidate field marks | Make document versions immutable and version-bound |
| Poor jobsite connectivity causes missing records | Local drafts, retry queues, and visible sync state |
| Transcription is slow, costly, or inaccurate | Async processing, provider adapter, user correction, usage metrics |
| Product expands into an unbounded ERP rewrite | Deliver bounded workflows and integrate accounting first |
| Staff adoption suffers from excessive form entry | Defaults, templates, voice capture, and progressive disclosure |
| Financial or status edits lack traceability | Append-only audit and version records |
| Marketing performance declines as app grows | Maintain route, data, and bundle boundaries |
| Trade-specific fields fragment the platform | Shared core entities plus configurable trade templates |
| AI exposes another organization's records | Authorization prefilter, organization checks on every query, and adversarial tests |
| Prompt injection triggers an unsafe action | Narrow typed tools, server authorization, and untrusted-content boundaries |
| AI creates duplicate or stale changes | Idempotency, optimistic locking, payload-bound approval, and undo |
| Cross-platform releases create version skew | Versioned contracts and expand/contract deployment |
| A later import disrupts lead intake | Rehearse on a separate database, preserve ids, verify counts, and keep a rollback export |
| Spreadsheet import duplicates or mislinks records | Stable source keys, durable crosswalks, exact protected matches, human conflict resolution, and zero-orphan reconciliation |
| Import fails after creating part of a project graph | Bounded batches, organization advisory lock, one transaction, injected-failure tests, and idempotent replay |
| Spreadsheet PII or pricing is exposed | Private Storage, non-exposed staging schema, scoped authorization, audit redaction, and retention deletion |
| Workforce spreadsheet creates insecure accounts | Reject password columns, create inactive identities, and require separate administrator activation |
| Internal labour costs are mistaken for payroll wages | Generic estimating-rate items only; individual compensation requires a separate restricted model |
| Raw or self-reported production creates a misleading worker ranking | Verify one authoritative production quantity, separate crew from individual attribution, normalize only comparable work, require a minimum sample, show quality context, and prohibit automated employment decisions |
| A queue job stops during processing | Idempotent handlers, retries, and the dead-letter queue |
| Stored data leaves the United States | D1, R2, and the agent stay without a foreign jurisdiction. US storage is the accepted decision |

## 30. Open decisions

These decisions are required before their respective implementation stage:

1. Timing and policy for opening multi-organization onboarding after the
   single-company launch.
2. Final staff roles, MFA rules, and permission matrix.
3. Annotation library and marked-up PDF export approach.
4. Speech-to-text languages beyond English, consent copy, and audio retention.
   The provider is Deepgram Nova-3 prerecorded listen.
5. Embedding model and AI cost limits. Model calls go through Cloudflare AI
   Gateway `strongfoam` and the `StrongfoamAgent` class. The model id is
   configuration, and the agent stays off when that configuration is missing.
   Retrieval waits for AI-022 on Cloudflare AI Search.
6. Accounting system of record and synchronization boundaries.
7. Required field devices and minimum supported browsers.
8. Offline requirements beyond drafts and queued uploads.
9. Organization defaults for markup, overhead, tax jurisdiction, approval
   thresholds above the required administrator approval, proposal expiry, and
   legal acceptance copy.
10. Data residency is decided: United States storage is acceptable, and a
    Canada-only store is not required. Retention, backup, and disaster-recovery
    policy are still open. D1 Time Travel covers the recent window.
11. Which workbook/source system is authoritative after the initial cutover,
    who owns source-freeze sign-off, and whether recurring synchronization is
    needed.
12. Which non-administrator roles may view imported internal unit cost. Until
    approved, cost visibility remains administrator-only.
13. Workforce-performance policy: crew versus individual attribution,
    authorized verifiers, target owners and work classes, minimum comparable
    sample, quality and safety context, correction rights, export rights, and
    which roles may view office rankings. Rankings stay off until approved.

## 31. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-18 | Deliver estimate review before broader CRM / ERP modules | It exposes current lead data and establishes staff workflow early |
| 2026-09-18 | Support jobs created from won work or manual entry | Not every operational job will originate from the public survey |
| 2026-09-18 | Store annotations separately from immutable document versions | Preserves plan history and auditable field evidence |
| 2026-09-18 | Process transcription asynchronously | Network or provider latency must not block field work |
| 2026-09-18 | Integrate accounting before attempting a general ledger | Construction operations are the product's initial differentiator |
| 2026-09-18 | Use Industrial Precision as the product design language | It preserves the brand while prioritizing accessible, efficient office and field work |
| 2026-09-18 | Deploy the frontend to Vercel and the authoritative API/workers to Render | It separates fast web delivery from durable application and background workloads |
| 2026-09-18 | Migrate PostgreSQL, Auth, private files, and vectors to Supabase | Consolidation reduces administration and supports RLS, Storage, Realtime, and pgvector |
| 2026-09-18 | Use pg-boss and a transactional outbox for durable work | It avoids another required datastore while providing idempotent PostgreSQL-backed jobs |
| 2026-09-18 | Permit direct reversible AI task updates within user authority | It reduces administration while preserving confirmation, undo, and auditability |
| 2026-09-18 | Require approval for proactive, bulk, external, and high-impact AI actions | It keeps humans responsible for consequential business decisions |
| 2026-09-18 | Ship a session-gated staff review workspace before the full auth provider | It makes current leads reviewable immediately without waiting on Supabase Auth |
| 2026-09-18 | Convert requests into separate company, contact, site, and opportunity records | Survey fields become reusable CRM entities without re-entry, while duplicate matches stay visible and linkable |
| 2026-09-18 | Convert only won work into one project per opportunity, then add extra jobs on the project | Prevents premature field work, keeps the commercial record attached, and lets a site grow extra phases without duplicating the opportunity |
| 2026-09-18 | Use shadcn/ui for the authenticated operations product | Replaces the custom Industrial Precision staff chrome with a standard dashboard system while keeping the marketing site branded |
| 2026-09-19 | Add job work areas, job tasks, and session-gated job documents before annotation or speech-to-text | Delivers JOB-002/JOB-003 plans and checklists so field evidence has a place to live; demo stores file bytes in memory and production uses Vercel Blob when a token is present |
| 2026-09-19 | Upload production job files directly to private Blob storage with job-scoped tokens | Supports the 25 MB policy without routing file bodies through Vercel functions; token issuance still requires a staff session and the completion callback records immutable metadata |
| 2026-09-19 | Ship a mobile-first field landing and job view before blueprint annotation | Delivers FLD-001/002 and the first FLD-003 actions so technicians can work from today's assignment without waiting on markup or offline sync |
| 2026-09-19 | Put every create form behind a button and every edit behind a dialog; keep field capture inline | Staff reported not finding "add company" and "add job"; progressive disclosure makes pages readable while a technician on a phone still logs a note in one tap |
| 2026-09-19 | Track usability work as numbered UX requirements in section 22.10 | Keeps ease-of-use improvements visible and prioritized alongside feature work rather than lost in PR descriptions |
| 2026-09-19 | Ship UX-007 to UX-014 in one pass: toasts, command palette, company linking, optimistic tasks, AlertDialog, date presets, dirty-form protection, and inline validation | The next-pass backlog was already specified; implementing it together keeps every surface on the same interaction model |
| 2026-09-19 | Deliver the project schedule in validated phases: roll-up, task durations, dependency planning, controlled rescheduling, baselines, assignment overlays, and working-day calendars | Existing dates provide immediate visibility while later phases add planning power without inventing duration, capacity, or silent timeline edits |
| 2026-09-19 | Make Field a separate application surface and login whose users are provisioned in the main application | Field workers need a focused mobile product, while office administrators remain accountable for identity lifecycle and access |
| 2026-09-19 | Use stable user IDs for job/task assignment, Field authorization, and Schedule resource lanes | Free-text names cannot reliably route work, revoke access, distinguish duplicate names, or prove which worker received a schedule |
| 2026-09-19 | Exchange online Office and Field changes through authoritative commands plus a durable job-event stream | Both applications need low-latency updates without dual-write databases or direct application-to-application coupling |
| 2026-09-19 | Use bounded server-sent event polling as the first realtime transport, preserving the event contract for the Render/outbox/Supabase migration | It delivers cross-session updates on the current stack while keeping the production topology and durable catch-up path explicit |
| 2026-09-19 | Use the shared users and memberships model for individual Office and Field authentication, with administrator-only lifecycle controls and revocable sessions | A user record that cannot authenticate consistently or be revoked immediately is not an authoritative identity; a temporary environment login remains only for bootstrap migration |
| 2026-09-19 | Add a read-only portfolio Schedule with project-specific planning rules and dashboard exception widgets | Operations managers need cross-project visibility, while mutations must remain project-scoped so calendars, dependencies, baselines, and optimistic versions stay unambiguous |
| 2026-09-20 | Finish individual Office identity session revocation, then ship a pin-based plan completion MVP | Production field records need revocable Office sessions first; technicians should tap office-placed pins instead of drawing CAD geometry |
| 2026-09-20 | Store voice notes in a dedicated `job_voice_notes` table with async transcription after save | Field save must not wait on a provider; audio stays private (demo memory / production Blob); extract selected text into existing task and field-note records |
| 2026-09-20 | Expand plan markup to drawing tools, layer filters, PDF sheets, and marked-up closeout export | The pin MVP proved the completion loop; remaining ANN-002/004/006 and DOC-001 PDF rendering were the next bounded field-documentation step |
| 2026-09-21 | Transcribe saved voice notes with Deepgram Nova-3 prerecorded listen | Matches the Showdesk batch path (`nova-3`, `en-US`, smart format, punctuate). Field save still finishes when `DEEPGRAM_API_KEY` is unset, leaving an empty transcript the user can type |
| 2026-09-21 | Track AI-008 through AI-026 and build Release A before commercial AI | Cited summaries, daily-report drafts, and the current-record exception queue use data the app already stores. Scope, price, change orders, embeddings, dispatch, photo deficiencies, warranty triage, and cost explanation wait on the records named in section 24.10. Geometric takeoff, generated prices, and autonomous safety sign-off stay out |
| 2026-09-21 | Ship AI-008, AI-009, and AI-013 on the Vercel AI Gateway | Office users get a cited job summary, a daily-report draft that saves only after confirm, and a Home exception list. Demo mode and a missing gateway key never call the network. AI-010 through AI-026 stay unimplemented |
| 2026-09-21 | Add the morning brief, material pick list, and deficiencies by sheet | Field users see today's assignment, plan, blockers, and material requests. Office users can copy open material requests and review deficiencies grouped by sheet. Quantity pace waits until a task stores a stated quantity |
| 2026-09-21 | Let a completed transcript propose one plan pin, and let a blocker or quantity note propose a one-working-day schedule slip | Confirm uses the existing plan-mark and reschedule commands. Preview and reject write nothing. Quantity pace still waits on a stated task quantity |
| 2026-09-21 | Confirm task status and due-date commands before they write, and keep one undo | A direct reversible command states its effect first. Undo restores the recorded snapshot only while the task version still matches. Fields the task table does not store stay out |
| 2026-09-21 | Restore the prior task version on undo, and refuse a schedule or pin confirm whose sentence changed | One undo must leave the previous command undoable. Accept and pin confirm must apply the sentence the user saw |
| 2026-09-21 | Bind a schedule accept to every shown move and restore earlier moves if a later move fails | A multi-record slip must not leave the schedule half applied or apply dates the user did not approve |
| 2026-09-21 | Propose one blocker, deficiency, or material request from a completed transcript | The sentence is visible before the existing voice extract writes it. A task from the same transcript stays manual |
| 2026-09-21 | Keep a later transcript sentence available after one record is saved, and check the pin fields on confirm | One extract must not hide a different request, and a pin confirm must not write a body the user did not see |
| 2026-09-21 | Let a dismissed transcript sentence stay unwritten while the next sentence can be confirmed | Office staff can record the request they want without first saving a higher-ranked sentence |
| 2026-09-21 | Keep a transcript in the exception queue while a sentence can still be saved | One saved sentence must not hide a different request from the home queue |
| 2026-09-22 | Store a stated quantity in bags or square feet on an open task and warn when installed quantity is ahead of that remainder | Quantity pace uses field quantities only. It does not state dollars, margin, or a price. A due-date command leaves the stated quantity in place |
| 2026-09-22 | Store reusable price-book items by trade before estimate versions | Estimators need a unit price they can reuse. An item can be retired without deleting it. Assemblies, templates, versions, proposals, and approvals stay out of this slice |
| 2026-09-22 | Treat a bid package as private opportunity evidence before a job exists, and create operational records only after exact-version approval, customer acceptance, and internal conversion confirmation | Upload and AI draft must have no operational effect. Written quantities may be cited; geometric takeoff and generated prices remain out. Deterministic estimate versions, human price selection, and one atomic idempotent conversion preserve financial and job history |
| 2026-09-22 | Import existing Strong Foam spreadsheets through a reviewed Supabase Import Center rather than direct database writes | Private staging, stable source keys, deterministic validation, human conflict resolution, administrator commit, one transaction, inactive workforce identities, draft price revisions, and reconciliation make the migration repeatable and auditable |
| 2026-09-22 | Gate commercial AI separately from manual estimates, proposals, and conversion | Office staff can keep estimating while AI stays off. Production AI requires passed workflow checks, a fresh worker heartbeat, residency-approved scanner and models, evaluation rejections, and cost and rate limits |
| 2026-09-22 | Record a change order on the project before drafting one from a voice note | QTE-007 needs scope, price, schedule impact, status, approval evidence, and a budget effect. Approval uses the existing second-approver rule. The revised total adds approved effects to the original budget. Schedule-impact days are recorded and do not move tasks. AI-019 stays unbuilt |
| 2026-09-22 | Schedule a person on a job for one day before recommending a crew | DSP-001 through DSP-008 record who is sent where. Cancelling keeps the row. Two jobs on the same day stay visible. Job assignments, task dates, time, purchase orders, inspections, closeout, and AI-023 stay unchanged |
| 2026-09-23 | Record field labor as piece work or hours, without a wage | Spray foam crews are often paid by the bag or square foot. The labor entry stores that count, or the hours worked. Rates and payroll stay out under IMP-024 |
| 2026-09-23 | Treat workforce efficiency as verified operational performance before financial reporting | One authoritative production quantity, linked labor, explicit crew or individual attribution, effective-dated targets, comparable samples, and quality context avoid a misleading raw-output leaderboard. My Performance is private. Office rankings require policy sign-off. Costs wait for the accounting system of record |
| 2026-09-23 | Ship the first workforce view behind a flag without rankings | Office and field can review verified pace while the sample, attribution, and target policy are still open. `OPS_WORKFORCE_PERFORMANCE=0` hides it. Demo mode shows it |
| 2026-09-23 | Enable the first workforce view in production | `OPS_WORKFORCE_PERFORMANCE=1` on production and preview. Rankings, wages, quality scoring, and financial costs stay off. Setting the flag to `0` hides the feature |
| 2026-09-23 | Draft a purchase order from material requests before receipts or cost | PO-001 through PO-007 cite the field request, copy its description and any stated quantity, and store no price. One request sits on one active order. Cancelling keeps the order and releases the request |
| 2026-09-23 | Assign named equipment to an open job before rentals or inventory | EQ-001 through EQ-007 record which named unit is on a job. Releasing keeps the row. The same name on two open jobs is visible. Rates, rentals, and inventory stay out |
| 2026-09-23 | Record a named inspection on an open job before closeout | INS-001 through INS-006 store open, passed, or failed for one name on one job. Recording that name again updates the row. Home lists open and failed results on jobs that are still open. No price is stored. The result is not a workforce score. Closeout stays unbuilt |
| 2026-10-06 | Record closeout, then the packet draft and a dispatch recommendation | CLO-001 through CLO-007 store one closeout per open job. Signed waits until every inspection has passed. The assembly draft is saved and not sent. Crew capacity is 1–3 jobs a day. Accepting AI-023 assigns the open task |
| 2026-10-06 | Record deficiencies and rework as workforce quality | QAL-001 through QAL-007 store one deficiency or rework row per job and name. Quality is a separate label on the performance view. A missing source stays “not available.” Inspections stay out of the score. Efficiency and the unranked office list stay as they are |
| 2026-10-06 | Run every model draft through one Cloudflare agent | `StrongfoamAgent` is one class with an instance per organization and record. Model calls use AI Gateway `strongfoam`. D1 stays the system of record. A person confirms. The agent does not set a price, send a message, or change the workforce score. AI-022 uses AI Search instead of pgvector |
| 2026-10-06 | Measure plan takeoff after a person confirms the scale | AI-027 lets the agent propose a scale and one region. The server calculates square feet, linear feet, or a count. The model does not supply the stored quantity or the price. An unscaled sheet stays Takeoff required. AI-016 and AI-018 still cite written quantities only |
| 2026-10-06 | Accept United States storage | Cloudflare cannot keep D1, R2, or Durable Objects inside Canada. The live database has no jurisdiction and the file bucket is in Eastern North America. That is accepted. Retention and restore testing stay open |

## 32. Change log

| Version | Date | Summary |
|---|---|---|
| 1.43 | 2026-10-06 | Replaced the Vercel, Render, and Supabase architecture with the Cloudflare Worker, D1, R2, and queue that are deployed. United States storage is accepted. The delivery sequence no longer starts by provisioning Supabase |
| 1.42 | 2026-10-06 | Reviewed the agent plan against the code. AI-016 and AI-018 are partly built and already store drafts in D1. Drafts stay in D1, not agent state. Plan takeoff adds page size, two-point calibration, a takeoff record, a vision model, and an evaluation set |
| 1.41 | 2026-10-06 | Specified AI-027 plan takeoff. The agent proposes a scale and a region. The server calculates the quantity after a person confirms both. The model does not set the quantity or the price |
| 1.40 | 2026-10-06 | Specified the Cloudflare agent runtime for the whole application. One `StrongfoamAgent` class, AI Gateway `strongfoam`, and D1 as the system of record. AI-022 retrieval is Cloudflare AI Search. The design and the implementation plan are linked from section 24 |
| 1.39 | 2026-10-06 | Shipped QAL-001 through QAL-007. Office users record a deficiency or rework item on an open job. The same kind and name updates that row. Home lists open and reopened rows. The performance view shows that quality beside efficiency. A missing source stays “not available,” and inspections stay out of the score. The field view stays private and the office list stays unranked |
| 1.38 | 2026-10-06 | Shipped CLO-001 through CLO-007, AI-021, and AI-023. Office users record one closeout per open job. Signed waits until every inspection has passed. The insulation assembly draft is saved on the closeout and is not sent. Crew capacity is 1–3 jobs a day. Accepting a recommendation assigns that open task |
| 1.37 | 2026-09-23 | Shipped INS-001 through INS-006. Office users record a named inspection on an open job. The same name updates that row. Home lists open and failed results on jobs that are still open. No price is stored. The result is not a workforce score. Closeout and AI-023 remain unbuilt |
| 1.36 | 2026-09-23 | Shipped EQ-001 through EQ-007. Office users assign named equipment to an open job or release it. Releasing keeps the row. Home lists the same name on two open jobs. No rate is stored. Inspections, closeout, and AI-023 remain unbuilt |
| 1.35 | 2026-09-23 | Shipped PO-001 through PO-007. Office users draft a purchase order from material requests, mark it ordered, or cancel it. A material request can store an optional quantity, which the line copies. Cancelling keeps the row and releases the requests. No price is stored. Equipment, inspections, closeout, and AI-023 remain unbuilt |
| 1.34 | 2026-09-23 | Enabled the first workforce slice in production. `OPS_WORKFORCE_PERFORMANCE=1` on production and preview. Rankings, wages, quality scoring, and financial costs remain off |
| 1.33 | 2026-09-23 | Corrected the first workforce slice: individual production is one person until an allocation exists, exclusion reasons are visible, a participant cannot void their own score, and only one target stays open for a work class |
| 1.32 | 2026-09-23 | Implemented the first workforce-performance slice behind `OPS_WORKFORCE_PERFORMANCE`: verified production, targets, normalized efficiency, private My Performance, an unranked office review, and Home exceptions. Rankings, wages, quality scoring, and financial costs remain off |
| 1.31 | 2026-09-23 | Specified WFP-001 through WFP-018 and the implementation plan for verified production attribution, private field-worker trends, office workforce performance, actionable exceptions, sample and quality safeguards, controlled rollout, and a later restricted financial bridge. The feature is not built |
| 1.30 | 2026-09-23 | Shipped LAB-001 through LAB-007. Field labor is piece work in bags or square feet, or hours up to 24. The same person can have both on one job and day. No wage is stored. Purchase orders, equipment, inspections, closeout, and AI-023 remain unbuilt |
| 1.29 | 2026-09-22 | Shipped DSP-001 through DSP-008 day dispatch. Office users schedule or cancel a field member on a job for one date. The same slot revives instead of duplicating. Double bookings stay visible on the board and Home. Field users see only their own scheduled rows, and that row opens the job for the working day. Time, purchase orders, equipment, inspections, closeout, and AI-023 remain unbuilt |
| 1.28 | 2026-09-22 | Shipped QTE-007 change orders: scope, price, schedule-impact days, status, administrator approval evidence, and one budget effect on the revised project total. Task dates are not moved. AI-019 remains unbuilt |
| 1.27 | 2026-09-22 | Added organization-scoped commercial rollout flags and Home links for failed scan, extraction, proposal, and conversion jobs. Commercial AI stays off until workflow checks, a healthy worker heartbeat, residency-approved providers, the evaluation suite, and cost and rate limits are in place |
| 1.26 | 2026-09-22 | Added IMP-001 through IMP-030 for the Supabase Data Import Center: private XLSX/CSV staging, malware/archive checks, mapping profiles, deterministic validation, source-key crosswalks, administrator-only transactional commit, price-book product codes and costs, inactive workforce import, linked customer/project/job import, reconciliation, retention, and production cutover |
| 1.25 | 2026-09-22 | Specified the governed bid-package-to-estimate-to-job workflow. Added pre-job private document versions, durable scan/extraction/OCR, citations, immutable price and estimate versions, deterministic calculation, exact approval/proposal/acceptance, atomic multi-job conversion, and the boundary against geometric takeoff or AI-generated pricing |
| 1.24 | 2026-09-22 | Shipped price-book items by trade, with a Canadian-dollar unit price and a retired state. Assemblies, scope templates, estimate versions, proposals, and approvals remain open. AI-016 can start from the item book and is not built |
| 1.23 | 2026-09-22 | Shipped AI-014. An open task stores a stated quantity in bags or square feet. Home and the job warn when installed field quantity is ahead of that remainder, without dollars or margin |
| 1.22 | 2026-09-21 | The home exception queue keeps a transcript while another sentence can still be saved. AI-014 stays blocked until tasks store a stated quantity |
| 1.21 | 2026-09-21 | A transcript record skips a product mention that is not a request, and a later sentence can still be saved or confirmed after the earlier sentence is dismissed. A new task is proposed only when that work is not already open. A spoken pin confirm checks the mark fields. AI-014 stays blocked until tasks store a stated quantity |
| 1.20 | 2026-09-21 | A completed transcript can propose one blocker, deficiency, or material request. Confirm uses the existing voice extract. AI-014 stays blocked until tasks store a stated quantity |
| 1.19 | 2026-09-21 | A schedule accept writes only the exact moves shown. If a later move fails, earlier moves are restored. AI-014 stays blocked until tasks store a stated quantity |
| 1.18 | 2026-09-21 | Task undo walks back more than one command when nothing else edited the task. One-click office and field status changes are undoable. Schedule accept and spoken pin confirm refuse when the shown sentence changed. AI-014 stays blocked until tasks store a stated quantity |
| 1.17 | 2026-09-21 | Shipped reversible task commands for status and a one-working-day due date, with confirm and undo. AI-014 stays blocked until tasks store a stated quantity |
| 1.16 | 2026-09-21 | Shipped AI-011 speak onto the plan and AI-012 schedule diff. AI-014 stays blocked until tasks store a stated quantity |
| 1.15 | 2026-09-21 | Shipped AI-010 morning brief, AI-015 material pick list, and AI-020 deficiencies by sheet. AI-014 stays blocked until tasks store a stated quantity |
| 1.14 | 2026-09-21 | Shipped AI-008 cited job summary, AI-009 confirmed daily-report draft, and AI-013 Home exception queue |
| 1.13 | 2026-09-21 | Added AI-008 through AI-026 so field, commercial, and later platform AI can be tracked, and specified Release A |
| 1.12 | 2026-09-21 | Switched voice-note transcription from OpenAI Whisper to Deepgram Nova-3 prerecorded listen, including provider confidence |
| 1.11 | 2026-09-20 | Added circle, ellipse, polygon, arrow, and text plan marks, layer filters, PDF sheet rendering, and marked-up closeout export |
| 1.10 | 2026-09-20 | Shipped Release 4 voice notes: private recording, queued/processing/completed/failed transcription, editable transcripts, and extract-to-task/blocker/deficiency/material/daily-log |
| 1.9 | 2026-09-20 | Hardened Office session revocation and shipped the first plan-based field completion loop: immutable plan revisions, image-sheet pin markup, and tap-to-complete field updates |
| 1.8 | 2026-09-19 | Added SCH-023 to SCH-032 for a bounded all-project Schedule, cross-project resource overlaps, latest-baseline roll-up, and dashboard schedule-attention widgets. Field assignment remains SCH-022. |
| 1.7 | 2026-09-19 | Expanded user administration requirements for individual Office authentication, administrator RBAC, lifecycle editing, credential reset, session revocation, lockout safeguards, and audit history |
| 1.6 | 2026-09-19 | Defined separate Field identity/application boundaries, stable assignment routing from Schedule to Field, and the two-way realtime contract; recorded the initial implementation state |
| 1.5 | 2026-09-19 | Expanded the project Schedule scope to include dependencies, critical path, controlled rescheduling, immutable baselines, assignment overlays, and working-day calendar exceptions |
| 1.4 | 2026-09-19 | Added SCH-001 to SCH-015 for a project-level Gantt schedule that rolls up jobs and tasks, defines progress and unscheduled work, and phases task durations and dependencies |
| 1.3 | 2026-09-19 | Shipped UX-007 to UX-014: Sonner toasts, Cmd+K search, link-or-create company picker, optimistic tasks, AlertDialog confirms, date presets, dirty-form protection, and inline field errors |
| 1.2 | 2026-09-19 | Moved create forms behind buttons, added New job entry points, read-first detail pages with Edit dialogs, confirmed deletes, empty states, and the Home dashboard; recorded UX-001 to UX-014 |
| 1.1 | 2026-09-19 | Added create, edit, and delete for every record type plus status, type, and date-range filters on every list |
| 1.0 | 2026-09-19 | Added the mobile field landing page and job field log for tasks, notes, quantities, photos, blockers, material requests, and daily reports |
| 0.9 | 2026-09-19 | Hardened job document validation and direct private uploads, then improved the field workspace hierarchy, progress, feedback, touch targets, and accessibility |
| 0.8 | 2026-09-19 | Added job work areas, job tasks, and authenticated plan/photo uploads on the job record |
| 0.7 | 2026-09-18 | Adopted shadcn/ui as the operations design system and rebuilt the staff workspace |
| 0.6 | 2026-09-18 | Added won-work conversion into a project and jobs, plus job status and activity |
| 0.5 | 2026-09-18 | Added company, contact, site, and opportunity conversion from estimate requests |
| 0.4 | 2026-09-18 | Added request tasks, comments, mentions, and collaboration migration |
| 0.3 | 2026-09-18 | Shipped the first staff estimate-request review workspace, session auth, and versioned workflow schema |
| 0.2 | 2026-09-18 | Added the design system, Vercel/Render/Supabase deployment architecture, pgvector retrieval, and governed AI operations agent |
| 0.1 | 2026-09-18 | Initial CRM / ERP product requirements and phased delivery plan |
