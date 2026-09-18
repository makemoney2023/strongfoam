# Strong Foam CRM / ERP Product Requirements Document

**Product:** Strong Foam Operations Platform
**Document owner:** Strong Foam Insulation Inc.
**Status:** Draft source of truth
**Version:** 0.4
**Created:** 2026-09-18
**Last updated:** 2026-09-18

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

The operations product will use a design language called **Industrial
Precision**: trustworthy, durable, legible, and efficient without looking like
generic enterprise software.

The public marketing site may retain its cinematic, dark, motion-led
presentation. The authenticated product must prioritize fast scanning, clear
status, accessible data entry, and field use. Both surfaces share the Strong
Foam brand, typography, and core color primitives.

Design dials for the authenticated product:

| Dial | Target | Meaning |
|---|---:|---|
| Visual variance | 4/10 | Modern and distinctive, but predictable |
| Motion | 3/10 | Subtle feedback rather than decorative animation |
| Information density | 8/10 office, 5/10 field | Efficient desktop review and touch-friendly field work |

### 22.2 Token architecture

The implementation must use three token layers:

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

The authenticated office product is light-first for long data-review sessions,
with dark navigation and an optional complete dark theme. The field experience
may follow device theme but must preserve outdoor contrast.

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

The component system extends the existing shadcn primitives and must define:

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

**AI-003:** The agent must create and update tasks through typed commands,
including title, description, assignee, due date, priority, status, checklist,
and source-record link.

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

1. Read-only search and cited summaries for selected internal users.
2. Draft tasks, notes, reports, and communications.
3. Direct reversible updates to the requesting user's tasks.
4. Approved task creation, assignment, and internal-note actions.
5. Durable note/transcript extraction and exception queues.
6. Policy-driven automation after measured accuracy and adoption justify it.

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

### Plans and voice

1. Add document versioning and plan rendering.
2. Add circle, polygon, pin, text, and status annotations.
3. Add marked-up exports.
4. Add audio recording, durable processing, transcription, and transcript
   review.

### AI operations

1. Add authorized hybrid retrieval and cited read-only summaries.
2. Add task, note, and report drafts.
3. Add reversible direct task updates with confirmation and undo.
4. Add exact-diff approvals for proactive and multi-record actions.
5. Add scheduled exception detection and operational review queues.

### Commercial and operational expansion

1. Add estimate versions, line items, price books, proposals, and approvals.
2. Add change orders and project budgets.
3. Add dispatch, time, materials, equipment, inspections, and closeout.
4. Add job costing and accounting integrations.
5. Add customer and subcontractor portals if validated.

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

1. Single-company launch versus opening multi-organization onboarding.
2. Final staff roles, MFA rules, and permission matrix.
3. Annotation library and marked-up PDF export approach.
4. Speech-to-text provider, supported languages, consent, and audio retention.
5. AI model gateway, model providers, embedding model, and cost limits.
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

## 32. Change log

| Version | Date | Summary |
|---|---|---|
| 0.4 | 2026-09-18 | Added request tasks, comments, mentions, and collaboration migration |
| 0.3 | 2026-09-18 | Shipped the first staff estimate-request review workspace, session auth, and versioned workflow schema |
| 0.2 | 2026-09-18 | Added the design system, Vercel/Render/Supabase deployment architecture, pgvector retrieval, and governed AI operations agent |
| 0.1 | 2026-09-18 | Initial CRM / ERP product requirements and phased delivery plan |
