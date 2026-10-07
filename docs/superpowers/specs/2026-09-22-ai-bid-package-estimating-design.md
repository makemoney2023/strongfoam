# AI Bid Package, Estimating, and Job Creation — Design Specification

**Date:** 2026-09-22
**Product:** Strong Foam Operations Platform
**Status:** Proposed. Plan measurement is AI-027 in `docs/superpowers/specs/2026-10-06-cloudflare-agents-design.md`. This document still rejects a model-supplied quantity.
**PRD requirements:** EST-006, EST-008, EST-010, JOB-001 through JOB-003,
QTE-001 through QTE-006, BID-001 through BID-015, DOC-002 through DOC-004,
AI-016 through AI-018, RT-004 through RT-006
**Primary surfaces:** `/app/opportunities/[id]`,
`/app/opportunities/[id]/estimates/[estimateId]`, signed proposal review

## Executive summary

Strong Foam should accept a private bid package before a job exists, extract
its written scope with page-level citations, draft an estimate from approved
price-book revisions, and propose the project jobs that accepted work will
need.

Uploading a file does not create an estimate, project, job, price, or customer
commitment. The workflow is:

```text
Opportunity
  → private bid-package upload
  → quarantine and durable extraction
  → cited AI proposal
  → estimator-reviewed immutable estimate version
  → exact-version approval
  → proposal delivery and customer acceptance
  → internal conversion confirmation
  → one project, approved jobs, budget, tasks, and document links
```

The model may extract an explicitly written quantity and suggest a price-book
match. It may not measure drawing geometry, invent a quantity or price, set
markup or tax, approve an estimate, send a proposal, or create live jobs.
Server-side commands resolve approved price revisions, calculate every amount,
bind approval to one immutable version, and convert accepted work exactly once.

## Terms

- **Bid package:** Plans, specifications, addenda, schedules, and supporting
  images attached to an opportunity before a job exists.
- **Document:** A logical file record. Each uploaded replacement is an
  immutable document version.
- **Extraction:** Embedded PDF text extraction or OCR, stored by page and
  sheet with a content hash.
- **AI proposal:** Append-only, cited suggestions that have no business effect.
- **Estimate:** The opportunity-level commercial container.
- **Estimate version:** An immutable snapshot of lines, clauses, alternates,
  adjustments, totals, and proposed job packages.
- **Price-book revision:** An immutable, human-approved unit and CAD unit price.
- **Job package:** A proposed job, its scope, work areas, and starter tasks
  stored inside an estimate version. It is not a live job.
- **Conversion:** The idempotent command that turns an accepted estimate
  version into one project, its jobs, a project budget, and document links.

## PRD comparison

| Concern | Existing product and PRD | Gap | Amendment in PRD v1.25 |
|---|---|---|---|
| Pre-job files | Survey files live in `leads.files`; operational documents require a `jobId` | An opportunity cannot own a versioned bid package | Add BID-001 through BID-004 and a generic document/version/link model |
| Document processing | Transcription is async; document extraction is named as future durable work | No quarantine, page extraction, OCR status, or citations | Require scan, durable extraction, page/sheet citations, retry, and dead-letter visibility |
| Price book | QTE-003 requires items, assemblies, and templates; the first item book stores a mutable price | A later edit could change the meaning of an old estimate | Require immutable approved price-book revisions and estimate snapshots |
| Estimates | QTE-001 through QTE-006 describe versions, lines, approvals, proposals, and budgets | None of those records exist | Define deterministic commercial records and exact-version lifecycle |
| AI scope | AI-016 covers a request outline; AI-018 covers walkthrough scope lines | Bid-package plans and specifications are not explicit inputs | Expand AI-016 and AI-018 to cited bid-package text and explicit written quantities |
| Job creation | A won opportunity converts to one project and one first job | It is not transactional and cannot create the approved set of jobs | Require accepted-version, multi-job, budget, document, and task conversion |
| Automated takeoff | The PRD excludes automated takeoff from plan geometry | “Estimate from plans” could be misread as geometric measurement | Preserve the exclusion; absent or ambiguous quantities become `Takeoff required` |
| AI governance | The PRD requires narrow tools, exact approvals, citations, and audit | Existing AI citations identify current job records, not immutable pages | Add document-version/page citations, append-only AI proposals, and server rejection of prohibited output |

This design does not replace the PRD. The PRD states the product requirements;
this document defines the implementation contract for the bid-to-job workflow.

## Goals

1. Let an authorized estimator upload a bid package to an opportunity before a
   project or job exists.
2. Preserve every source version and cite file, page, sheet, and text span.
3. Extract useful written scope from text PDFs and scanned pages without
   blocking the web request.
4. Draft job packages, estimate lines, inclusions, exclusions, alternates, and
   open questions from authorized evidence.
5. Price deterministically from a human-selected approved price-book revision.
6. Keep estimate content immutable and make every revision comparable.
7. Bind approval, proposal, and acceptance to the exact content hash.
8. Convert accepted work into the approved project and jobs exactly once.
9. Leave upload, extraction, estimate editing, proposal generation, and job
   management usable when the model is disabled.

## Non-goals

- Measuring areas, lengths, counts, or volumes from drawing geometry.
- Reading DWG, RVT, IFC, or other BIM/CAD authoring formats.
- AI-generated unit prices, markup, overhead, tax, discounts, or approval.
- Treating model confidence as authorization or approval.
- Creating live projects, jobs, tasks, or budgets when a file is uploaded.
- Automatically sending a proposal or recording acceptance without evidence.
- General autonomous bidding, safety sign-off, code compliance, or engineering.
- Change orders; they remain QTE-007 and AI-019 work after the initial estimate.

Initial upload formats remain PDF, JPEG, PNG, and WebP, at the existing 25 MB
per-file limit. Supporting larger sets is an operational limit change, not a
different domain model.

## Users and authority

| Actor | Allowed |
|---|---|
| Office estimator | Upload, review extraction, create/edit estimate versions, apply AI suggestions, select price revisions |
| Administrator/commercial approver | Everything an estimator can do, plus approve, generate a proposal link, record delivery, and confirm conversion |
| Customer proposal recipient | View one unexpired signed proposal; accept or reject that exact proposal |
| Field user | No bid package, pricing, estimate, approval, or proposal access |
| Worker service | Scan, extract, OCR, and run a schema-bound AI proposal within the organization and record scope in its job |
| AI model | Return suggestions and citations only; it receives no business mutation tool |

The initial single-organization deployment uses the seeded organization, but
every new table and query carries `organizationId`. Legacy environment-based
office sessions may use the seeded organization only. They may not choose an
organization from request input.

## End-to-end workflow

### 1. Create or open an opportunity

The opportunity remains the pre-sale aggregate. A source estimate request may
already supply the company, contact, site, services, and public-upload files.
An office user can also create an opportunity manually.

### 2. Upload a bid package

The opportunity page gains **Bid package**. Direct upload uses an authenticated,
object-scoped token and stores:

- Organization and opportunity.
- Logical document and immutable version.
- Kind: `plan`, `specification`, `addendum`, `schedule`, `photo`, or `other`.
- Original filename, media type, byte size, SHA-256, private object key.
- Revision label and optional predecessor version.
- Upload actor and timestamp.
- Quarantine state.

The Blob is not copied when the same version is later linked to an estimate,
project, or job.

### 3. Scan and extract durably

Upload completion writes the document version and an outbox event in one
transaction. The Render worker:

1. Claims the event idempotently.
2. Scans the bytes. Extraction does not start until the version is `clean`.
3. Reads embedded PDF text with `pdfjs-dist`.
4. Renders and OCRs pages whose text layer is absent or too thin.
5. Stores page number, detected sheet label, text, offsets, OCR coordinates
   where available, extractor version, and content hash.
6. Marks the extraction `ready`, `needs_review`, or `failed`.

The worker checkpoints page progress. A restart resumes at the first unfinished
page. Exhausted work enters a dead-letter queue and appears as an operations
exception. The web request never waits for extraction.

### 4. Review extraction

The opportunity page lists each file and status:

```text
Scanning → Extracting 12/43 → Ready
                          ↘ Needs review
                          ↘ Failed · Retry
```

An estimator can open extracted pages beside the original. Correcting a sheet
label or extracted text creates a human correction record; it does not overwrite
machine output. Encrypted, corrupt, unsupported, or malware-positive files show
a reason and never enter the AI evidence pack.

### 5. Request an AI draft

**Draft scope and estimate** builds an authorization-filtered evidence pack:

```text
opportunity
company, contact, site
requested services and survey answers
selected clean document versions
selected extracted page chunks
active approved price-book revisions
existing estimate version, when revising
```

The model returns this schema:

```ts
type BidEstimateProposal = {
  summary: string;
  jobPackages: Array<{
    name: string;
    trade: string;
    scope: string;
    workAreas: Array<{ name: string; kind: string }>;
    tasks: Array<{ title: string; workAreaName: string | null }>;
    citations: DocumentCitation[];
  }>;
  lines: Array<{
    category:
      | "labor"
      | "material"
      | "equipment"
      | "subcontractor"
      | "allowance";
    description: string;
    trade: string;
    location: string | null;
    candidatePriceBookItemIds: string[];
    quantity: { value: string; unit: string } | null;
    quantitySource: "explicit_written" | "manual_required";
    citations: DocumentCitation[];
  }>;
  inclusions: Array<{ text: string; citations: DocumentCitation[] }>;
  exclusions: Array<{ text: string; citations: DocumentCitation[] }>;
  alternates: Array<{ name: string; description: string; citations: DocumentCitation[] }>;
  questions: Array<{ text: string; citations: DocumentCitation[] }>;
};
```

The schema contains no price, cost, markup, overhead rate, tax rate, total,
approval, project ID, or job ID. The server rejects unknown citation hashes,
uncited quantities, non-explicit quantities, and prohibited financial fields.
Prompt-like text inside a document remains untrusted user content.

### 6. Apply suggestions to an estimate version

The AI proposal is append-only and writes nothing to the estimate until the
estimator chooses **Apply selected**. The review UI shows:

- Suggested job packages.
- Suggested estimate lines.
- Original page beside every citation.
- Candidate price-book items, never an automatic price decision.
- `Takeoff required` when no unambiguous written quantity exists.
- Questions and conflicts, especially between base documents and addenda.

The estimator chooses the price-book revision and confirms or enters quantity.
The server then creates a new immutable estimate version. Dismissing a proposal
does not alter the estimate.

### 7. Calculate deterministically

Estimate line quantities use decimal strings stored as `numeric(14,4)`. Money
uses integer CAD cents. Each priced line snapshots:

- Approved price-book item and revision IDs.
- Trade, description, category, unit, quantity.
- Unit price cents.
- Pricing method: `unit`, `fixed`, or `percent`.
- Taxable flag and optional alternate group.
- Server-calculated line total.

For a unit line:

```text
line total cents = round-half-up(quantity × unit price cents)
```

Fixed lines use entered cents. Percentage adjustments store integer basis
points and a defined base-category set. The server calculates overhead, markup,
and tax in a stable order recorded on the version. Alternates are excluded from
the base total unless the version explicitly includes them. Changing or
retiring a price-book item cannot alter an existing estimate version.

### 8. Version and compare

Every save creates the next version number. Content rows are insert-only.
The estimate workspace compares any two versions:

- Added, removed, and changed lines.
- Quantity, unit, selected price revision, and amount differences.
- Clause, alternate, and job-package differences.
- Total difference and approval rule crossed.

AI-017 may explain this deterministic diff. It cannot change or approve either
version.

### 9. Approve the exact version

Approval rules are organization-scoped. The conservative initial rule is:

- Every estimate requires an administrator/commercial approver.
- An approver cannot approve an expired or superseded version.
- The approval stores actor, decision, comment, rule, version content hash, and
  expiration.
- A changed version requires a new approval.

Threshold rules may add a second approver by total, margin policy, discount, or
revision delta. The model never decides whether a threshold is satisfied.

### 10. Generate and deliver a proposal

An approved version can generate a branded immutable PDF and an expiring signed
review link. Generation writes no delivery event. An authorized person performs
**Record delivery** or sends through a separately authorized integration.

Proposal events are append-only: generated, delivered, viewed, accepted,
rejected, expired, and revoked. Acceptance captures the exact proposal and
estimate version, recipient name/email, timestamp, IP/user-agent policy fields,
and attestation text. A proposal that is expired, revoked, or no longer tied to
an approved version cannot be accepted.

### 11. Confirm conversion

Customer acceptance does not silently create operational records. The
administrator sees the exact conversion preview:

```text
Create project: Acme podium insulation
Create 3 jobs:
  - Podium closed-cell spray foam
  - North elevation AVB
  - Structural steel fireproofing
Create 7 work areas and 18 starter tasks
Create approved project budget from estimate v4
Link 5 source document versions
```

**Create project and jobs** sends the accepted proposal ID and an idempotency
key. One database transaction:

1. Locks the acceptance, estimate version, and opportunity.
2. Rechecks approval, expiration, organization, and absence of a completed
   conversion.
3. Creates exactly one project if the opportunity has none.
4. Creates every approved job package, work area, and starter task.
5. Creates the approved budget snapshot and lines.
6. Links the selected document versions to the project and applicable jobs.
7. Updates opportunity/request status.
8. Writes audit/business events and a conversion completion record.
9. Writes the publication outbox events.

Duplicate, concurrent, or replayed requests return the original conversion
result. A failure rolls back every business write.

## Data model

All IDs are UUIDs. Every table below includes `organization_id`, timestamps
where relevant, and indexes beginning with organization scope.

### Documents and extraction

| Table | Purpose |
|---|---|
| `documents` | Logical document identity and owner organization |
| `document_versions` | Immutable Blob object, SHA-256, media metadata, revision, quarantine state |
| `document_links` | Links one document/version to request, opportunity, estimate, project, or job |
| `document_extractions` | Versioned scan/extraction run, status, provider/model, page progress, error |
| `document_pages` | Page number, sheet label, machine text, corrected text, page image metadata |
| `document_chunks` | Bounded text span, offsets/bbox, content hash, retrieval metadata |

`document_links` has a constrained `entityType` and unique
`(document_version_id, entity_type, entity_id, purpose)`. It never grants
access by itself; the read checks the linked entity and organization.

### Price book

| Table | Purpose |
|---|---|
| `price_book_items` | Stable logical item and retired state |
| `price_book_item_versions` | Immutable trade, description, unit, CAD price, approval/effective dates |

The mutable price columns introduced by the first price-book slice remain
during an expand/contract migration, are backfilled into version 1, and stop
being read after the versioned path ships. They are removed only in a later
contract migration after production verification.

### Estimate and proposal

| Table | Purpose |
|---|---|
| `estimates` | Opportunity-level container |
| `estimate_versions` | Immutable version metadata, calculation policy, content hash, totals |
| `estimate_lines` | Versioned commercial lines and price snapshots |
| `estimate_clauses` | Inclusions, exclusions, assumptions |
| `estimate_alternates` | Versioned alternate groups |
| `estimate_job_packages` | Proposed operational jobs inside the version |
| `estimate_job_work_areas` | Proposed work areas |
| `estimate_job_tasks` | Proposed starter tasks |
| `estimate_line_sources` | Manual or document citation source for quantity/scope |
| `commercial_approval_rules` | Organization threshold policy |
| `estimate_approvals` | Exact-version decisions |
| `proposals` | Immutable branded proposal artifact and signed-link state |
| `proposal_events` | Generated/delivered/viewed/accepted/rejected/expired/revoked |
| `estimate_acceptances` | Customer acceptance evidence |
| `estimate_conversions` | Idempotent conversion result and created IDs |
| `project_budgets` | Approved estimate-version budget snapshot |
| `project_budget_lines` | Budget lines copied from approved estimate lines |

Foreign keys prevent a line, approval, proposal, acceptance, or conversion from
crossing organizations. Content hashes cover canonical version content, not
timestamps or mutable lifecycle events.

### Worker and AI audit

| Table | Purpose |
|---|---|
| `outbox_events` | Domain transaction events awaiting publication |
| `background_jobs` | Idempotent job, state, checkpoint, attempts, next run |
| `dead_letter_jobs` | Exhausted job and diagnostic metadata |
| `ai_runs` | Capability, actor/service, provider/model, template/schema versions, token/cost/latency |
| `ai_proposals` | Append-only validated output and content hash |
| `ai_citations` | Proposal item to immutable document version/page/span |
| `ai_tool_executions` | Authorized reads and proposal/application commands |

No table stores hidden chain-of-thought.

## Citation contract

```ts
type DocumentCitation = {
  documentVersionId: string;
  pageNumber: number;
  sheetLabel: string | null;
  chunkId: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
  bbox: { x: number; y: number; width: number; height: number } | null;
};
```

A citation renders only when:

- The session can read the opportunity and document version.
- The version and chunk belong to the same organization.
- Page, offsets, and hash match stored extraction output.
- The proposal item used that citation at generation time.

Human-corrected text is visibly labeled and keeps the machine value.

## Command boundaries

| Command | Effect |
|---|---|
| `UploadBidDocument` | Store clean metadata in quarantine and enqueue scan |
| `CompleteDocumentScan` | Worker-only transition to clean/rejected |
| `CompleteDocumentExtraction` | Worker-only insert of immutable page/chunk output |
| `CreateBidEstimateProposal` | Append-only AI run, proposal, and citations |
| `ApplyBidEstimateProposal` | Create a new estimate version from selected suggestions |
| `CreateEstimateVersion` | Manual path using the same validators and calculator |
| `ApproveEstimateVersion` | Bind approval to exact content hash and rule |
| `GenerateProposal` | Create immutable PDF/link; do not send |
| `RecordProposalDelivery` | Human/integration action with audit evidence |
| `RecordProposalDecision` | Customer signed-link action for exact proposal |
| `ConvertAcceptedEstimate` | Atomic, idempotent project/jobs/budget/document conversion |

Each command independently authorizes, validates organization scope, checks
optimistic versions, and emits business/audit events. The AI gateway never
receives these mutation commands.

## Manual and disabled operation

- Upload, extraction status, estimate editing, calculator, versioning,
  approval, proposal, and conversion are normal domain workflows.
- If AI is disabled, the estimator adds lines and job packages manually.
- If OCR is disabled, embedded-text PDFs still extract. Image-only pages show
  `OCR unavailable` and remain manually reviewable.
- If the worker is unavailable, uploads remain queued and can be retried; the
  existing opportunity and job workflows stay available.
- Demo mode uses deterministic extracted pages and proposal fixtures and makes
  no provider call.

## Security and privacy

- Every new query starts with organization scope and record authorization.
- Field sessions cannot access bid packages or commercial records.
- Upload tokens are short-lived, object-scoped, and bound to organization and
  opportunity.
- Files stay quarantined until scan success. Malware-positive files are not
  rendered, extracted, or sent to a model.
- Provider calls receive only selected clean pages. Logs redact file content.
- Extracted document instructions cannot change system policy, permissions,
  tool schemas, or recipient scope.
- Signed proposal tokens are stored as hashes, expire, can be revoked, and
  reveal only one proposal.
- Pricing, approval, proposal, document, AI, export, acceptance, and conversion
  actions write append-only audit events.
- Object storage and AI/OCR providers must satisfy the accepted Canadian data
  residency and transfer policy before production enablement.

## Failure and edge cases

| Scenario | Required behavior |
|---|---|
| Duplicate file upload | Keep one version per unique organization/document SHA or show the existing version; never enqueue duplicate extraction work |
| Replacement/addendum | Store a new immutable version or linked addendum; do not overwrite base pages |
| Encrypted/corrupt PDF | Mark `needs_review` or `failed` with a safe reason; allow replacement |
| Image-only plan | OCR page by page; show progress and provider confidence |
| Conflicting quantity | Create no quantity; show both citations and an estimator question |
| Quantity inferred from scale/geometry | Reject it as unsupported and set `manual_required` |
| Quantity has no unit | Keep the cited text as a question; do not price |
| Price item retired after draft | Existing version keeps its snapshot; new version requires an active approved revision or explicit approver override |
| Price changes during review | New estimate version uses the selected new revision; old version and proposal remain unchanged |
| AI emits price/total/approval | Schema validation fails the proposal and writes no estimate version |
| AI cites another organization | Citation validation drops the item and records a security failure metric |
| Approval expires or content changes | Proposal generation and conversion refuse it |
| Proposal viewed after expiry/revocation | Show unavailable; write no acceptance |
| Acceptance submitted twice | Return the original acceptance |
| Conversion submitted concurrently | One transaction wins; all callers receive the same project/job IDs |
| Opportunity already converted | Initial estimate conversion refuses; future changes use QTE-007, not a second initial project |
| Worker stops mid-document | Resume from checkpoint without duplicate pages/chunks |
| Provider/model unavailable | Retry within budget, then dead-letter; manual workflow stays available |

## Observability and quality

Measure:

- Scan, extraction, OCR, and proposal latency and failure rates.
- Pages processed and OCR percentage.
- AI proposal acceptance, per-field correction, dismissal, and unsupported
  quantity rates.
- Price-book candidate acceptance rate; never model-generated price accuracy.
- Estimate revision count, approval cycle, proposal acceptance, and conversion
  replay rate.
- Extraction/AI provider usage and cost by organization and capability.
- Cross-organization authorization failures and citation-validation failures.

The evaluation set contains representative text PDFs, image scans, addenda,
conflicting specifications, prompt injection, missing quantities, wrong units,
and cross-organization fixtures. Production enablement requires all prohibited
price/geometry/authorization cases to be rejected.

## Delivery phases

1. **Security and execution foundation:** organization scope, permission checks,
   audit events, Render worker, outbox, retries, and dead-letter visibility.
2. **Bid-package documents:** generic document versions/links, secure upload,
   quarantine, extraction, OCR, and citations.
3. **Commercial foundation:** immutable approved price revisions, deterministic
   estimate versions, lines, clauses, alternates, job packages, and comparison.
4. **Approval and proposal:** exact-version rules, branded artifact, signed
   review, delivery/view/decision events.
5. **Accepted conversion:** atomic multi-job, budget, document-link, and event
   transaction.
6. **Commercial AI:** cited AI-016/AI-018 proposal, review/apply, evaluation,
   feature flag, and monitored rollout.

AI is last because it drafts records that must already have a secure manual
workflow.

## Acceptance criteria

- An estimator uploads a private PDF to an opportunity with no project or job.
- Upload writes no estimate, project, job, task, budget, or price decision.
- Clean text PDFs and scanned pages reach `ready` through a restart-safe worker.
- Every visible extracted claim links to the immutable file, page, and sheet.
- A malware-positive file is never rendered, extracted, or sent to AI.
- AI output with an uncited or geometric quantity, price, markup, tax, total,
  approval, or live entity ID is rejected.
- Missing or ambiguous quantity displays `Takeoff required`.
- A person can create and price the same estimate with AI disabled.
- Every estimate edit creates a new immutable version.
- Changing a price-book item does not alter an existing estimate.
- Every amount is reproducible from stored quantity, price snapshot, rounding,
  adjustment, and tax policy.
- Approval, proposal, and acceptance reference the exact version hash.
- Proposal generation does not send it.
- A duplicate acceptance or conversion creates no duplicate records.
- One confirmed conversion creates exactly one project, the approved number of
  jobs/work areas/tasks, one approved budget, and the selected document links.
- A conversion failure leaves none of those records partially created.
- Field, logged-out, expired-link, and cross-organization requests reveal no
  commercial content or metadata.
- Worker/provider failure leaves manual CRM, estimate, proposal, and job
  workflows available.

## Product success measures

- Median time from complete bid-package upload to first estimator-ready draft.
- Percentage of draft lines with a valid source citation.
- Percentage of AI quantities accepted without correction.
- Percentage of lines requiring manual takeoff.
- Estimator time from extraction ready to approved version.
- Proposal acceptance-to-job conversion time.
- Estimate accuracy versus approved budget and later actual cost.

These metrics evaluate workflow quality. They do not authorize autonomous
pricing, approval, or job creation.
