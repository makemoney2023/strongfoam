# Strong Foam CRM / ERP Product Requirements Document

**Product:** Strong Foam Operations Platform
**Document owner:** Strong Foam Insulation Inc.
**Status:** Draft source of truth
**Version:** 1.19
**Created:** 2026-09-18
**Last updated:** 2026-09-21

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
own change. A spoken pin confirm refuses when the shown sentence changed.
AI-014 and AI-016 through AI-026 remain specified and
are not built. AI-014 waits until an open task stores a stated quantity. The target Supabase/Render deployment split, full permission matrix,
crews, durable offline sync, and financial workflows remain to be completed.

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
- Automated takeoff from plan geometry.
- Replacing existing accounting software.
- A customer or subcontractor portal.
- AI-generated pricing or autonomous approval decisions.

These may be reconsidered after the core data and operating workflows are stable.

## 8. Users and roles

| Role | Primary responsibilities |
|---|---|
| Administrator | Users, roles, configuration, integrations, audit review |
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

**DOC-002:** Documents must be private and associated with an organization,
project, job, and immutable document version.

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
available by trade.

**QTE-004:** Authorized users must be able to compare revisions and require
internal approval based on configurable thresholds.

**QTE-005:** The system must generate a branded proposal and record delivery,
view, acceptance, rejection, and expiration.

**QTE-006:** A won estimate must create an approved project budget without
discarding the estimate history.

**QTE-007:** Change orders must have scope, price, schedule impact, status,
approval evidence, and budget effect.

## 16. Project and operational requirements

Future operational releases should provide:

- Project milestones and dependencies.
- Calendar, dispatch board, crew capacity, and scheduling.
- Daily field reports and weather/site conditions.
- Labor time and production quantities.
- Material requests, purchase orders, receipts, and delivery tickets.
- Equipment assignment and usage.
- Safety forms and incidents.
- RFIs, submittals, inspections, and deficiencies.
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
have not been extracted. Unapproved change orders, inspections, and cost
variance appear in this queue only after their source records exist.

**RPT-002:** Users must be able to navigate from a dashboard result to the
underlying record and activity history.

**RPT-003:** Reports must use consistent organization time zone, currency, and
status definitions.

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

The target production topology is:

```text
strongfoam.com / app.strongfoam.com
Vercel CDN + Next.js frontend and thin BFF
                    │ authenticated HTTPS
                    ▼
api.strongfoam.com
Render TypeScript API
        │                    │
        ▼                    ▼
Supabase                 Render worker
PostgreSQL + Auth        AI, transcription, embeddings,
Storage + pgvector       exports, notifications, integrations
```

Platform responsibilities:

| Platform | Responsibility |
|---|---|
| Vercel | Public site, survey UI, authenticated office/field UI, SSR, static assets, thin same-origin BFF |
| Render web service | Authoritative domain API, authorization enforcement, webhooks, AI streaming, and job submission |
| Render worker | Durable transcription, embedding, document generation, notifications, integrations, and approved AI automation |
| Supabase | PostgreSQL, Auth, private Storage, Row Level Security, backups, Realtime where useful, and `pgvector` |

**Database decision:** use Supabase PostgreSQL instead of Neon for the expanded
product. Neon already serves the small lead system well, but Supabase reduces
administration by consolidating authentication, private files, PostgreSQL,
row-level security, realtime events, backups, and vector search. Migrating now
is less costly than migrating after CRM and field data proliferate.

### 23.2 Application boundaries

- The browser must not receive service-role credentials or unrestricted
  database access.
- Business mutations flow through typed domain commands on the Render API.
- The Vercel BFF authenticates same-origin browser requests and forwards short
  operations; it does not perform long-running work.
- Long operations return a job identifier and process asynchronously.
- Direct-to-Supabase Storage uploads use short-lived, object-scoped permission.
- Supabase RLS provides defense in depth and is not a substitute for domain
  authorization.
- The public marketing site remains usable if the Render API or AI provider is
  degraded.

### 23.3 Render services

The Render API must:

- Run as a paid, stateless web service bound to `0.0.0.0:$PORT`.
- Expose `/health/live` and `/health/ready`.
- Use graceful shutdown and deployment-safe request draining.
- Version public contracts under `/v1`.
- Verify webhook signatures and replay identifiers.
- Use idempotency keys for retryable mutations.
- Store no durable files on Render's ephemeral filesystem.

Use a separate paid Render background worker. The initial durable queue will use
`pg-boss` on Supabase PostgreSQL to avoid operating another datastore. A
transactional outbox will commit a business change and its pending event
together. Workers must checkpoint, retry with backoff, enforce provider rate
limits, and move exhausted work into a visible dead-letter queue.

Render cron jobs may enqueue reconciliation and scheduled work but must not
perform full long-running jobs themselves.

### 23.4 Supabase data services

- Enable `vector`/pgvector through a reviewed migration.
- Use separate least-privilege roles for API runtime, workers, migrations, and
  backup operations.
- Use pooled connections for application traffic and a direct connection for
  migrations and supported maintenance.
- Make storage buckets private and use immutable object keys for plans,
  recordings, evidence, proposals, and closeout documents.
- Enforce organization and record scope in RLS policies.
- Use Realtime only for bounded status and activity updates initially, not
  collaborative plan drawing.
- Provision paid backups and point-in-time recovery before production business
  records are accepted.

### 23.5 Environment and release strategy

Production, staging, preview, and local environments must not share databases,
storage buckets, queues, credentials, or webhook destinations.

```text
Production: Vercel production + Render production + Supabase production
Staging:    persistent Vercel/Render/Supabase staging
Preview:    Vercel preview + on-demand backend preview + synthetic database
Local:      local frontend/API/worker + isolated development database
```

Required release checks:

- Frozen-lockfile install, lint, type check, tests, and production builds.
- Migration validation against an isolated database.
- Frontend/API contract compatibility.
- Authorization and cross-organization isolation tests.
- Playwright smoke tests for changed full-stack workflows.
- Dependency, secret, and infrastructure validation.

Production uses expand/contract migrations:

1. Back up the database.
2. Apply an additive migration.
3. Deploy the Render API.
4. Deploy workers and verify queue health.
5. Deploy and test the Vercel candidate.
6. Promote the verified Vercel deployment.
7. Remove obsolete schema only in a later release.

A paid Vercel plan and paid Render services are production requirements. Free
services that sleep or expire must never carry production CRM/ERP traffic.

### 23.6 Migration from current infrastructure

1. Add versioned Drizzle migrations and baseline the existing lead schema.
2. Provision Supabase Auth, PostgreSQL, Storage, and pgvector in staging.
3. Copy existing Neon lead and Calendly records while preserving IDs.
4. Verify counts, checksums, qualification behavior, and signed-file access.
5. Move business logic and webhooks to the Render API.
6. Move email delivery to the transactional outbox and worker.
7. Migrate private Vercel Blob objects to Supabase Storage with a rollback
   window; do not dual-write indefinitely.
8. Switch the frontend through an environment-controlled API endpoint.
9. Remove production database credentials and authoritative business logic from
   Vercel after cutover.

### 23.7 Observability and recovery

All services must propagate a correlation ID, organization ID, authenticated
actor ID, deployment version, and job/event ID without logging sensitive
payloads.

Operational dashboards and alerts must cover:

- API availability, latency, and error rate.
- Queue depth, oldest-job age, retries, and dead letters.
- Worker health and duration by workload.
- Database connections, slow queries, storage, and vector-index performance.
- Failed uploads, webhooks, notifications, transcriptions, and AI actions.
- Version skew between frontend, API, workers, and database schema.

Initial recovery targets are RPO of 15 minutes or less and RTO of four hours or
less. Perform encrypted backups to a separate failure domain and test a restore
at least quarterly. Final retention and recovery targets must be approved
before financial workflows launch.

### 23.8 API rules

- Validate all inputs server-side.
- Authorize every internal read and mutation.
- Use idempotency keys for retryable submissions.
- Use signed, scoped, expiring access for private files.
- Do not expose storage or database credentials to clients.
- Use stable domain events for asynchronous work and integrations.
- Version externally consumed API contracts.

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

### 24.5 Retrieval and pgvector

Structured facts such as status, assignment, dates, quantities, approvals, and
costs must come from authorized SQL/domain queries, not semantic search.

Unstructured content eligible for retrieval includes:

- Notes and comments.
- Transcripts and daily reports.
- Extracted document text.
- Scope descriptions and activity narrative.
- Approved internal knowledge and procedures.

Use hybrid retrieval:

```text
Authorization prefilter
  → PostgreSQL full-text search + pgvector similarity
  → reranking
  → cited context
  → model response
```

Each indexed chunk must store organization, source entity and immutable version,
visibility scope, content hash, embedding model/version, timestamps, and
deletion state. Use HNSW and GIN indexes where evaluation supports them.
Re-embedding must occur side by side so model changes do not interrupt search.
Audio binaries are never embedded; approved transcript text may be embedded.

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
   AI-013, AI-015, and AI-020 are shipped. Still open in Release A: AI-014.
   AI-014 waits until an open task stores a stated quantity.
2. Release B after the commercial records exist: AI-016 through AI-019 and
   AI-021. The agent drafts scope and quantity. A person sets price and
   approval.
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

- Geometric measurement of plan PDFs stays a non-goal. AI-018 drafts scope
  lines from a walkthrough and the price book. It does not trace the drawing.
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
| AI-014 | Quantity pace warning | A | Blocked | Open tasks store a stated quantity in bags or sq ft |
| AI-015 | Material pick list | A | Shipped | After AI-014 |
| AI-016 | Request scope outline | B | Blocked | QTE-003 price book |
| AI-017 | Estimate revision explanation | B | Blocked | QTE-001 and QTE-004 |
| AI-018 | Walkthrough scope lines | B | Blocked | QTE-002, QTE-003, and section 17.1 assembly fields |
| AI-019 | Change-order draft | B | Blocked | QTE-007; a person sets the price |
| AI-020 | Deficiencies grouped by plan sheet | A | Shipped | After AI-011 |
| AI-021 | Closeout and rebate packet | B | Blocked | Section 17.1 fields and the marked-up PDF export |
| AI-022 | Hybrid retrieval of notes and transcripts | C | Later | Render worker and pgvector |
| AI-023 | Dispatch recommendation | C | Blocked | Crew records and capacity |
| AI-024 | Photo deficiency proposal | C | Later | Evaluation set required by section 24.8 |
| AI-025 | Warranty and inbound email triage | C | Later | Customer portal or inbound mailbox |
| AI-026 | Cost variance explanation | C | Blocked | Accounting system chosen in open decision 6 |

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

**AI-016:** After a price book exists, the agent may propose service mix, site
assembly, and scope wording from an estimate request. The estimator accepts
the outline onto the opportunity. Public survey qualification stays
deterministic.

**AI-017:** When estimate versions exist, the agent explains what scope,
quantity, and price changed between two versions and which approval threshold
the change crosses. The approver still decides.

**AI-018:** An estimator or technician walkthrough may become draft price-book
lines for location, R-value, area, depth, product, and bag count. A person
chooses the price-book item and the amount. This is not geometric takeoff.

**AI-019:** A voice note, photo, and plan pin may become a draft change order
containing location, assembly, quantity, and schedule impact, plus
customer-ready wording. A person enters price and approval. The agent does
not send the change order.

**AI-020:** Open deficiency field notes and deficiency plan marks are grouped
by plan sheet for closeout review. The group is a view and a draft. It does
not replace a future punch-list workflow.

**AI-021:** After insulation assembly fields exist, the agent drafts the
closeout and rebate narrative from the marked-up PDF, quantities, photos, and
those fields. Publishing the packet to a customer waits on portal policy.

**AI-022:** Approved note and transcript text may be embedded for hybrid
retrieval under section 24.5. Audio binaries are not embedded. Interactive
summaries in Release A do not require embeddings.

**AI-023:** After crew capacity exists, the agent may recommend a person for
an open task and present the assignment as an exact diff. Overlap warnings
that already exist on the schedule remain the source for conflicts.

**AI-024:** After an evaluation set exists, a photo may produce a proposed
deficiency attached to a plan region. A person files or discards it. The
agent cannot mark safety or compliance work complete.

**AI-025:** After a portal or inbound mailbox exists, a warranty message may
become a proposed warranty job linked to the closed project. Until then, field
deficiencies cover problems found by the crew.

**AI-026:** After an accounting system of record is chosen, the agent explains
cost and schedule variance in plain language and links to the source budget
and field quantities. It does not post invoices, bills, or payments.

Design and the Release A implementation plan live in
`docs/superpowers/specs/2026-09-21-ai-operations-design.md` and
`docs/superpowers/plans/2026-09-21-ai-operations.md`.

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

Later metrics:

- Estimate accuracy versus actual cost.
- Gross margin and variance by trade and job.
- Crew productivity against planned production.
- Change-order approval cycle.
- Schedule adherence.
- Customer repeat and warranty rates.

Metrics must not be used for automated employment decisions without an explicit
policy and human review.

## 28. Delivery sequence

### Foundation

1. Add version-controlled database migrations.
2. Provision isolated Supabase staging and production projects.
3. Establish organization, user, membership, role, RLS, and audit-event models.
4. Add Supabase Auth and server-side authorization.
5. Establish the Render API, worker, transactional outbox, and health checks.
6. Separate public, office, and field application boundaries on Vercel.
7. Preserve and test the existing lead intake contract during migration.

### Estimate operations

1. Build the request list and filtering.
2. Build request detail, assignment, status, comments, and tasks.
3. Add company, contact, site, and opportunity conversion.
4. Add the centralized activity timeline.

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
6. Preserve these contracts when identity moves to Supabase Auth and RLS.

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
   (AI-011, done), and schedule diff (AI-012, done). Still open: quantity
   pace (AI-014, blocked until tasks store a stated quantity).
3. Add reversible direct task updates with confirmation and undo (done for
   status and a one-working-day due date, including one-click complete and
   chained undo while the task is otherwise unchanged). Description, priority,
   and checklist wait until a task stores those fields.
4. Add exact-diff approvals for proactive and multi-record actions (done for
   a schedule slip: accept writes only the moves shown, and a later failure
   restores the earlier moves). Bulk reassignment stays out until that command
   exists.
5. Add hybrid retrieval (AI-022) when the Render worker and pgvector exist.

### Commercial and operational expansion

1. Add estimate versions, line items, price books, proposals, and approvals.
2. Add change orders and project budgets.
3. Then allow commercial AI drafts: scope outline (AI-016), revision
   explanation (AI-017), walkthrough scope lines (AI-018), and change-order
   drafts (AI-019).
4. Add dispatch, time, materials, equipment, inspections, and closeout, then
   the closeout packet (AI-021) and dispatch recommendation (AI-023).
5. Add job costing and accounting integrations, then cost variance
   explanation (AI-026).
6. Add customer and subcontractor portals if validated, then warranty triage
   (AI-025).

Each stage must include authorization tests, audit coverage, data migration,
operational monitoring, and user acceptance criteria.

## 29. Dependencies and risks

| Risk or dependency | Mitigation |
|---|---|
| Internal access is added before robust authorization | Build organization and permission checks before internal UI |
| Public uploads are reused for private job files | Create authenticated, job-scoped upload flows |
| Plan revisions invalidate field marks | Make document versions immutable and version-bound |
| Poor jobsite connectivity causes missing records | Local drafts, retry queues, and visible sync state |
| Transcription is slow, costly, or inaccurate | Async processing, provider adapter, user correction, usage metrics |
| Product expands into an unbounded ERP rewrite | Deliver bounded workflows and integrate accounting first |
| Staff adoption suffers from excessive form entry | Defaults, templates, voice capture, and progressive disclosure |
| Financial or status edits lack traceability | Append-only audit and version records |
| Marketing performance declines as app grows | Maintain route, data, and bundle boundaries |
| Trade-specific fields fragment the platform | Shared core entities plus configurable trade templates |
| AI exposes another organization's records | Authorization prefilter, RLS, source-level ACLs, and adversarial tests |
| Prompt injection triggers an unsafe action | Narrow typed tools, server authorization, and untrusted-content boundaries |
| AI creates duplicate or stale changes | Idempotency, optimistic locking, payload-bound approval, and undo |
| Cross-platform releases create version skew | Versioned contracts and expand/contract deployment |
| Supabase migration disrupts lead intake | Staging rehearsal, ID preservation, verification, and rollback window |
| Render worker stops during processing | Checkpointed jobs, graceful shutdown, retries, and dead-letter queue |
| Infrastructure stores Canadian data outside Canada | Confirm contractual residency and transfer requirements before provisioning |

## 30. Open decisions

These decisions are required before their respective implementation stage:

1. Timing and policy for opening multi-organization onboarding after the
   single-company launch.
2. Final staff roles, MFA rules, and permission matrix.
3. Annotation library and marked-up PDF export approach.
4. Speech-to-text languages beyond English, consent copy, and audio retention.
   The provider is Deepgram Nova-3 prerecorded listen.
5. Embedding model and AI cost limits. Release A uses the Vercel AI Gateway.
   The model id is configuration, and the agent stays off when that
   configuration is missing. Embeddings wait for AI-022.
6. Accounting system of record and synchronization boundaries.
7. Required field devices and minimum supported browsers.
8. Offline requirements beyond drafts and queued uploads.
9. Initial estimate format, price-book ownership, taxes, and approval rules.
10. Final data residency, retention, backup, and disaster-recovery policies.

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

## 32. Change log

| Version | Date | Summary |
|---|---|---|
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
