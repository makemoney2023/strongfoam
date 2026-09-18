# Strong Foam CRM / ERP Product Requirements Document

**Product:** Strong Foam Operations Platform
**Document owner:** Strong Foam Insulation Inc.
**Status:** Draft source of truth
**Version:** 0.1
**Created:** 2026-09-18
**Last updated:** 2026-09-18

## 1. Purpose

This document defines the product direction and implementation requirements for
evolving the Strong Foam website into a centralized construction CRM and
operations platform.

The platform will begin with two capabilities:

1. An internal list and review workflow for estimate requests submitted through
   the existing lead-generation survey.
2. A field job workflow in which technicians can review plans, mark completed
   work directly on a blueprint or diagram, and attach speech-to-text notes.

The long-term product will support customer relationship management, estimating,
project execution, field reporting, job costing, and operational review for
insulation, drywall, flooring, and home-building work.

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

The survey creates **estimate requests**, not priced estimates. The application
does not currently provide staff authentication, an internal dashboard,
customers, projects, jobs, crews, document markup, transcription, scheduling, or
financial workflows.

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

## 22. Technical direction

### 22.1 Application structure

Continue with the existing Next.js application initially, with clear route and
bundle boundaries:

```text
Public marketing and survey
Authenticated office application
Mobile-first field application
API and integration endpoints
Asynchronous workers
```

The public website must remain performant and independently usable if internal
operations are degraded.

### 22.2 Recommended platform components

- Existing Next.js App Router and React UI stack.
- PostgreSQL with Drizzle and version-controlled migrations.
- Private object storage for plans, photos, recordings, and exports.
- A supported authentication provider and server-side authorization layer.
- A durable queue or workflow service for transcription, notifications,
  document generation, and integration retries.
- PDF.js or equivalent for plan rendering.
- A canvas overlay such as Konva or tldraw for annotations.
- IndexedDB-backed local drafts and upload queue for field resilience.
- A selected speech-to-text provider behind an internal adapter.

Provider choices are implementation decisions and must be recorded before the
relevant release begins.

### 22.3 API rules

- Validate all inputs server-side.
- Authorize every internal read and mutation.
- Use idempotency keys for retryable submissions.
- Use signed, scoped, expiring access for private files.
- Do not expose storage or database credentials to clients.
- Use stable domain events for asynchronous work and integrations.
- Version externally consumed API contracts.

## 23. Security, privacy, and compliance

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

## 24. Reliability and performance

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

## 25. Product success measures

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

Later metrics:

- Estimate accuracy versus actual cost.
- Gross margin and variance by trade and job.
- Crew productivity against planned production.
- Change-order approval cycle.
- Schedule adherence.
- Customer repeat and warranty rates.

Metrics must not be used for automated employment decisions without an explicit
policy and human review.

## 26. Delivery sequence

### Foundation

1. Add version-controlled database migrations.
2. Establish organization, user, membership, role, and audit-event models.
3. Add authentication and server-side authorization.
4. Separate public, office, and field application boundaries.
5. Preserve and test the existing lead intake contract.

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

### Plans and voice

1. Add document versioning and plan rendering.
2. Add circle, polygon, pin, text, and status annotations.
3. Add marked-up exports.
4. Add audio recording, durable processing, transcription, and transcript
   review.

### Commercial and operational expansion

1. Add estimate versions, line items, price books, proposals, and approvals.
2. Add change orders and project budgets.
3. Add dispatch, time, materials, equipment, inspections, and closeout.
4. Add job costing and accounting integrations.
5. Add customer and subcontractor portals if validated.

Each stage must include authorization tests, audit coverage, data migration,
operational monitoring, and user acceptance criteria.

## 27. Dependencies and risks

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

## 28. Open decisions

These decisions are required before their respective implementation stage:

1. Authentication provider and login requirements.
2. Single-company launch versus immediate multi-organization support.
3. Final staff roles and permission matrix.
4. Whether the office application uses `/app` or a dedicated subdomain.
5. Annotation library and marked-up PDF export approach.
6. Speech-to-text provider, supported languages, consent, and audio retention.
7. Queue/workflow provider for asynchronous processing.
8. Accounting system of record and synchronization boundaries.
9. Required field devices and minimum supported browsers.
10. Offline requirements beyond drafts and queued uploads.
11. Initial estimate format, price-book ownership, taxes, and approval rules.
12. Data retention, backup, and disaster-recovery policies.

## 29. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-18 | Deliver estimate review before broader CRM / ERP modules | It exposes current lead data and establishes staff workflow early |
| 2026-09-18 | Support jobs created from won work or manual entry | Not every operational job will originate from the public survey |
| 2026-09-18 | Store annotations separately from immutable document versions | Preserves plan history and auditable field evidence |
| 2026-09-18 | Process transcription asynchronously | Network or provider latency must not block field work |
| 2026-09-18 | Integrate accounting before attempting a general ledger | Construction operations are the product's initial differentiator |

## 30. Change log

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-09-18 | Initial CRM / ERP product requirements and phased delivery plan |
