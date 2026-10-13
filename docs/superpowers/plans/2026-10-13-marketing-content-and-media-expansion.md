# Marketing Content and Media Expansion — Implementation Plan

> **Execution rule:** Complete the checklist in order. For every behavior
> change, write the failing test, run it and confirm the intended failure,
> implement the minimum passing behavior, then refactor with the test green.

**Goal:** Expand the Strong Foam public site into the approved focused-homepage
and multi-page architecture, audit all 576 supplied media files, add a short
general-inquiry branch to the existing intake, and ship accessible route-level
SEO without regressing CRM, field, operations, or proposals.

**Design source:** `docs/superpowers/specs/2026-10-13-marketing-content-and-media-expansion-design.md`

**Tech stack:** Next.js 16.3.8 App Router, React 19, TypeScript, Tailwind 4,
shadcn/ui, GSAP, Zod 4, Vitest, Cloudflare Workers/OpenNext, D1, R2, Resend.

## Plan control

- Taskmaster MCP authentication was skipped for this approved implementation.
- The installed legacy Taskmaster CLI is incompatible with the repository's
  task-file layout.
- This versioned plan is the durable authoritative task/status record. Update
  its checkboxes only after the named verification passes.
- Attached Cursor todo statuses mirror this plan during the active session;
  when they differ, this plan controls and the Cursor statuses are corrected.
- Work only in the approved
  `/Users/cbsuperpatch/.config/superpowers/worktrees/strongfoam-1/marketing-media-expansion`
  worktree.
- Do not modify the attached Cursor plan file.
- Do not commit until the user explicitly requests a commit.
- Preserve the existing CRM, operations, field, lead, proposal, upload,
  qualification, Calendly, and storage paths.

## Global implementation constraints

- Reuse existing files and shadcn/ui primitives before adding components.
- Keep page content in server components. Limit client components to
  navigation, forms, scroll behavior, and other browser-only interactions.
- Do not reference a source asset from route content until its manifest status
  is `publish` and the relevant rights/identity approval fields are true.
- Keep `fireproofing` and `intumescent` as stored intake/CRM service IDs while
  presenting both on `/services/fire-protection`.
- Keep internal-only email addresses out of typed public site content,
  rendered HTML, metadata, JSON-LD, and client bundles.
- Do not alter `src/db/schema.ts` or add a migration for general inquiries. The
  inspected lead columns are non-null text/JSON without value CHECK constraints;
  use the locked sentinels and `answers.intakeType` mapping in Phase 5.
- Run the named focused command after each slice and read its output before
  checking the slice complete.

## Known build baseline

`npm run build` was run on 2026-10-13 and failed before application compilation
because the Cloudflare remote binding session could not authenticate:

```text
This Worker uses bindings that need to run remotely, even when developing
locally, but the remote session could not be authenticated.
APIError code 10000
```

This is the known pre-implementation auth baseline. Do not attribute it to a
marketing change. Before final build verification, an authorized operator
runs:

```bash
npx wrangler whoami
npx wrangler login
npm run build
```

The login command is required only when `whoami` confirms expired or revoked
authentication. No Cloudflare credential is written to the repository.

---

## Cross-cutting prerequisite: shared claims policy

**Files:**

- Create: `src/content/claims.ts`
- Create: `src/content/claims.test.ts`

- [ ] Write failing tests for one recursive assertion that rejects whole-word,
  case-insensitive occurrences of `greenest`, `unrivalled`, `best`,
  `guaranteed`, and `always`, plus configured equivalent absolute-claim
  patterns, at any nesting depth.
- [ ] Implement `assertMarketingClaimsSafe(value, surface)` in
  `src/content/claims.ts`; include the surface and object path in failures.
  This is the only banned-term/pattern list used by marketing code.
- [ ] Require source-copy publication decisions, visible typed copy, metadata,
  media alt text, and completed JSON-LD graphs to call this function. Their
  builders/tests must not maintain separate banned-term arrays.
- [ ] Run:

```bash
npx vitest run src/content/claims.test.ts
```

---

## Phase 1: Reproducible media audit

### Files

- Create: `scripts/audit-sfi-media.mjs`
- Create: `scripts/audit-sfi-media.test.ts`
- Create: `assets/source-media-inventory.json`
- Create: `assets/source-media-decisions.json`
- Create: `assets/source-media-manifest.json`
- Create: `docs/sfi-media-audit.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `assets/MANIFEST.md`
- Modify: `assets/SCROLL-BG-SHORTLIST.md`
- Modify when approved public folders require it:
  `scripts/sync-public-media.mjs`
- Modify with sync behavior:
  `scripts/sync-public-media.test.ts`
- Populate only after approval:
  - `assets/brand/`
  - `assets/projects/`
  - `assets/backgrounds/`
  - `assets/partners/`

### 1.1 Inventory contract

- [ ] Add a failing test in `scripts/audit-sfi-media.test.ts` using a temporary
  fixture directory created by the test. Assert deterministic source-relative
  paths and IDs, case-insensitive supported extensions, byte sizes, SHA-256
  hashes, image dimensions, orientation, video metadata, and explicit
  unreadable-file errors.
- [ ] Add failing preflight tests for missing `ffmpeg` and missing `ffprobe`.
  The command must stop before writing any audit artifact and report the
  missing binary.
- [ ] Add fixture cases in test-created temporary directories for uppercase
  extensions, spaces in names, same-content duplicates, portrait/landscape/
  square dimensions, and an unreadable or unsupported file.
- [ ] Run the red test:

```bash
npx vitest run scripts/audit-sfi-media.test.ts
```

- [ ] Add `sharp` as the image metadata, contact-sheet, resize, metadata-strip,
  and derivative dependency in `package.json`/`package-lock.json`.
- [ ] Implement the minimum read-only source scan in
  `scripts/audit-sfi-media.mjs`. It may read `SFI WEBSITE/` and `assets/`; it
  must not rename, delete, overwrite, or transform source files.
- [ ] Before scanning, resolve `ffmpeg` and `ffprobe` from `PATH`, capture the
  first version line from each, and fail before output when either is missing.
- [ ] Write generated structural results only to
  `assets/source-media-inventory.json`. Never write human review fields from
  the inventory command.
- [ ] Make manifest ordering deterministic by source-relative path and make
  reruns byte-stable when the source set has not changed.
- [ ] Run the focused test to green:

```bash
npx vitest run scripts/audit-sfi-media.test.ts
```

### 1.2 Duplicate and baseline checks

- [ ] Add failing assertions for exact duplicate grouping by SHA-256, one
  preferred keeper per exact group, and every duplicate pointing to that
  keeper.
- [ ] Add failing acceptance assertions for the approved structural baseline
  using a fixed low-resolution rule of
  `Math.min(width, height) < 720` pixels:
  576 total files, 544 images, 32 videos, 484 exact-unique images, 47 exact
  duplicate groups, 60 redundant image files, 34 low-resolution images, and
  zero corrupt images.
- [ ] Implement exact grouping by SHA-256. Select the keeper by greatest pixel
  area, then greatest byte size, then lexicographically smallest normalized
  source-relative path. Record the policy version in the inventory.
- [ ] Implement five video sample times per video: 0.25 seconds, 25%, 50%, 75%,
  and `duration - 0.25 seconds`, clamped and deduplicated for short clips.
  Read duration with `ffprobe` and extract frames with `ffmpeg`.
- [ ] Implement grouping, keeper selection, low-resolution flags, video sample
  metadata, and count reporting without changing any source file.
- [ ] Run:

```bash
npx vitest run scripts/audit-sfi-media.test.ts
node scripts/audit-sfi-media.mjs inventory \
  --source "SFI WEBSITE" \
  --inventory assets/source-media-inventory.json
```

- [ ] Treat any baseline count mismatch as a review failure and reconcile the
  source set before proceeding; do not change the expected counts merely to
  make the test pass.

### 1.3 Editorial, rights, and privacy fields

- [ ] Add a failing decisions-shape test requiring every file to carry
  `category`, `placement`, `quality`, `rights`, `relationshipApproval`,
  `safetyPrivacy`, `alt`, `decorative`, `status`, and `reason`.
- [ ] Restrict `status` to `publish`, `hold`, `duplicate`, or `reject`.
- [ ] Require a nonempty reason for every status, approved alt text for
  informative published images, and an explicit `decorative: true` decision
  when alt text is intentionally empty.
- [ ] Require logos to have known identity, current-relationship approval,
  publication-permission approval, and an approved official logo path before
  they can be `publish`.
- [ ] Store these human-reviewed fields only in
  `assets/source-media-decisions.json`. Inventory generation must neither
  create nor modify that file.
- [ ] Add a failing compiler test that joins temporary fixture inventory plus
  temporary fixture decisions, rejects missing/stale IDs, and preserves
  deterministic ordering without copying review fields back into inventory.
  All compiler tests in this subsection write only inside the test-created
  temporary directory; they must not create or modify
  `assets/source-media-manifest.json`.
- [ ] Run every fixture's published alt text and other public-facing media
  string through `assertMarketingClaimsSafe` during compilation.
- [ ] Implement decision validation and reusable manifest compilation, then run
  fixture-only tests:

```bash
npx vitest run scripts/audit-sfi-media.test.ts
```

### 1.4 Visual review of all 576 files

- [ ] Generate image contact sheets and representative frames from all 32
  videos into the non-deployable macOS temporary path:

```bash
TMP_BASE="${TMPDIR%/}"
: "${TMP_BASE:=/tmp}"
AUDIT_REVIEW_DIR="$(mktemp -d "${TMP_BASE}/strongfoam-sfi-media-audit.XXXXXX")"
cleanup_audit_review() {
  case "$AUDIT_REVIEW_DIR" in
    "${TMP_BASE}"/strongfoam-sfi-media-audit.*)
      rm -rf -- "$AUDIT_REVIEW_DIR"
      ;;
    *)
      echo "Refusing unsafe cleanup path: $AUDIT_REVIEW_DIR" >&2
      return 1
      ;;
  esac
}
trap cleanup_audit_review EXIT INT TERM
node scripts/audit-sfi-media.mjs review \
  --inventory assets/source-media-inventory.json \
  --review-dir "$AUDIT_REVIEW_DIR"
```

- [ ] Review every exact-unique image and representative frames from every
  video for subject/trade, resolution, crop, exposure, blur, orientation,
  placement suitability, PPE, faces, plates, signage, addresses, ownership,
  current relationship, and publication permission.
- [ ] Record a final decision and reason for all 576 files in
  `assets/source-media-decisions.json`. Exact duplicates receive their own
  `duplicate` records rather than disappearing from the decision record.
- [ ] Record the review totals, duplicate groups, held rights items, quality
  rejects, privacy holds, approved logos, and selected videos in
  `docs/sfi-media-audit.md`.
- [ ] Update `assets/MANIFEST.md` with approved curated paths and provenance.
- [ ] Update `assets/SCROLL-BG-SHORTLIST.md` with only approved background and
  video candidates.
- [ ] Only after all 576 human decisions are complete, compile the repository
  manifest:

```bash
node scripts/audit-sfi-media.mjs compile \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json
```

- [ ] Add an acceptance assertion that repository compilation refuses to run
  while any inventory ID lacks a final human decision and that the manifest's
  generated timestamp/content cannot be mistaken for a review decision.
- [ ] Add a failing non-mutation test that hashes and stats inventory,
  decisions, manifest, and audit report before and after `--check`, then
  requires identical bytes and modification times.
- [ ] Implement `--check` as a read-only operation that recomputes expected
  inventory and compiled manifest in memory, validates all 576 decisions, and
  exits non-zero on drift without writing any file.
- [ ] Run the read-only completeness check:

```bash
node scripts/audit-sfi-media.mjs check \
  --source "SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json
```

### 1.5 Approval gate and curated import

- [ ] Present the visual shortlist, third-party logo list, and video shortlist
  for explicit user approval.
- [ ] Stop route/media integration until that approval is recorded in
  `docs/sfi-media-audit.md`.
- [ ] Copy only approved keepers to `assets/brand/`, `assets/projects/`,
  `assets/backgrounds/`, and `assets/partners/`.
- [ ] Prefer approved vector Strong Foam and Strong Fire PDFs as brand masters.
  Keep DOCX compilations as evidence, not deployable assets.
- [ ] Add a failing sync test before adding `partners` or any other new public
  folder to `MEDIA_FOLDERS`.
- [ ] Implement the minimum sync-folder change and run:

```bash
npx vitest run scripts/sync-public-media.test.ts
npm run media:sync
```

- [ ] Verify no unapproved or raw source file was copied into `assets/` or
  `public/media/`.

---

## Phase 2: Typed marketing content

### Files

- Create: `scripts/audit-sfi-copy.mjs`
- Create: `scripts/audit-sfi-copy.test.ts`
- Create: `docs/sfi-source-copy-inventory.json`
- Create: `docs/sfi-source-copy-decisions.json`
- Create: `docs/sfi-source-copy-audit.json`
- Create: `docs/sfi-source-copy-audit.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/content/site.ts`
- Create: `src/content/services.ts`
- Create: `src/content/services.test.ts`
- Create: `src/content/projects.ts`
- Create: `src/content/projects.test.ts`
- Create: `src/content/partners.ts`
- Create: `src/content/partners.test.ts`
- Modify: `src/content/nav.ts`
- Modify: `src/content/survey.ts`
- Modify: `src/content/site.test.ts`
- Modify when service ID types are centralized:
  `src/lib/leads/types.ts`

### 2.1 Source-copy precedence audit
- [ ] Write failing extraction tests in `scripts/audit-sfi-copy.test.ts` for deterministic
  requirement IDs, source-relative paths, paragraph locators/hashes, verbatim
  excerpts, precedence ranks, and normalized requirements.
- [ ] In test-created temporary directories, cover source extraction plus a
  fixture-only compile in which a higher-priority statement supersedes an
  older conflict, a claim is held for approval, a guarded claim is rejected,
  and a safe requirement is published to a typed field and route.
- [ ] Assert the only final outcomes are `published`, `held`, and `rejected`;
  every record has a nonempty reason; `published` records have a typed-content
  field plus at least one route; `held` records name the missing approval or
  evidence; and `rejected` records name the controlling source or claims guard.
- [ ] Assert the precedence order is exactly:
  1. `SFI WEBSITE/Website revision dec. 15, 2020.docx`
  2. `SFI WEBSITE/STRONG FOAM MISSION STATEMENT CK EDITS.docx`
  3. `SFI WEBSITE/Website Text 2.docx`
  4. every older DOCX source as supporting evidence
- [ ] Run the red test:

```bash
npx vitest run scripts/audit-sfi-copy.test.ts
```

- [ ] Implement `scripts/audit-sfi-copy.mjs` as a read-only DOCX paragraph
  extractor plus separate decision/compile validator. Add `mammoth` to
  `package.json`/`package-lock.json` and use its raw-text extraction so DOCX
  paragraph order and blank-paragraph boundaries determine stable paragraph
  locators/hashes. The script must discover every DOCX beneath `SFI WEBSITE/`,
  retain source locators/excerpts, and fail rather than silently dropping a
  document or requirement.
- [ ] The extraction command may create or replace only
  `docs/sfi-source-copy-inventory.json`. It must never create, normalize, or
  overwrite `docs/sfi-source-copy-decisions.json`.
- [ ] Run extraction:

```bash
node scripts/audit-sfi-copy.mjs inventory \
  --source "SFI WEBSITE" \
  --inventory docs/sfi-source-copy-inventory.json
```

- [ ] Human-review every extracted requirement and record exactly one final
  `published`, `held`, or `rejected` outcome with a specific reason in
  `docs/sfi-source-copy-decisions.json`.
- [ ] Map every `published` requirement to its exact typed-content field in
  `src/content/site.ts`, `src/content/services.ts`,
  `src/content/projects.ts`, or `src/content/partners.ts` and to every public
  route that renders it.
- [ ] Record the approval/evidence dependency for every `held` requirement and
  the superseding source or claims guard for every `rejected` requirement.
- [ ] Run every proposed `published` excerpt through
  `assertMarketingClaimsSafe`; a guard failure must become a `held` or
  `rejected` decision with its reason before compilation succeeds.
- [ ] Keep early compiler tests fixture-only. After human decisions are
  complete, compile the repository audit and report from the separate inputs:

```bash
npx vitest run scripts/audit-sfi-copy.test.ts
node scripts/audit-sfi-copy.mjs compile \
  --inventory docs/sfi-source-copy-inventory.json \
  --decisions docs/sfi-source-copy-decisions.json \
  --audit docs/sfi-source-copy-audit.json \
  --report docs/sfi-source-copy-audit.md
```

- [ ] Add a repository acceptance test that compares fresh extraction and
  in-memory compilation with the checked-in artifacts and fails for any
  missing document, unrecorded requirement, non-final outcome, empty reason,
  or published item without a typed-field/route destination.
- [ ] Add a non-mutation test that hashes and stats copy inventory, decisions,
  compiled audit, and report before and after `--check`, requiring identical
  bytes and modification times. `--check` must never create, normalize,
  overwrite, or reorder the human decisions file.
- [ ] Run the read-only completeness check:

```bash
node scripts/audit-sfi-copy.mjs check \
  --source "SFI WEBSITE" \
  --inventory docs/sfi-source-copy-inventory.json \
  --decisions docs/sfi-source-copy-decisions.json \
  --audit docs/sfi-source-copy-audit.json \
  --report docs/sfi-source-copy-audit.md
```

### 2.2 Site, route, and claims contracts

- [ ] Extend `src/content/site.test.ts` with failing assertions for every public
  route and exactly four service display slugs:
  `spray-foam-insulation`, `fire-protection`, `air-vapour-barriers`, and
  `spf-roofing`.
- [ ] Assert every route path and slug is unique.
- [ ] Assert About content includes the approved company story fields, safety,
  culture, mission, vision, purpose, promise, objective, and all three locked
  slogan lines.
- [ ] Pass typed visible copy, route metadata, media alt text, source-copy
  publish decisions, and completed JSON-LD graphs through
  `assertMarketingClaimsSafe`; do not duplicate banned-term arrays in their
  tests or builders.
- [ ] Add explicit approval fields for 2016/2020 dates, 50/100-year claims,
  current GTA status, named clients/projects, supplier relationships, and
  applicator status.
- [ ] Run the red test:

```bash
npx vitest run src/content/claims.test.ts src/content/site.test.ts
```

- [ ] Refactor `src/content/site.ts` so company/NAP/global content and approval
  fields are typed and no held value can be rendered accidentally.
- [ ] Update `src/content/nav.ts` to point to the dedicated routes plus
  `/request-estimate`.
- [ ] Run the test to green:

```bash
npx vitest run src/content/claims.test.ts src/content/site.test.ts
```

### 2.3 Service content

- [ ] Write failing tests in `src/content/services.test.ts` asserting the four
  route records, their required technical sections, canonical paths, metadata,
  CTA targets, and stored service IDs.
- [ ] Assert `/services/fire-protection` maps to both existing stored IDs,
  `fireproofing` and `intumescent`, while the other service routes map to their
  existing single IDs.
- [ ] Assert technical cautions exist for specification dependence, suitable
  conditions, substrate/weather limitations, or product-family verification
  where applicable.
- [ ] Implement `src/content/services.ts` and run:

```bash
npx vitest run src/content/services.test.ts src/content/site.test.ts
```

### 2.4 Projects and partners

- [ ] Write failing tests in `src/content/projects.test.ts` requiring stable
  IDs, approved category, approved manifest reference, alt/decorative decision,
  publication status, and permission-safe caption for every rendered project.
- [ ] Write failing tests in `src/content/partners.test.ts` requiring
  supplier/client-contractor category, known identity, current-relationship
  approval, publication-permission approval, approved logo path, and alt text.
- [ ] Assert filtering functions return only publishable records and cannot
  render held or rejected records.
- [ ] Implement `src/content/projects.ts` and `src/content/partners.ts` using
  only approved manifest records.
- [ ] Run:

```bash
npx vitest run \
  src/content/projects.test.ts \
  src/content/partners.test.ts
```

### 2.5 Intake display mapping

- [ ] Add failing assertions that display slugs are separate from stored
  `ServiceId` values and every intake option resolves to a current stored ID.
- [ ] Update `src/content/survey.ts` without changing the stored values used by
  historical leads and CRM records.
- [ ] Run the content suite:

```bash
npx vitest run \
  src/content/claims.test.ts \
  src/content/site.test.ts \
  src/content/services.test.ts \
  src/content/projects.test.ts \
  src/content/partners.test.ts
```

---

## Phase 3: Shared marketing UI

### Files

- Modify: `src/components/scroll-world-page.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/site-header.test.ts`
- Create: `src/components/site-header-model.ts`
- Create: `src/components/site-header-model.test.ts`
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/marketing/marketing-page-model.ts`
- Create: `src/components/marketing/marketing-page-model.test.ts`
- Create: `src/components/marketing/marketing-components.test.tsx`
- Create only when no equivalent exists:
  - `src/components/marketing/interior-hero.tsx`
  - `src/components/marketing/service-detail.tsx`
  - `src/components/marketing/project-gallery.tsx`
  - `src/components/marketing/partner-grid.tsx`
  - `src/components/marketing/location-cards.tsx`
  - `src/components/marketing/breadcrumbs.tsx`
  - `src/components/marketing/cta-band.tsx`
  - `src/components/marketing/site-footer.tsx`

### Test harness

- Keep `vitest.config.ts` on its existing `node` environment; do not add a
  browser test dependency for these components.
- Test filtering, route models, section order, reduced-motion flags, and survey
  transitions as pure functions/reducers.
- Test mobile header open/close/navigation transitions through a pure
  `siteHeaderReducer` in `src/components/site-header-model.test.ts`.
- Render server-compatible marketing components with
  `renderToStaticMarkup` from `react-dom/server` in
  `src/components/marketing/marketing-components.test.tsx`.
- Reserve actual focus, pointer, mobile Sheet, and animation checks for the
  Phase 8 browser pass.

### 3.1 Navigation and layout

- [ ] Extend `src/components/site-header.test.ts` with failing desktop/mobile
  assertions for About, Services, Projects, Partners, Locations, Contact, and
  Request Estimate.
- [ ] In `src/components/site-header-model.test.ts`, assert the pure reducer
  opens, closes, and closes on navigation. In `src/components/site-header.test.ts`,
  assert the descriptive home link and typed navigation targets.
- [ ] Implement the reducer in `src/components/site-header-model.ts` and
  refactor `src/components/site-header.tsx` to use it with the existing
  shadcn/ui Sheet and navigation primitives.
- [ ] Add the shared footer to `src/app/(marketing)/layout.tsx` with approved
  public contact channels only.
- [ ] Run:

```bash
npx vitest run \
  src/components/site-header-model.test.ts \
  src/components/site-header.test.ts
```

### 3.2 Shared content components

- [ ] Write failing server-rendered component tests for semantic H1/heading
  order, breadcrumb labels/links, CTA links, filtered project/partner records,
  empty states, and location approval filtering.
- [ ] Write failing pure tests in
  `src/components/marketing/marketing-page-model.test.ts` for homepage section
  order, four service links, approved-only project/partner selection, approved
  location selection, and reduced-motion fallback flags.
- [ ] Reuse existing `src/components/ui/` primitives. Add only the marketing
  components not already represented by a shared component.
- [ ] Keep content components server-compatible; isolate gallery controls or
  browser interactions in the smallest possible client child.
- [ ] Run:

```bash
npx vitest run \
  src/components/marketing/marketing-page-model.test.ts \
  src/components/marketing/marketing-components.test.tsx
```

### 3.3 Homepage focus and motion fallback

- [ ] Add failing assertions to the existing homepage/content tests that the
  homepage exposes four service paths, the endorsed Strong Fire feature,
  approved selected projects/partners, coverage, FAQ, and estimate CTA without
  embedding full service-page copy.
- [ ] Implement `src/components/marketing/marketing-page-model.ts` and refactor
  `src/components/scroll-world-page.tsx` to consume that pure model, typed
  content, and approved media.
- [ ] Update `src/app/globals.css` for keyboard focus, responsive interior
  layout, video/image fallbacks, and `prefers-reduced-motion`.
- [ ] Ensure the homepage remains useful with animation disabled and that
  motion never hides text or navigation.
- [ ] Run:

```bash
npx vitest run \
  src/content/site.test.ts \
  src/components/site-header.test.ts \
  src/components/marketing/marketing-page-model.test.ts \
  src/components/marketing/marketing-components.test.tsx
```

---

## Phase 4: Marketing routes

### Files

- Modify: `src/app/(marketing)/page.tsx`
- Create: `src/app/(marketing)/about/page.tsx`
- Create: `src/app/(marketing)/services/page.tsx`
- Create: `src/app/(marketing)/services/spray-foam-insulation/page.tsx`
- Create: `src/app/(marketing)/services/fire-protection/page.tsx`
- Create: `src/app/(marketing)/services/air-vapour-barriers/page.tsx`
- Create: `src/app/(marketing)/services/spf-roofing/page.tsx`
- Create: `src/app/(marketing)/projects/page.tsx`
- Create: `src/app/(marketing)/partners/page.tsx`
- Create: `src/app/(marketing)/locations/page.tsx`
- Create: `src/app/(marketing)/contact/page.tsx`
- Create: `src/app/(marketing)/marketing-routes.test.tsx`
- Modify: `src/app/(marketing)/request-estimate/page.tsx`
- Create: `src/app/(marketing)/request-estimate/page.test.tsx`

### 4.1 Route reachability and metadata first

- [ ] Write a failing table-driven test in
  `src/app/(marketing)/marketing-routes.test.tsx` that imports every interior
  page and asserts a renderable server component, one route-specific H1,
  unique title, unique description, canonical URL, and expected contextual
  links.
- [ ] Use `renderToStaticMarkup` from `react-dom/server` for interior server
  pages and inspect exported metadata as plain objects. Verify homepage
  sections through `marketing-page-model.test.ts` rather than mounting the
  GSAP/Three client tree in the Node harness.
- [ ] Include `/`, `/about`, `/services`, four service detail routes,
  `/projects`, `/partners`, `/locations`, `/contact`, and the existing
  `/request-estimate` in the route matrix.
- [ ] In `src/app/(marketing)/request-estimate/page.test.tsx`, add failing
  assertions for title, description, canonical, approved Open Graph image,
  Twitter card/image, and visible copy that offers both estimate and general
  inquiry paths.
- [ ] Run the red test:

```bash
npx vitest run \
  "src/app/(marketing)/marketing-routes.test.tsx" \
  "src/app/(marketing)/request-estimate/page.test.tsx"
```

### 4.2 Build route slices

- [ ] Implement `/about` with all approved company, culture, safety, mission,
  vision, purpose, promise, objective, and slogan sections.
- [ ] Implement `/services` with exactly four detail paths.
- [ ] Implement `/services/spray-foam-insulation` from typed service content.
- [ ] Implement `/services/fire-protection` with the approved Strong Fire
  lockup/endorsement and distinct cementitious and intumescent sections.
- [ ] Implement `/services/air-vapour-barriers` from typed service content.
- [ ] Implement `/services/spf-roofing` with conditions and limitations beside
  benefits.
- [ ] Implement `/projects` with publishable manifest-backed records only.
- [ ] Implement `/partners` with separate approved suppliers and approved
  client/contractor relationships.
- [ ] Implement `/locations` with only approved current-location claims.
- [ ] Implement `/contact` with public contact details and a CTA to the shared
  intake.
- [ ] Update `/request-estimate` page copy and route metadata so title,
  description, canonical, Open Graph, and Twitter fields describe both
  branches and use an approved media record.
- [ ] After each route, run the route test and fix the smallest failing slice:

```bash
npx vitest run \
  "src/app/(marketing)/marketing-routes.test.tsx" \
  "src/app/(marketing)/request-estimate/page.test.tsx"
```

### 4.3 Route integration

- [ ] Verify primary and contextual navigation reaches every route.
- [ ] Verify all route media paths exist in the approved manifest and synced
  public folders.
- [ ] Verify no held claim, location, project, partner, or asset appears in
  server-rendered output.
- [ ] Run:

```bash
npx vitest run \
  "src/app/(marketing)/marketing-routes.test.tsx" \
  "src/app/(marketing)/request-estimate/page.test.tsx" \
  src/components/site-header.test.ts \
  src/content/site.test.ts \
  src/content/services.test.ts \
  src/content/projects.test.ts \
  src/content/partners.test.ts
```

---

## Phase 5: Single intake with general inquiry

### Files

- Modify: `src/components/estimate-survey/estimate-survey.tsx`
- Create: `src/components/estimate-survey/survey-flow.ts`
- Create: `src/components/estimate-survey/survey-flow.test.ts`
- Modify: `src/content/survey.ts`
- Modify: `src/lib/leads/schema.ts`
- Modify: `src/lib/leads/schema.test.ts`
- Modify: `src/lib/leads/types.ts`
- Modify: `src/lib/leads/idempotency.ts`
- Modify: `src/lib/leads/idempotency.test.ts`
- Modify: `src/lib/leads/qualify.ts`
- Modify: `src/lib/leads/qualify.test.ts`
- Modify: `src/lib/leads/create-lead.ts`
- Modify: `src/lib/leads/create-lead.test.ts`
- Modify: `src/lib/leads/email.ts`
- Modify: `src/lib/leads/email.test.ts`
- Modify: `src/lib/leads/adapters.ts`
- Modify: `src/lib/leads/adapters.test.ts`
- Modify: `src/db/schema.test.ts`
- Modify: `src/app/api/leads/route.test.ts`
- Modify: `src/lib/ops/workflow.ts`
- Modify: `src/lib/ops/workflow.test.ts`
- Modify: `src/app/app/requests/page.tsx`
- Modify: `src/app/app/requests/[id]/page.tsx`
- Modify: `.env.example`
- Modify: `README.md`

### 5.1 Branch schema

- [ ] Add failing schema tests for a discriminated `intakeType` with
  `estimate` and `general` values.
- [ ] Prove the existing estimate payload still accepts and rejects exactly
  the current fields and stored service IDs.
- [ ] Prove a general inquiry requires name, valid email, phone, message,
  consent, spam timing fields, and draft ID; company is optional and project
  type, province, services, role, building type, timeline, drawings, and
  uploads are not required.
- [ ] Assert `firstName` and `lastName` remain separate required inputs and map
  unchanged to the required lead columns.
- [ ] Run the red tests:

```bash
npx vitest run \
  src/lib/leads/schema.test.ts \
  src/lib/leads/qualify.test.ts
```

- [ ] Implement the Zod discriminated union. General inquiries use
  `intakeType: "general"` and `message`; estimate payload behavior remains
  unchanged.
- [ ] Run the focused tests to green.

### 5.2 Idempotency, storage, and qualification

- [ ] Add failing idempotency tests proving two identical general inquiries in
  the existing ten-minute window replay one lead and that estimate keys remain
  unchanged.
- [ ] Add failing adapter tests proving general inquiries use the existing
  organization and lead table and map exactly as follows:
  - `firstName`, `lastName`, `email`, and `phone` store their required inputs;
  - optional `company` stores its trimmed value or `""`;
  - `projectType` stores `"general_inquiry"`;
  - `city` stores `""` and `province` stores `"not_applicable"`;
  - `services`, `recommendedServices`, and `files` store `[]`;
  - `answers` stores `intakeType: "general"` plus `message`;
  - lead `status` is `"secondary"` and `bookingStatus` is `"none"`.
- [ ] Add a schema regression assertion documenting that these required lead
  columns are text/JSON without value CHECK constraints. Make the explicit
  migration decision: do not modify `src/db/schema.ts` and do not add a D1
  migration; the discriminator remains in `answers`.
- [ ] Add failing create-lead tests proving estimate qualification and
  Calendly behavior are unchanged while general inquiries are secondary and
  never auto-offer Calendly.
- [ ] Implement the minimum changes in idempotency, qualification, create-lead,
  and adapter code.
- [ ] Run:

```bash
npx vitest run \
  src/db/schema.test.ts \
  src/lib/leads/idempotency.test.ts \
  src/lib/leads/qualify.test.ts \
  src/lib/leads/create-lead.test.ts \
  src/lib/leads/adapters.test.ts
```

### 5.3 Office/CRM request presentation

- [ ] Add failing tests in `src/lib/ops/workflow.test.ts` for pure
  `requestIntakeType`, `formatRequestType`, `formatRequestLocation`, and
  `formatRequestServices` helpers derived from `answers.intakeType`.
- [ ] For general inquiries, require “General inquiry,” “Location not
  supplied,” and no estimate service/project label. For estimates, preserve
  all existing labels and formatting.
- [ ] Update `src/app/app/requests/page.tsx` to display a Type column and use
  those helpers. Keep `formatCompany`: company when supplied, otherwise the
  stored first/last name.
- [ ] Update `src/app/app/requests/[id]/page.tsx` so general inquiries show an
  Inquiry section with `answers.message`, hide the estimate Project block, and
  do not offer automatic opportunity/site conversion. If project work emerges,
  staff starts a new estimate request with confirmed project data through the
  existing flow; do not add a reclassification feature.
- [ ] Run:

```bash
npx vitest run \
  src/lib/ops/workflow.test.ts \
  src/lib/leads/adapters.test.ts \
  src/lib/leads/create-lead.test.ts
```

### 5.4 Internal and visitor email

- [ ] Add failing tests that split comma-separated `LEAD_NOTIFY_TO`, trim
  whitespace, reject empty/invalid recipients, remove duplicates, and pass a
  string array to Resend.
- [ ] Add failing tests for branch-specific internal subjects/body and
  branch-specific visitor confirmation.
- [ ] Assert Michael's internal address is supplied only through deployment
  configuration and does not appear in public content constants.
- [ ] Refactor `sendResendEmail` in `src/lib/leads/adapters.ts` to accept
  `to: string[]` and send that array unchanged.
- [ ] Document comma-separated `LEAD_NOTIFY_TO` in `.env.example` and
  `README.md` without committing recipient values.
- [ ] Run:

```bash
npx vitest run \
  src/lib/leads/email.test.ts \
  src/lib/leads/adapters.test.ts
```

### 5.5 Survey reducer, UI, and API

- [ ] Write failing pure tests in
  `src/components/estimate-survey/survey-flow.test.ts` for the first branch
  question, complete estimate journey, short general journey, branch
  switching, per-step validation, progress, branch-aware draft restore, and
  exact API payload mapping.
- [ ] Implement those transitions and payload mapping in the pure
  `src/components/estimate-survey/survey-flow.ts` reducer/view model, then wire
  it into
  `src/components/estimate-survey/estimate-survey.tsx` using existing shadcn/ui
  form controls and error patterns.
- [ ] Keep focus targets and accessible error text in reducer outputs so the
  component wiring and browser pass can verify them without adding a DOM test
  dependency.
- [ ] Keep spam protection, rate limiting, upload ownership, idempotency,
  notification failure handling, signed thanks URL, and visitor confirmation.
- [ ] Add API route tests for both payloads, malformed branch values, spam,
  rate limit, duplicate submission, mail failure, and successful persistence.
- [ ] Run:

```bash
npx vitest run \
  src/components/estimate-survey/survey-flow.test.ts \
  src/app/api/leads/route.test.ts \
  src/lib/leads/create-lead.test.ts
```

### 5.6 Pre-production recipient verification

- [ ] Keep `.env.example` value-free:
  `LEAD_NOTIFY_TO=` with a comment that production accepts a comma-separated
  administrator/Michael recipient list.
- [ ] Verify comma splitting, trimming, validation, de-duplication, Resend array
  shape, and failure status entirely through
  `src/lib/leads/adapters.test.ts` and `src/lib/leads/create-lead.test.ts`.
- [ ] Use `npm run dev` for browser flow checks. Once the known Cloudflare auth
  baseline is restored, use `npm run preview` for the OpenNext/Cloudflare
  runtime check.
- [ ] Local or preview recipient values live only in an ignored local
  environment file supplied by an authorized operator. Do not print them or
  add them to commands, docs, fixtures, screenshots, or versioned config.
- [ ] Do not run `wrangler secret put`, `npm run deploy`, or any production
  submission in this phase. Production release remains blocked until Phase
  8.6.

---

## Phase 6: Route SEO and structured data

### Framework documentation gate

- [x] Before editing metadata code, read the installed Next.js 16.3.8 guides
  under `node_modules/next/dist/docs/` for metadata, sitemap, robots, route
  groups, and image behavior.
- [x] Record the exact guide paths consulted in the implementation review.

Implementation review — framework guides consulted:

- `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`

### Files

- Modify: `src/app/layout.tsx`
- Modify: `src/app/(marketing)/page.tsx`
- Modify: every new marketing `page.tsx` from Phase 4
- Modify: `src/app/(marketing)/request-estimate/page.tsx`
- Modify: `src/app/(marketing)/request-estimate/page.test.tsx`
- Create: `src/app/sitemap.ts`
- Create: `src/app/sitemap.test.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/robots.test.ts`
- Modify: `src/lib/site-schema.ts`
- Create: `src/lib/site-schema.test.ts`
- Modify: `src/content/site.test.ts`

### 6.1 Schema graph tests

- [x] Write failing tests for stable `Organization` and `WebSite` IDs and
  applicable `LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`,
  `ContactPoint`, and `WebPage` nodes.
- [x] Assert all URLs are canonical `https://strongfoam.com` URLs.
- [x] Assert service schema uses visible service copy and stored/display
  mappings correctly.
- [x] Assert held locations, unapproved partners, internal-only email
  recipients, and banned claims cannot enter JSON-LD.
- [x] Implement composable graph helpers in `src/lib/site-schema.ts`.
- [x] Run each completed JSON-LD graph through
  `assertMarketingClaimsSafe(graph, "json-ld")` from
  `src/content/claims.ts`.
- [x] Run:

```bash
npx vitest run src/lib/site-schema.test.ts src/content/site.test.ts
```

### 6.2 Metadata, sitemap, and robots

- [x] Extend the route matrix with failing assertions for unique title,
  description, canonical, Open Graph, and Twitter metadata using approved
  media.
- [x] In `src/app/(marketing)/request-estimate/page.test.tsx`, assert the
  request page's title, description, canonical, Open Graph, and Twitter data
  explicitly describe both estimate and general-inquiry paths and reference
  only approved media.
- [x] Add failing tests in `src/app/sitemap.test.ts` for every indexable
  marketing route and exclusion of `/request-estimate/thanks`, staff, field,
  proposal-token, and API routes.
- [x] Add failing tests in `src/app/robots.test.ts` that permit public
  marketing routes and preserve protection/exclusion for nonpublic surfaces.
- [x] Implement `src/app/sitemap.ts`, `src/app/robots.ts`, root defaults, and
  route-specific metadata.
- [x] Run every completed metadata object through
  `assertMarketingClaimsSafe(metadata, "metadata")`.
- [x] Add page-specific JSON-LD scripts generated from typed content.
- [x] Run:

```bash
npx vitest run \
  src/lib/site-schema.test.ts \
  src/app/sitemap.test.ts \
  src/app/robots.test.ts \
  "src/app/(marketing)/request-estimate/page.test.tsx" \
  "src/app/(marketing)/marketing-routes.test.tsx"
```

---

## Phase 7: Approved-media optimization

### Files

- Modify: `scripts/audit-sfi-media.mjs`
- Modify: `scripts/audit-sfi-media.test.ts`
- Modify: `scripts/sync-public-media.mjs`
- Modify: `scripts/sync-public-media.test.ts`
- Modify: `assets/source-media-inventory.json`
- Modify: `assets/source-media-decisions.json`
- Modify: `assets/source-media-manifest.json`
- Modify: `assets/MANIFEST.md`
- Add optimized outputs only beneath approved curated folders in `assets/`

### 7.1 Derivative contract

- [ ] Add failing audit tests that every published media reference has a
  source master, expected derivative dimensions/format, public destination,
  alt/decorative decision, and existing output file.
- [ ] Define explicit derivative profiles for hero, section, card, gallery,
  logo, poster, and social-share use in the audit script.
- [ ] Use `sharp` for image resize/format conversion and metadata stripping.
  Use `ffmpeg` for MP4/WebM transcodes, poster extraction, and removal of unused
  audio; use `ffprobe` to verify codec, dimensions, duration, and audio streams.
- [ ] Generate derivatives only for `publish` records; assert `hold`,
  `duplicate`, and `reject` records never produce public outputs.
- [ ] Preserve source masters in curated `assets/` folders.
- [ ] Run:

```bash
npx vitest run \
  scripts/audit-sfi-media.test.ts \
  scripts/sync-public-media.test.ts
```

### 7.2 Images and logos

- [ ] Produce responsive image derivatives with aspect ratios appropriate to
  their approved placements.
- [ ] Preserve transparency and safe padding for approved logos.
- [ ] Do not upscale low-resolution third-party marks; retain them as held
  until an official file is supplied.
- [ ] Verify the Strong Foam and Strong Fire lockups against their approved
  vector masters.

### 7.3 Video

- [ ] For each approved video, decide whether the source audio is required.
- [ ] Create web-safe MP4/WebM encodes where browser support or file size
  warrants them, strip unused audio, and generate an approved poster.
- [ ] Ensure meaningful video content has captions or equivalent nearby text.
- [ ] Ensure reduced-motion and autoplay-blocked states show the poster and
  preserve all information.

### 7.4 Public sync and broken-reference gate

- [ ] Run:

```bash
npm run media:sync
node scripts/audit-sfi-media.mjs check \
  --source "SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json \
  --public-root public/media
```

- [ ] Verify every typed content media path exists beneath `public/media/`.
- [ ] Verify no raw source dump, contact sheet, held asset, rejected asset, or
  internal review artifact is publicly served.
- [ ] Confirm Cloudflare/OpenNext image behavior from current documentation and
  runtime output; do not assume Vercel's image optimization service.

---

## Phase 8: Documentation, verification, and post-plan review

### Files

- Modify: `README.md`
- Modify: `docs/CHANGELOG.md`
- Modify: `docs/copy-overlay-readiness.md`
- Modify: `docs/scroll-world-direction.md`
- Modify: `docs/sfi-source-copy-inventory.json`
- Modify: `docs/sfi-source-copy-decisions.json`
- Modify: `docs/sfi-source-copy-audit.json`
- Modify: `docs/sfi-source-copy-audit.md`
- Modify: `docs/sfi-media-audit.md`
- Modify: `assets/source-media-inventory.json`
- Modify: `assets/source-media-decisions.json`
- Modify: `assets/MANIFEST.md`
- Modify: `assets/SCROLL-BG-SHORTLIST.md`
- Review:
  `docs/superpowers/specs/2026-10-13-marketing-content-and-media-expansion-design.md`
- Review:
  `docs/superpowers/plans/2026-10-13-marketing-content-and-media-expansion.md`

### 8.1 Documentation

- [ ] Update `README.md` with the final route map, intake branches,
  comma-separated `LEAD_NOTIFY_TO` behavior, approved-media pipeline, and
  verification commands.
- [ ] Add a dated entry at the top of `docs/CHANGELOG.md` with behavior,
  rationale, code touchpoints, data-flow impact, API/schema impact, and
  verification results.
- [ ] Update `docs/copy-overlay-readiness.md` with published, held, and rejected
  content decisions.
- [ ] Ensure `docs/sfi-source-copy-audit.json` records every source
  requirement as `published`, `held`, or `rejected` with a reason, and that
  `docs/sfi-source-copy-audit.md` summarizes the same totals and conflicts
  joined from `docs/sfi-source-copy-inventory.json` and the independently
  human-maintained `docs/sfi-source-copy-decisions.json`.
- [ ] Update `docs/scroll-world-direction.md` with the focused-homepage role,
  interior route relationship, approved media placement, and reduced-motion
  behavior.
- [ ] Ensure `docs/sfi-media-audit.md`, `assets/MANIFEST.md`, and
  `assets/SCROLL-BG-SHORTLIST.md` agree with
  `assets/source-media-inventory.json`, `assets/source-media-decisions.json`,
  and the compiled `assets/source-media-manifest.json`.

### 8.2 Automated verification

- [ ] Run the focused media checks:

```bash
npx vitest run \
  scripts/audit-sfi-media.test.ts \
  scripts/sync-public-media.test.ts
npm run media:sync
node scripts/audit-sfi-media.mjs check \
  --source "SFI WEBSITE" \
  --inventory assets/source-media-inventory.json \
  --decisions assets/source-media-decisions.json \
  --manifest assets/source-media-manifest.json \
  --public-root public/media
node scripts/audit-sfi-copy.mjs check \
  --source "SFI WEBSITE" \
  --inventory docs/sfi-source-copy-inventory.json \
  --decisions docs/sfi-source-copy-decisions.json \
  --audit docs/sfi-source-copy-audit.json \
  --report docs/sfi-source-copy-audit.md
```

- [ ] Run focused content, route, intake, and schema checks:

```bash
npx vitest run \
  scripts/audit-sfi-copy.test.ts \
  src/content/claims.test.ts \
  src/content/site.test.ts \
  src/content/services.test.ts \
  src/content/projects.test.ts \
  src/content/partners.test.ts \
  src/components/site-header-model.test.ts \
  src/components/site-header.test.ts \
  src/components/marketing/marketing-page-model.test.ts \
  src/components/marketing/marketing-components.test.tsx \
  "src/app/(marketing)/marketing-routes.test.tsx" \
  "src/app/(marketing)/request-estimate/page.test.tsx" \
  src/components/estimate-survey/survey-flow.test.ts \
  src/db/schema.test.ts \
  src/lib/leads/schema.test.ts \
  src/lib/leads/idempotency.test.ts \
  src/lib/leads/qualify.test.ts \
  src/lib/leads/create-lead.test.ts \
  src/lib/leads/email.test.ts \
  src/lib/leads/adapters.test.ts \
  src/lib/ops/workflow.test.ts \
  src/app/api/leads/route.test.ts \
  src/lib/site-schema.test.ts \
  src/app/sitemap.test.ts \
  src/app/robots.test.ts
```

- [ ] Run the complete local quality suite:

```bash
npm test
npm run lint
```

- [ ] After Wrangler authentication is valid, run:

```bash
npm run build
```

- [ ] If build still reports Cloudflare API code `10000`, record it as the
  known authentication baseline with command output and do not describe the
  application build as passing.
- [ ] If build reaches application compilation and reports a new code failure,
  fix that failure and rerun tests, lint, and build.

### 8.3 Browser and accessibility verification

- [ ] Start the site:

```bash
npm run dev
```

- [ ] Test `/`, `/about`, `/services`, all four service routes, `/projects`,
  `/partners`, `/locations`, `/contact`, `/request-estimate`, and
  `/request-estimate/thanks` at desktop and mobile widths.
- [ ] Verify primary navigation, mobile Sheet behavior, contextual service
  links, breadcrumbs, footer links, CTA links, and no internal 404s.
- [ ] Verify one H1, logical heading order, keyboard navigation, visible focus,
  form labels, validation announcements, contrast, touch targets, responsive
  wrapping, and absence of horizontal overflow.
- [ ] Emulate `prefers-reduced-motion: reduce`; verify motion is removed,
  stills/posters appear, and no content becomes inaccessible.
- [ ] Verify images have approved alt text or explicit decorative treatment and
  videos have posters plus captions/equivalent text where meaningful.
- [ ] Inspect page source/head for unique metadata, canonical URLs, Open Graph,
  Twitter metadata, and page-specific JSON-LD.

### 8.4 End-to-end data-flow traces

- [ ] Submit one qualified estimate and trace:
  UI branch → Zod validation → spam/rate limit → upload ownership →
  idempotency → qualification → lead storage → internal recipient array →
  visitor confirmation → notification status → signed thanks page → Calendly
  offer.
- [ ] Submit one general inquiry and trace:
  UI branch → short validation → spam/rate limit → idempotency → existing lead
  storage with explicit inquiry type → internal recipient array → visitor
  confirmation → notification status → signed thanks page without Calendly.
- [ ] Verify the local/preview configuration contract accepts two approved
  recipients and that internal addresses remain absent from public HTML,
  metadata, JSON-LD, client bundles, fixtures, and screenshots. Production
  secret presence is verified only in Phase 8.6.
- [ ] Open representative staff CRM, field, project, and proposal surfaces to
  confirm the marketing/intake change did not alter their existing routes or
  behavior.

### 8.5 Mandatory post-plan review

- [ ] Re-read the design specification and compare every acceptance criterion
  with implemented code, tests, audit records, and documentation.
- [ ] Review `git diff --stat` and `git diff` for dropped plan items, accidental
  scope expansion, raw media, secrets, internal addresses, and unrelated
  changes.
- [ ] Update this plan's checkboxes from the verification evidence, then mirror
  those statuses into attached Cursor todos. Resolve any mismatch in favor of
  this versioned plan.
- [ ] Trace one approved media record from `SFI WEBSITE/` through audit,
  approval, curated `assets/`, public sync, typed content, and rendered page.
- [ ] Trace Strong Fire from typed content through endorsement, both technical
  sections, stored service IDs, metadata, and schema.
- [ ] Trace one higher-precedence, one held, and one rejected source-copy
  requirement from its DOCX paragraph through
  `docs/sfi-source-copy-audit.json` to its final typed-content destination or
  documented exclusion reason.
- [ ] Search changed production files for disallowed scaffolding, then execute
  the shared claims-policy test:

```bash
rg -n "FIXME|HACK|XXX|not implemented" \
  src scripts assets
npx vitest run src/content/claims.test.ts
```

- [ ] Confirm every new function/component has a real call site, every route is
  reachable, every content record is consumed, and every error path has
  meaningful handling.
- [ ] Confirm tests and lint pass, and distinguish the known Cloudflare auth
  baseline from application failures in the final verification record.
- [ ] Confirm no commit or production deployment occurs before Phase 8.6 and
  explicit user approval.

### 8.6 Explicit production approval, deployment, and exact-lead verification

- [ ] Confirm Phases 1–8.5 are complete: SEO and structured data, approved
  media optimization/sync, focused and full tests, lint, successful build,
  local/preview data-flow traces, desktop/mobile accessibility checks,
  documentation, and the post-plan review all pass.
- [ ] Present the verification record and request explicit user approval for
  production secret entry, deployment, and one controlled production
  submission. Stop unless that approval is granted.
- [ ] After approval, an authorized operator sets the production value
  interactively. Do not place addresses in commands, shell history, this plan,
  README, Wrangler config, or screenshots:

```bash
npx wrangler secret put LEAD_NOTIFY_TO
npx wrangler secret list
```

- [ ] Confirm `secret list` shows only the name `LEAD_NOTIFY_TO`, then deploy
  the existing `strongfoam` Worker:

```bash
npm run deploy
```

- [ ] In a separate terminal, observe production errors without printing
  environment values:

```bash
npx wrangler tail strongfoam --format pretty --status error
```

- [ ] Submit one controlled general inquiry through the deployed
  `/request-estimate` page. From the signed thanks response/redirect, copy only
  the `lid` UUID. Do not copy, print, store, or query with the signed `k` token.
- [ ] Validate the copied UUID, query that exact lead ID, and unset it
  afterward:

```bash
read -r "CONTROLLED_LEAD_ID?Paste the lid UUID from the signed thanks URL: "
node -e '
  const id = process.argv[1] ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    console.error("Invalid lead UUID");
    process.exit(1);
  }
' "$CONTROLLED_LEAD_ID" || {
  unset CONTROLLED_LEAD_ID
  echo "Aborting before SQL: CONTROLLED_LEAD_ID failed UUID validation." >&2
  exit 1
}
npx wrangler d1 execute strongfoam --remote --command \
  "SELECT id, notify_status,
          json_extract(answers, '$.intakeType') AS intake_type
   FROM leads
   WHERE id = '${CONTROLLED_LEAD_ID}'
   LIMIT 1;"
unset CONTROLLED_LEAD_ID
```

- [ ] Treat the validation gate as mandatory and fail closed: no command that
  interpolates `CONTROLLED_LEAD_ID` may run unless the validator exits zero.
- [ ] Require the returned `id` to equal the signed response's `lid`,
  `notify_status = 'sent'`, and `intake_type = 'general'`. Never substitute an
  `ORDER BY created_at DESC` or latest-lead query.
- [ ] Confirm both approved internal inboxes received the notification and the
  controlled visitor received confirmation. If any check fails, stop release,
  inspect Resend delivery logs and Worker errors, correct configuration
  interactively, rerun the pre-production gates affected by the correction,
  obtain renewed explicit deployment approval, and repeat this exact-ID check.

## Completion criteria

The implementation is complete only when every design-spec acceptance
criterion has evidence, all 576 media records have final outcomes, the media
approval gate is recorded, every source-copy requirement has a final
`published`, `held`, or `rejected` outcome with a reason, both intake traces
pass, route and accessibility checks pass, documentation matches behavior, and
the post-plan review finds no unresolved gap. The known Cloudflare
authentication baseline must either be resolved for a green build or reported
verbatim as an environment blocker. If production release is approved, Phase
8.6 must also confirm the exact signed-response lead ID, sent notification
status, general intake type, and both approved inbox deliveries.
