# AI Bid Package, Estimating, and Job Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an estimator upload a private pre-job bid package, review cited
extraction and AI suggestions, approve an immutable deterministic estimate,
deliver a proposal, and convert accepted work into the exact approved project
and jobs once.

**Architecture:** Build secure manual commercial records before enabling AI.
Opportunity-level immutable documents are scanned and extracted by a durable
Render worker through a transactional outbox. Estimate versions snapshot
approved price revisions and server-calculated CAD amounts. AI writes only an
append-only cited proposal; humans select and apply suggestions. Approval,
proposal, acceptance, and conversion bind to one version hash, and conversion
creates all operational records in one idempotent transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle
ORM/PostgreSQL, Vercel Blob private storage, Render background worker,
pg-boss, `pdfjs-dist`, `@napi-rs/canvas`, Vercel AI Gateway, `pdf-lib`, Zod 4,
Vitest, Tailwind 4, existing shadcn/ui components.

---

## Source requirements

- PRD: `docs/strongfoam-crm-erp-prd.md`, EST-006, EST-008, EST-010,
  JOB-001 through JOB-003, QTE-001 through QTE-006, BID-001 through BID-015,
  DOC-002 through DOC-004, AI-016 through AI-018, RT-004 through RT-006.
- Design:
  `docs/superpowers/specs/2026-09-22-ai-bid-package-estimating-design.md`.
- Existing opportunity and conversion:
  - `src/app/app/opportunities/[id]/page.tsx`
  - `src/app/app/jobs/convert-form.tsx`
  - `src/app/app/jobs/actions.ts`
  - `src/lib/ops/jobs.ts`
  - `src/lib/ops/store.ts`
  - `src/lib/ops/demo-store.ts`
- Existing file flows:
  - `src/components/estimate-survey/estimate-survey.tsx`
  - `src/components/ops/job-document-uploader.tsx`
  - `src/app/api/uploads/route.ts`
  - `src/app/api/ops/job-uploads/route.ts`
  - `src/lib/leads/uploads.ts`
  - `src/lib/ops/job-workspace.ts`
- Existing AI and PDF utilities:
  - `src/lib/ops/ai-gateway.ts`
  - `src/lib/ops/ai-evidence.ts`
  - `src/components/ops/plan-sheet.tsx`
  - `src/components/ops/plan-marked-up-export.ts`
- Before implementing a new App Router route, server action, or client
  component, read the corresponding guide in
  `node_modules/next/dist/docs/01-app/03-api-reference/`.

## Global constraints

- Upload creates no estimate, project, job, task, budget, price decision, or
  proposal.
- Geometric drawing measurement is out of scope. Only verbatim, unambiguous
  written quantities may be proposed.
- AI never supplies unit price, fixed price, percentage, markup, overhead, tax,
  discount, total, approval, project ID, or job ID.
- Every new business table and query is organization-scoped.
- Field sessions cannot access commercial records.
- Documents, estimate content, approved price revisions, AI proposals,
  approvals, proposal events, acceptances, conversion results, and audit
  records are append-only.
- Blob objects stay private and quarantined until scan success.
- Every AI citation binds to immutable document version, page, chunk, offsets,
  and content hash.
- Pricing and totals use server code only. Quantities use decimal strings;
  money uses integer CAD cents.
- Any estimate edit creates a new version. No update statement may alter
  version content.
- Proposal generation does not send it.
- Customer acceptance does not create operational records. An authorized
  internal user confirms the exact conversion preview.
- Conversion is one database transaction and is idempotent by acceptance ID.
- Model, OCR, scanner, worker, or email failure cannot disable manual CRM,
  estimating, proposal, or job workflows.
- Use test-first steps and one logical commit per task.
- Do not stage `.playwright-mcp/`.

## Commit convention

Every commit uses:

```bash
GIT_AUTHOR_NAME="makemoney2023" \
GIT_AUTHOR_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
GIT_COMMITTER_NAME="makemoney2023" \
GIT_COMMITTER_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
git commit -m "Commit message"

git log -1 --format='%an <%ae>'
```

The check must print:

```text
makemoney2023 <124006256+makemoney2023@users.noreply.github.com>
```

## Migration sequence

| Migration | Purpose |
|---|---|
| `0018_organization_scope_audit.sql` | Add organization scope on the commercial path and append-only audit events |
| `0019_background_execution.sql` | Outbox, background jobs, checkpoints, and dead letters |
| `0020_commercial_documents.sql` | Generic documents, immutable versions/links, extraction pages/chunks |
| `0021_price_book_versions.sql` | Immutable approved price-book revisions |
| `0022_estimates.sql` | Estimates, immutable versions, lines, clauses, alternates, and job packages |
| `0023_estimate_approvals_proposals.sql` | Approval rules, approvals, proposal artifacts/events, and acceptance |
| `0024_estimate_conversion.sql` | Conversion result, project budgets, and budget lines |
| `0025_commercial_ai.sql` | AI runs, proposals, citations, and tool executions |

Each migration is additive. Do not drop the first price-book price columns in
this plan; stop reading them after backfill and schedule a separately observed
contract migration.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/ops/commercial-authorization.ts` | Organization and commercial permission checks |
| `src/lib/ops/commercial-authorization.test.ts` | Office/admin/field/cross-organization cases |
| `src/lib/ops/audit.ts` | Append-only audit event writer and redaction |
| `src/lib/ops/background-jobs.ts` | Outbox claim, checkpoint, retry, dead-letter domain |
| `src/lib/ops/background-jobs.test.ts` | Idempotency, retry budget, checkpoint behavior |
| `src/worker/index.ts` | pg-boss worker entry and graceful shutdown |
| `src/worker/handlers/scan-document.ts` | Quarantined file scanning |
| `src/worker/handlers/extract-document.ts` | PDF text, page render, OCR, and chunks |
| `src/worker/handlers/draft-bid-estimate.ts` | Commercial AI proposal orchestration |
| `src/lib/ops/commercial-documents.ts` | Upload parsing, versions, links, extraction status, citations |
| `src/lib/ops/commercial-documents.test.ts` | Version, hash, link, and citation validation |
| `src/lib/ops/document-scanner.ts` | ClamAV adapter contract |
| `src/lib/ops/document-extraction.ts` | PDF text/OCR adapter and bounded chunking |
| `src/lib/ops/document-extraction.test.ts` | Text PDF, scan, encrypted, restart cases |
| `src/app/api/ops/opportunity-uploads/route.ts` | Authenticated direct-upload token/callback |
| `src/app/api/ops/opportunity-uploads/route.test.ts` | Token scope and callback cleanup |
| `src/components/ops/bid-package-uploader.tsx` | Opportunity upload UI |
| `src/components/ops/bid-package-panel.tsx` | Status, retry, version, extraction review |
| `src/lib/ops/price-book.ts` | Logical items and approved revisions |
| `src/lib/ops/price-book.test.ts` | Revision immutability and approved lookup |
| `src/lib/ops/estimate-calculator.ts` | Decimal, cents, rounding, adjustments, totals |
| `src/lib/ops/estimate-calculator.test.ts` | Exact financial vectors |
| `src/lib/ops/estimates.ts` | Estimate inputs, canonical hash, immutable version and diff |
| `src/lib/ops/estimates.test.ts` | Version immutability, hash, diff, source validation |
| `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx` | Estimate workspace |
| `src/app/app/opportunities/[id]/estimates/actions.ts` | Version, approval, proposal, conversion actions |
| `src/components/ops/estimate-editor.tsx` | Manual line, clause, alternate, and job-package editing |
| `src/components/ops/estimate-version-diff.tsx` | Deterministic revision comparison |
| `src/lib/ops/commercial-ai-evidence.ts` | Authorized document/price-book evidence pack |
| `src/lib/ops/commercial-ai-evidence.test.ts` | Scope, caps, citation allow-list |
| `src/lib/ops/commercial-ai.ts` | Strict gateway schema and prohibited-output rejection |
| `src/lib/ops/commercial-ai.test.ts` | Injection, geometry, financial, citation rejection |
| `src/components/ops/bid-estimate-proposal.tsx` | Cited suggestion review and selection |
| `src/lib/ops/estimate-approvals.ts` | Rule evaluation and exact-version approval |
| `src/lib/ops/estimate-approvals.test.ts` | Stale, expired, self/cross-org rejection |
| `src/lib/ops/proposals.ts` | PDF, signed token, lifecycle, decision validation |
| `src/lib/ops/proposals.test.ts` | Expiry, revoke, duplicate decision |
| `src/app/proposals/[token]/page.tsx` | Narrow public proposal review |
| `src/app/proposals/[token]/actions.ts` | Exact proposal accept/reject |
| `src/lib/ops/estimate-conversion.ts` | Preview and transactional idempotent conversion |
| `src/lib/ops/estimate-conversion.test.ts` | Multi-job, rollback, replay, concurrency |
| `src/lib/ops/commercial-evaluation.test.ts` | Representative AI policy evaluation set |
| `src/lib/ops/store.ts` | PostgreSQL reads and transaction commands |
| `src/lib/ops/demo-store.ts` | Deterministic manual and AI demo parity |
| `src/lib/ops/demo-data.ts` | Bid package, estimate, proposal, and extraction fixtures |
| `src/db/schema.ts` | New organization, worker, document, commercial, AI, and budget tables |

## Requirement traceability

| Requirement | Implemented by |
|---|---|
| EST-011, BID-001, BID-002 | Task 3 |
| EST-012, BID-003 through BID-005 | Tasks 2 and 4 |
| EST-013, BID-006 through BID-008 | Tasks 7, 11, 12, and 13 |
| QTE-001 through QTE-003, BID-009 through BID-011 | Tasks 5 through 7 |
| QTE-004, BID-012 | Task 8 |
| QTE-005, BID-012 | Task 9 |
| EST-014, QTE-006, BID-013, BID-014 | Task 10 |
| EST-015, BID-015 | Tasks 1, 7, 11 through 15 |
| AI-016, AI-018 | Tasks 11 through 13 |
| RT-004 through RT-006 | Tasks 1, 2, 10, and 14 |

---

## Phase A — Security and durable execution

### Task 1: Scope the commercial path to an organization

**Files:**
- Create: `src/lib/ops/commercial-authorization.ts`
- Create: `src/lib/ops/commercial-authorization.test.ts`
- Create: `src/lib/ops/audit.ts`
- Modify: `src/lib/ops/auth.ts`
- Modify: `src/lib/ops/identity.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0018_organization_scope_audit.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Write failing authorization tests**

Cover:

```ts
expect(resolveCommercialAccess(adminSession, "estimate.approve")).toEqual({
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
});
expect(resolveCommercialAccess(officeSession, "estimate.edit").ok).toBe(true);
expect(resolveCommercialAccess(officeSession, "estimate.approve").ok).toBe(false);
expect(resolveCommercialAccess(fieldSession, "estimate.read").ok).toBe(false);
expect(assertSameOrganization("org-a", "org-b").ok).toBe(false);
```

Also assert that a legacy estimator session resolves only to
`STRONG_FOAM_ORGANIZATION_ID` and cannot pass an organization from form data.

- [x] **Step 2: Run the tests and verify failure**

Run:

```bash
npx vitest run src/lib/ops/commercial-authorization.test.ts
```

Expected: FAIL because the module does not exist.

- [x] **Step 3: Add explicit permissions**

Use:

```ts
export const COMMERCIAL_PERMISSIONS = [
  "estimate.read",
  "estimate.edit",
  "estimate.approve",
  "proposal.deliver",
  "estimate.convert",
] as const;

const ROLE_PERMISSIONS = {
  administrator: COMMERCIAL_PERMISSIONS,
  office: ["estimate.read", "estimate.edit"],
  field_lead: [],
  field_worker: [],
} as const;
```

All server actions call the permission function; UI visibility is not an
authorization check.

- [x] **Step 4: Add organization scope and audit schema**

Migration `0018` must:

1. Add `organization_id` to `leads`, `companies`, `contacts`, `sites`,
   `opportunities`, `projects`, `jobs`, `job_documents`, and
   `price_book_items`.
2. Backfill the seeded organization.
3. Add organization foreign keys and scoped indexes.
4. Make the columns non-null after backfill.
5. Create `audit_events` with actor/service, action, entity type/id, result,
   correlation ID, redacted payload, and timestamp.

Add a store helper whose first argument is organization:

```ts
export async function getAuthorizedOpportunity(
  organizationId: string,
  opportunityId: string,
): Promise<OpportunityRow | null>;
```

- [x] **Step 5: Make audit writes append-only**

`recordAuditEvent` accepts only inserts. Ordinary store code exposes no update
or delete function for `audit_events`. Redact signed tokens, file bytes, raw
document text, provider keys, and passwords before insert.

- [x] **Step 6: Run focused and full checks**

```bash
npx vitest run src/lib/ops/commercial-authorization.test.ts src/lib/ops/auth.test.ts
npx tsc --noEmit
npm test
```

Expected: all pass.

- [x] **Step 7: Commit**

Commit message: `Scope commercial records and audit to an organization.`

### Task 2: Add outbox-backed background execution

**Files:**
- Create: `src/lib/ops/background-jobs.ts`
- Create: `src/lib/ops/background-jobs.test.ts`
- Create: `src/worker/index.ts`
- Create: `src/worker/registry.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0019_background_execution.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `README.md`

- [x] **Step 1: Write failing state-machine tests**

Assert:

```ts
expect(completeJob(claimJob(job, "worker-1"), "worker-1").status).toBe("completed");
expect(retryJob(failedJob, fixedNow).status).toBe("queued");
expect(exhaustJob({ ...failedJob, attempts: 5 }).status).toBe("dead_letter");
expect(checkpointJob(job, { page: 12 }).checkpoint).toEqual({ page: 12 });
```

The same idempotency key returns the existing background job.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/background-jobs.test.ts
```

- [x] **Step 3: Add schema and pure state transitions**

Create organization-scoped `outbox_events`, `background_jobs`, and
`dead_letter_jobs`. Enforce unique `(organization_id, idempotency_key)`.
Statuses are `queued`, `running`, `retry_wait`, `completed`, `dead_letter`,
and `cancelled`.

- [x] **Step 4: Add the worker process**

Install latest packages:

```bash
npm install pg-boss tsx @napi-rs/canvas
```

Add scripts:

```json
{
  "worker": "tsx src/worker/index.ts"
}
```

The worker starts pg-boss, registers handlers from `registry.ts`, records a
heartbeat, handles `SIGTERM`, stops claiming work, waits for active handlers,
and exits cleanly. It uses `DATABASE_URL` and never imports a client component.

- [x] **Step 5: Add transactional enqueue**

Provide:

```ts
export async function writeOutbox(
  tx: DbTransaction,
  event: {
    organizationId: string;
    kind: string;
    aggregateType: string;
    aggregateId: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  },
): Promise<void>;
```

The business write and outbox insert use the same transaction.

- [x] **Step 6: Test restart, retry, and dead-letter behavior**

Use a handler that fails after checkpoint page 2, restarts, resumes page 3,
then exhausts a second fixture. Assert no duplicate effect.

- [x] **Step 7: Run checks and commit**

```bash
npx vitest run src/lib/ops/background-jobs.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Add durable outbox-backed worker execution.`

---

## Phase B — Bid-package documents

### Task 3: Add immutable opportunity documents and secure upload

**Files:**
- Create: `src/lib/ops/commercial-documents.ts`
- Create: `src/lib/ops/commercial-documents.test.ts`
- Create: `src/app/api/ops/opportunity-uploads/route.ts`
- Create: `src/app/api/ops/opportunity-uploads/route.test.ts`
- Create: `src/components/ops/bid-package-uploader.tsx`
- Create: `src/components/ops/bid-package-panel.tsx`
- Modify: `src/app/app/opportunities/[id]/page.tsx`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0020_commercial_documents.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Write failing document-domain tests**

Cover kind validation, immutable revision numbering, allowed signatures,
organization-bound links, duplicate SHA handling, and citation rejection:

```ts
expect(parseBidDocumentInput(validPdf).ok).toBe(true);
expect(nextDocumentVersion(existingVersions)).toBe(3);
expect(validateCitation(citation, wrongOrganization).ok).toBe(false);
expect(isOwnedOpportunityPath("org-a", "opp-a", validPath)).toBe(true);
expect(isOwnedOpportunityPath("org-a", "opp-b", validPath)).toBe(false);
```

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/commercial-documents.test.ts
```

- [x] **Step 3: Add document schema**

Create `documents`, `document_versions`, `document_links`,
`document_extractions`, `document_pages`, and `document_chunks` exactly as
defined in the design. A version starts `quarantined`. `document_versions`
has a unique `(organization_id, sha256)` index after scan computes the hash.

- [x] **Step 4: Add direct upload callback**

Mirror the job upload route but bind the token to:

```ts
type OpportunityUploadPayload = {
  organizationId: string;
  opportunityId: string;
  documentId: string | null;
  kind: "plan" | "specification" | "addendum" | "schedule" | "photo" | "other";
  revisionLabel: string | null;
  filename: string;
  actor: string;
};
```

The callback rechecks the live session, organization, opportunity, Blob
metadata, content type, and owned path. In one transaction it records the
quarantined version and enqueues `document.scan`. If record creation fails, it
deletes the orphaned Blob.

- [x] **Step 5: Add demo and opportunity UI parity**

`BidPackageUploader` supports PDF/JPEG/PNG/WebP, 5 files, 25 MB each. The panel
shows filename, kind, revision, uploader, scan/extraction status, retry, and
private download. Demo bytes live in the existing in-memory byte-store pattern.

- [x] **Step 6: Add route and cross-organization tests**

Assert unauthenticated, field, wrong organization, invalid path, missing
opportunity, forged actor, oversize, and MIME mismatch all fail without a
document row.

- [x] **Step 7: Run checks and browser-verify**

```bash
npx vitest run src/lib/ops/commercial-documents.test.ts src/app/api/ops/opportunity-uploads/route.test.ts
npx tsc --noEmit
npm test
```

In demo mode, upload a PDF to an opportunity with no project, refresh, and
confirm no project or job was created.

- [x] **Step 8: Commit**

Commit message: `Add private bid packages before job creation.`

### Task 4: Scan, extract, OCR, and cite document pages

**Files:**
- Create: `src/lib/ops/document-scanner.ts`
- Create: `src/lib/ops/document-scanner.test.ts`
- Create: `src/lib/ops/document-extraction.ts`
- Create: `src/lib/ops/document-extraction.test.ts`
- Create: `src/worker/handlers/scan-document.ts`
- Create: `src/worker/handlers/extract-document.ts`
- Create: `src/components/ops/document-extraction-review.tsx`
- Modify: `src/components/ops/bid-package-panel.tsx`
- Modify: `src/worker/registry.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `.env.example`

- [x] **Step 1: Write scanner and extraction tests**

Fixtures cover:

- Clean embedded-text PDF.
- Image-only page requiring OCR.
- Encrypted/corrupt PDF.
- Malware-positive scanner result.
- Page checkpoint restart.
- Human sheet-label/text correction preserving machine text.
- Chunk boundary and content-hash stability.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/document-scanner.test.ts src/lib/ops/document-extraction.test.ts
```

- [x] **Step 3: Implement quarantine scan**

`document-scanner.ts` exposes:

```ts
export interface MalwareScanner {
  scan(input: AsyncIterable<Uint8Array>): Promise<
    | { status: "clean"; engine: string }
    | { status: "infected"; engine: string; signature: string }
    | { status: "failed"; message: string }
  >;
}
```

Production uses an authenticated private ClamAV service configured by
`CLAMAV_HOST` and `CLAMAV_PORT`. If scanner configuration is absent outside
demo, the version stays quarantined and extraction is not enqueued.

- [x] **Step 4: Implement PDF text and OCR**

Use `pdfjs-dist` for embedded text. Pages below the configured text threshold
render through `@napi-rs/canvas` and are sent to the model configured by
`AI_DOCUMENT_MODEL`. The OCR response is strict page JSON containing text,
sheet label, and optional normalized bounding boxes. Validate page numbers and
text length before insert.

- [x] **Step 5: Implement bounded chunks and citations**

Chunks are 800–1,500 characters, never cross a page, and retain page offsets
and content hash. Export the exact `DocumentCitation` contract from the design.
`validateDocumentCitation` checks authorization, organization, version, page,
chunk, offsets, and hash.

- [x] **Step 6: Add worker handlers and UI**

`scan-document` transitions quarantined → clean/rejected and enqueues
`document.extract` only when clean. `extract-document` checkpoints each page.
The review component displays original page, machine text, correction, sheet
label, and retry/error state.

- [x] **Step 7: Run checks and browser-verify**

```bash
npx vitest run src/lib/ops/document-scanner.test.ts src/lib/ops/document-extraction.test.ts
npx tsc --noEmit
npm test
```

Use demo fixtures to verify `Scanning → Extracting → Ready`, page citations,
correction labels, failed retry, and no AI/provider network call in demo.

- [x] **Step 8: Commit**

Commit message: `Extract cited bid-package pages durably.`

---

## Phase C — Deterministic commercial records

### Task 5: Version and approve price-book prices

**Files:**
- Modify: `src/lib/ops/price-book.ts`
- Modify: `src/lib/ops/price-book.test.ts`
- Modify: `src/app/app/price-book/actions.ts`
- Modify: `src/app/app/price-book/price-book-dialog.tsx`
- Modify: `src/app/app/price-book/page.tsx`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0021_price_book_versions.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Extend tests before changing schema**

Assert:

```ts
const v1 = approvePriceRevision(draftRevision({ unitPriceCents: 18500 }));
const v2 = approvePriceRevision(draftRevision({ unitPriceCents: 19200 }));
expect(v1.unitPriceCents).toBe(18500);
expect(v2.versionNumber).toBe(v1.versionNumber + 1);
expect(updateApprovedRevision(v1)).toEqual({ ok: false, error: "immutable" });
expect(listApprovedPriceRevisions(retiredItem.id)).toContainEqual(v1);
```

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/price-book.test.ts
```

- [x] **Step 3: Add immutable revision schema and backfill**

Create `price_book_item_versions` with organization, item, version number,
trade, description, unit, unit price cents, status, effective timestamps,
creator, approver, approval timestamp, and content hash. Backfill each current
item as approved version 1. Add `current_approved_version_id` to the logical
item.

- [x] **Step 4: Split draft and approval actions**

Office users create a draft revision. Administrators approve it. Estimate
queries return only active approved revisions. Retiring a logical item hides it
from new estimates and does not invalidate old revision references.

- [x] **Step 5: Run checks and browser-verify**

```bash
npx vitest run src/lib/ops/price-book.test.ts src/lib/ops/search.test.ts
npx tsc --noEmit
npm test
```

Create a revision, approve it as admin, retire the item, and confirm both
approved revisions remain readable.

- [x] **Step 6: Commit**

Commit message: `Preserve approved price-book revisions.`

### Task 6: Build the immutable estimate and calculator domain

**Files:**
- Create: `src/lib/ops/estimate-calculator.ts`
- Create: `src/lib/ops/estimate-calculator.test.ts`
- Create: `src/lib/ops/estimates.ts`
- Create: `src/lib/ops/estimates.test.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0022_estimates.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Write exact financial vector tests**

Cover decimal quantity, fixed line, percentage adjustment, tax, allowance,
excluded alternate, included alternate, and half-up rounding:

```ts
expect(calculateUnitLine({ quantity: "2.5000", unitPriceCents: 18500 })).toBe(46250);
expect(calculateBasisPoints(46250, 1250)).toBe(5781);
expect(calculateBasisPoints(1, 5000)).toBe(1);
```

Assert negative quantity, excessive precision, unknown price revision, and
client-supplied line total fail.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/estimate-calculator.test.ts src/lib/ops/estimates.test.ts
```

- [x] **Step 3: Implement the calculator**

Use parsed decimal strings, integer cents, and explicit half-up rounding.
Export:

```ts
calculateEstimate(input: EstimateCalculationInput): {
  lines: CalculatedEstimateLine[];
  baseSubtotalCents: number;
  alternateTotalCents: number;
  overheadCents: number;
  markupCents: number;
  taxCents: number;
  totalCents: number;
};
```

Ignore any totals in request/model input.

- [x] **Step 4: Add immutable estimate schema**

Create the estimate, version, line, clause, alternate, job package, work area,
task, and source tables from the design. Content tables expose insert/select
only. Canonical JSON sorts rows by stable sort order and IDs; SHA-256 produces
`content_hash`.

- [x] **Step 5: Implement create-next-version and deterministic diff**

`createEstimateVersion` validates every selected price revision and citation,
calculates totals, inserts all content in one transaction, and assigns the next
version while locking the estimate container. `compareEstimateVersions`
returns added/removed/changed lines, clauses, alternates, job packages, and
totals.

- [x] **Step 6: Add demo parity and tests**

Demo fixtures contain a spray-foam line, AVB line, inclusion, exclusion,
alternate, two job packages, and citations. Attempting to mutate version
content must fail in both stores.

- [x] **Step 7: Run checks and commit**

```bash
npx vitest run src/lib/ops/estimate-calculator.test.ts src/lib/ops/estimates.test.ts src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Add immutable deterministic estimate versions.`

### Task 7: Ship the manual estimate workspace first

**Files:**
- Create: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Create: `src/app/app/opportunities/[id]/estimates/actions.ts`
- Create: `src/app/app/opportunities/[id]/estimates/actions.test.ts`
- Create: `src/components/ops/estimate-editor.tsx`
- Create: `src/components/ops/estimate-version-diff.tsx`
- Create: `src/components/ops/estimate-job-packages.tsx`
- Modify: `src/app/app/opportunities/[id]/page.tsx`
- Modify: `src/lib/ops/search.ts`
- Modify: `src/lib/ops/recent.ts`

- [x] **Step 1: Write action tests**

Test unauthenticated, field, wrong organization, invalid price revision,
client-supplied total, stale base version, successful new version, and discard.
Successful save creates one version and no project/job.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/app/app/opportunities/[id]/estimates/actions.test.ts
```

- [x] **Step 3: Add estimate routes and editor**

Opportunity shows **Estimates** and **Create estimate**. The workspace has:

- Version selector and compare.
- Lines grouped by category.
- Price-book revision picker.
- Decimal quantity/unit, fixed, and percentage methods.
- Inclusions, exclusions, assumptions, alternates.
- Job packages, work areas, starter tasks.
- Source citation picker.
- Totals calculated from server preview and confirmed by save.

Each save says **Create version N**; no UI implies in-place editing.

- [x] **Step 4: Add search/recent integration**

Add `estimate` to `SearchHitKind`. Search title, estimate number, opportunity,
and company. Recent item path recognizes the estimate route.

- [x] **Step 5: Run checks and browser-verify AI-off workflow**

```bash
npx vitest run src/app/app/opportunities/[id]/estimates/actions.test.ts src/lib/ops/estimates.test.ts src/lib/ops/search.test.ts
npx tsc --noEmit
npm test
```

With gateway variables unset, create estimate v1, add a line and two job
packages, create v2, compare v1/v2, and confirm no project/job exists.

- [x] **Step 6: Commit**

Commit message: `Add the manual estimate version workspace.`

---

## Phase D — Approval, proposal, and acceptance

### Task 8: Bind approval to an exact estimate version

**Files:**
- Create: `src/lib/ops/estimate-approvals.ts`
- Create: `src/lib/ops/estimate-approvals.test.ts`
- Create: `src/components/ops/estimate-approval-panel.tsx`
- Modify: `src/app/app/opportunities/[id]/estimates/actions.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0023_estimate_approvals_proposals.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Write rule and approval tests**

Cover administrator permission, wrong organization, stale hash, superseded
version, expired decision, rejection, second-approver threshold, and replay.
Default organization rule requires one administrator for every estimate.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/estimate-approvals.test.ts
```

- [x] **Step 3: Add approval records and evaluator**

`evaluateApprovalRules` is pure and returns required decisions. Approval input
contains estimate version ID and expected hash; the command reloads and
compares both before insert. It never accepts a rule result from the browser.

- [x] **Step 4: Add approval UI**

Show exact version, total, changes, applicable rule, expiry, approver, comment,
approve, and reject. A new estimate version invalidates use of the prior
approval without deleting it.

- [x] **Step 5: Run checks and commit**

```bash
npx vitest run src/lib/ops/estimate-approvals.test.ts src/app/app/opportunities/[id]/estimates/actions.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Approve exact immutable estimate versions.`

### Task 9: Generate, deliver, view, and decide a proposal

**Files:**
- Create: `src/lib/ops/proposals.ts`
- Create: `src/lib/ops/proposals.test.ts`
- Create: `src/components/ops/proposal-panel.tsx`
- Create: `src/app/proposals/[token]/page.tsx`
- Create: `src/app/proposals/[token]/actions.ts`
- Create: `src/app/proposals/[token]/actions.test.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/actions.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`

- [x] **Step 1: Write proposal lifecycle tests**

Assert generation requires current approval, writes no delivered event, token
storage uses SHA-256 rather than plaintext, first view writes one viewed event,
revoked/expired tokens reveal no proposal, and accept/reject is idempotent.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/proposals.test.ts src/app/proposals/[token]/actions.test.ts
```

- [x] **Step 3: Generate the branded immutable PDF**

Use existing `pdf-lib`. Render company/site, estimate number/version, base
scope, lines, alternates, inclusions, exclusions, total, expiry, and acceptance
terms. Store the PDF privately, its SHA-256, exact estimate version/hash, and a
hashed 32-byte random review token.

- [x] **Step 4: Add narrow signed review**

The public route reads only one unexpired, unrevoked proposal. It records view
once per bounded event policy and exposes accept/reject with recipient name,
email, and attestation. It exposes no internal notes, cost assumptions,
approval comments, other records, or raw source documents.

- [x] **Step 5: Add human delivery action**

**Generate proposal** and **Record delivery** are separate. Record channel,
recipient, actor, timestamp, and optional external message ID. No generic email
tool is exposed to AI.

- [ ] **Step 6: Run checks and browser-verify**

```bash
npx vitest run src/lib/ops/proposals.test.ts src/app/proposals/[token]/actions.test.ts
npx tsc --noEmit
npm test
```

Generate without delivery, record delivery, view signed link, accept, then
confirm a second acceptance returns the original result.

- [x] **Step 7: Commit**

Commit message: `Track exact proposal delivery and acceptance.`

---

## Phase E — Accepted estimate conversion

### Task 10: Convert accepted work atomically into project, jobs, and budget

**Files:**
- Create: `src/lib/ops/estimate-conversion.ts`
- Create: `src/lib/ops/estimate-conversion.test.ts`
- Create: `src/components/ops/estimate-conversion-preview.tsx`
- Modify: `src/app/app/opportunities/[id]/estimates/actions.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/jobs.ts`
- Modify: `src/app/app/jobs/actions.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0024_estimate_conversion.sql`
- Modify: `drizzle/meta/_journal.json`

- [x] **Step 1: Write conversion tests**

Fixtures use an accepted approved version with three job packages, seven work
areas, eighteen tasks, five selected document versions, and estimate lines.
Assert:

- Preview exactly matches created records.
- One project, three jobs, seven areas, eighteen tasks, one budget.
- Budget lines retain estimate version and price revision.
- Document links reference existing Blob versions without copying.
- Opportunity/request becomes won.
- Replay returns original IDs.
- Two concurrent calls create one result.
- Injected failure on task 10 rolls back project, jobs, areas, tasks, budget,
  links, status, events, and completion marker.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/estimate-conversion.test.ts
```

- [x] **Step 3: Add conversion and budget schema**

Create `estimate_conversions`, `project_budgets`, and
`project_budget_lines`. Unique acceptance ID and idempotency key enforce one
conversion. Store created project/job IDs and conversion payload hash.

- [x] **Step 4: Implement pure preview**

`buildEstimateConversionPreview` derives only from accepted estimate content:

```ts
type EstimateConversionPreview = {
  project: { name: string };
  jobs: Array<{
    packageId: string;
    name: string;
    scope: string;
    services: string[];
    workAreas: Array<{ name: string; kind: string }>;
    tasks: Array<{ title: string; workAreaIndex: number | null }>;
  }>;
  documentVersionIds: string[];
  budgetTotalCents: number;
};
```

- [x] **Step 5: Implement one PostgreSQL transaction**

Lock acceptance, estimate version, opportunity, and existing conversion. Recheck
organization, approval, expiry, accepted decision, content hash, and absence of
an existing opportunity project. Insert all records, audit/business events,
completion record, and outbox events through the transaction object. Never call
the existing non-transactional one-job conversion from this command.

- [x] **Step 6: Add explicit internal confirmation**

Show the exact preview and require administrator `estimate.convert`. The action
posts acceptance ID, expected estimate hash, and idempotency key. On success,
link to the created project and all jobs.

- [x] **Step 7: Preserve old manual conversion**

Existing won-work conversion remains for opportunities without an accepted
estimate. If an accepted estimate exists, direct the user to its conversion
preview. Do not silently reinterpret the old one-job form.

- [ ] **Step 8: Run checks and browser-verify**

```bash
npx vitest run src/lib/ops/estimate-conversion.test.ts src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm test
```

Accept the demo proposal, inspect preview, confirm, and verify the project,
three jobs, work areas, tasks, budget, and source plans. Submit the same form
again and verify no duplicates.

- [x] **Step 9: Commit**

Commit message: `Convert an accepted estimate into approved jobs once.`

---

## Phase F — Commercial AI

### Task 11: Build the authorized commercial evidence pack

**Files:**
- Create: `src/lib/ops/commercial-ai-evidence.ts`
- Create: `src/lib/ops/commercial-ai-evidence.test.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`

- [x] **Step 1: Write evidence-pack tests**

Assert the pack:

- Contains only the requested organization/opportunity.
- Contains selected clean document versions and ready chunks.
- Caps pages/chunks by configured token budget.
- Contains only active approved price revisions.
- Excludes quarantined, failed, superseded-unselected, field-only, and other
  organization records.
- Keeps immutable IDs/hashes required for citation validation.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/commercial-ai-evidence.test.ts
```

- [x] **Step 3: Implement the bounded pack**

Build it server-side after `estimate.edit` authorization. Require explicit
document-version selection. Prefer specification/addendum chunks, then plan
notes/title blocks, and include the active estimate version only for revision
drafts. Do not send file bytes when cited extracted text is sufficient.

- [x] **Step 4: Run checks and commit**

```bash
npx vitest run src/lib/ops/commercial-ai-evidence.test.ts
npx tsc --noEmit
```

Commit message: `Build an authorized commercial AI evidence pack.`

### Task 12: Create strict cited AI proposals

**Files:**
- Create: `src/lib/ops/commercial-ai.ts`
- Create: `src/lib/ops/commercial-ai.test.ts`
- Create: `src/lib/ops/commercial-evaluation.test.ts`
- Create: `src/worker/handlers/draft-bid-estimate.ts`
- Modify: `src/worker/registry.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/db/schema.ts`
- Create: `drizzle/0025_commercial_ai.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `.env.example`

- [x] **Step 1: Write strict schema and policy tests**

Use Zod `.strict()` objects. Test rejection for:

- Unknown citation/chunk/hash.
- Uncited line or job package.
- Quantity without a citation.
- Quantity described as calculated, scaled, inferred, or measured.
- Price, cost, markup, overhead, tax, discount, total, approval, project ID,
  job ID, recipient, or send directive.
- Prompt injection asking for system prompt, tools, cross-org records, or
  automatic mutation.

Accepted fixtures contain only explicit written quantities and
`manual_required`.

- [x] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/commercial-ai.test.ts src/lib/ops/commercial-evaluation.test.ts
```

- [x] **Step 3: Add append-only AI schema**

Create `ai_runs`, `ai_proposals`, `ai_citations`, and `ai_tool_executions`.
Store capability ID (`AI-016` or `AI-018`), provider/model, prompt-template and
response-schema versions, actor/service, content hash, selected source IDs,
usage/cost/latency, status, and redacted validated output. Store no
chain-of-thought.

- [x] **Step 4: Implement the gateway adapter**

Use `AI_COMMERCIAL_MODEL`. System instructions state that document text is
untrusted data, output must match `BidEstimateProposal`, written quantity must
be verbatim and cited, and prohibited financial/mutation fields are absent.
Validate response, then validate every citation against the evidence pack
before insert.

- [x] **Step 5: Run as a durable worker job**

The server action inserts `commercial_ai.draft_requested` to the outbox.
Worker writes run/proposal/citations or failure in one transaction. Retry uses
the same idempotency key and never creates two proposals. Demo writes the
documented deterministic proposal without a network call.

- [x] **Step 6: Run checks and commit**

```bash
npx vitest run src/lib/ops/commercial-ai.test.ts src/lib/ops/commercial-evaluation.test.ts
npx tsc --noEmit
npm test
```

Commit message: `Generate strict cited bid estimate proposals.`

### Task 13: Review and apply selected AI suggestions

**Files:**
- Create: `src/components/ops/bid-estimate-proposal.tsx`
- Modify: `src/app/app/opportunities/[id]/estimates/actions.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/actions.test.ts`
- Modify: `src/app/app/opportunities/[id]/estimates/[estimateId]/page.tsx`
- Modify: `src/app/app/opportunities/[id]/page.tsx`
- Modify: `src/lib/ops/estimates.ts`

- [ ] **Step 1: Write apply-action tests**

Assert dismissed proposal writes nothing. Applying a selected subset creates
one new estimate version through the manual validator/calculator. Stale base
version, changed citation hash, retired price candidate, prohibited field, and
wrong organization fail. Quantity without estimator confirmation remains
unpriced and `Takeoff required`.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/app/app/opportunities/[id]/estimates/actions.test.ts
```

- [ ] **Step 3: Add proposal review**

Render summary, job packages, lines, inclusions, exclusions, alternates, and
questions with per-item selection. Citation opens original page and highlighted
span. Candidate price revisions are radio choices requiring explicit user
selection. Quantity is editable and displays source text.

- [ ] **Step 4: Reuse the manual version command**

`applyBidEstimateProposal` converts selected proposal items into the same
`CreateEstimateVersionInput` used by the manual editor. It never inserts
estimate content directly.

- [ ] **Step 5: Run checks and browser-verify**

```bash
npx vitest run src/app/app/opportunities/[id]/estimates/actions.test.ts src/lib/ops/commercial-ai.test.ts
npx tsc --noEmit
npm test
```

In demo: draft, inspect page citations, dismiss with no write, draft again,
apply selected items, select approved price revisions, create a new version,
and confirm no project/job exists.

- [ ] **Step 6: Commit**

Commit message: `Review AI bid suggestions before estimate writes.`

---

## Phase G — Rollout and verification

### Task 14: Add feature flags, operations visibility, and production gates

**Files:**
- Create: `src/lib/ops/commercial-flags.ts`
- Create: `src/lib/ops/commercial-flags.test.ts`
- Modify: `src/lib/ops/ai-exceptions.ts`
- Modify: `src/lib/ops/ai-exceptions.test.ts`
- Modify: `src/app/app/page.tsx`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/strongfoam-crm-erp-prd.md`

- [ ] **Step 1: Write flag and exception tests**

Flags are organization/capability scoped:

```text
COMMERCIAL_ESTIMATES_ENABLED
BID_DOCUMENT_EXTRACTION_ENABLED
COMMERCIAL_AI_ENABLED
SIGNED_PROPOSALS_ENABLED
ACCEPTED_ESTIMATE_CONVERSION_ENABLED
```

Manual estimates may be enabled while commercial AI is disabled. Home
exceptions include failed/dead-letter scan, extraction, proposal, and
conversion jobs with authorized links.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run src/lib/ops/commercial-flags.test.ts src/lib/ops/ai-exceptions.test.ts
```

- [ ] **Step 3: Add production gates**

Commercial AI cannot enable unless:

- Manual estimate, approval, proposal, and conversion tests pass.
- Worker heartbeat is healthy.
- Scanner and data-residency-approved extraction/model providers are set.
- Evaluation suite passes every geometry, price, prompt-injection, citation,
  and cross-organization rejection case.
- Cost and rate limits are configured.

- [ ] **Step 4: Update operating documentation**

Document migration order, worker command, Render background-worker service,
scanner/OCR/gateway variables, Blob policy, retry/dead-letter runbook,
proposal-token revocation, and rollback flags. Mark PRD requirements shipped
only after their acceptance checks pass.

- [ ] **Step 5: Run all automated checks**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

Commit message: `Gate and observe the commercial bid workflow.`

### Task 15: Execute the end-to-end acceptance matrix

**Files:**
- Test: all files named in Tasks 1–14
- Update after evidence: `docs/strongfoam-crm-erp-prd.md`

- [ ] **Step 1: Verify manual mode**

Disable AI and OCR. Upload a text PDF, create estimate versions manually,
approve, generate without sending, record delivery, accept, preview conversion,
and create the approved jobs. Confirm every total and source link.

- [ ] **Step 2: Verify cited AI mode**

Use a package with explicit written quantities, missing quantities, an
addendum conflict, and prompt injection. Confirm accepted written quantities
are cited, missing/conflicting values require a person, and injection has no
effect.

- [ ] **Step 3: Verify security**

Exercise logged-out, field, wrong organization, expired link, revoked link,
forged upload path, quarantined file, foreign citation, and unauthorized
approval/conversion. Confirm no content, count, title, filename, status, or ID
leaks.

- [ ] **Step 4: Verify reliability**

Stop the worker during scan, extraction, AI draft, and conversion publication.
Restart and confirm checkpoint resume and one business effect. Exhaust one job
and confirm the dead-letter Home exception.

- [ ] **Step 5: Verify immutability and replay**

Change and retire price revisions; old estimates stay unchanged. Create a new
estimate version; old approval/proposal cannot act on it. Replay acceptance and
conversion concurrently; one project and the exact approved jobs exist.

- [ ] **Step 6: Verify rollback**

Inject a conversion failure after several child records. Confirm none of the
project, jobs, budget, links, events, or completion marker remains.

- [ ] **Step 7: Verify provider failure**

Disable scanner, OCR, and AI configuration independently. Confirm quarantined
or failed status is explicit and manual CRM/estimate/job work remains usable.

- [ ] **Step 8: Record shipped requirements**

Only after the matrix passes, update PRD status and decision log with the
shipped BID/QTE/AI requirements. Do not mark geometric takeoff or autonomous
pricing shipped.

- [ ] **Step 9: Final commit**

Commit message: `Verify the bid-to-job workflow end to end.`

---

## Implementation handoff

Execute phases in order. Each phase leaves a usable manual or operational
increment:

1. Secure durable execution.
2. Private cited bid packages.
3. Manual deterministic estimate versions.
4. Approval and proposal acceptance.
5. Exact accepted-work conversion.
6. Cited AI drafting.
7. Controlled rollout.

Do not begin Phase F while a Phase C–E business command exists only as an AI
path. AI is an optional proposal layer over the same manual commands.
