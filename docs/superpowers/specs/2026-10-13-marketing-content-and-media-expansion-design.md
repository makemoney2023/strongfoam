# Marketing Content and Media Expansion — Design Specification

**Date:** 2026-10-13
**Product:** Strong Foam Insulation public website
**Status:** Approved architecture; implementation pending
**Authoritative implementation plan:** `docs/superpowers/plans/2026-10-13-marketing-content-and-media-expansion.md`

## Executive summary

Strong Foam will expand its cinematic single-page marketing experience into a
focused homepage plus dedicated company, service, project, partner, location,
and contact routes. The homepage remains the concise overview and primary
conversion surface. Interior routes provide the detail required by customers,
estimators, consultants, search engines, and answer engines without duplicating
the full homepage experience.

The work preserves `/request-estimate` as the only public intake system. Its
existing estimate branch, qualification, storage, notifications, Calendly
offer, CRM conversion, operations, field, and proposal behavior remain intact.
A short general-inquiry branch will use the same validation and lead pipeline
without requiring drawings, project scope, or construction timing.

Every supplied media file is governed by an auditable decision before use. The
source set contains 576 files: 544 images and 32 videos. Every file must receive
a publish, hold, duplicate, or reject outcome. Third-party supplier, client, and
contractor logos are publishable only after identity, current relationship,
ownership, and publication permission are approved.

## Locked decisions

1. Use a focused homepage plus dedicated interior pages.
2. Publish four service routes:
   - spray foam insulation;
   - Strong Fire Protection, combining cementitious passive fire protection
     and intumescent coatings as separate technical sections;
   - air-vapour barriers;
   - SPF roofing.
3. Present Strong Fire Protection as a Strong Foam-endorsed service identity,
   not as an unrelated business or separate website.
4. Build supplier and client/contractor partner sections, but render only
   identifiable, current, permission-approved third-party logos.
5. Keep `/request-estimate` as one intake system with an initial
   `estimate`/`general inquiry` branch.
6. Notify the configured administrator recipient and Michael internally. Do
   not expose Michael's direct address in public content, markup, or client
   bundles.
7. Preserve existing CRM, lead storage, operations, field, proposal, upload,
   qualification, idempotency, and notification-status behavior.
8. Import and optimize only media approved by the audit. The raw client media
   dump is not a deployable asset directory.

## Goals

- Make service, company, proof, partner, location, and contact information
  reachable on stable, indexable URLs.
- Keep the homepage visually distinctive while reducing it to a useful
  overview with clear paths to detail.
- Incorporate all usable source copy under explicit precedence and claims
  controls.
- Audit all 576 supplied media files before publication and retain the reason
  for every decision.
- Improve route-level accessibility, metadata, structured data, internal
  linking, and answer-engine readability.
- Add a low-friction general-inquiry path without creating a second form or
  weakening the estimate flow.

## Non-goals

- Replacing the existing scroll-world homepage with a generic brochure page.
- Creating a separate Strong Fire website, brand account, or intake system.
- Rebuilding CRM, operations, field, proposals, or commercial workflows.
- Publishing every supplied image or video.
- Publishing unapproved client names, project claims, faces, jobsite details,
  vehicle plates, signs, or third-party marks.
- Treating DOCX image compilations as production image assets.
- Inventing certifications, applicator status, performance guarantees,
  environmental claims, service areas, project identities, or client
  relationships.
- Exposing internal notification addresses.

## Information architecture

### Public routes

| Route | Purpose |
|---|---|
| `/` | Focused cinematic overview and primary conversion path |
| `/about` | Company story, culture, safety, mission, vision, purpose, promise, objective, and slogans |
| `/services` | Four-service overview and selection hub |
| `/services/spray-foam-insulation` | Spray foam systems and application detail |
| `/services/fire-protection` | Endorsed Strong Fire page with cementitious and intumescent sections |
| `/services/air-vapour-barriers` | Air/vapour movement, condensation, durability, and specified systems |
| `/services/spf-roofing` | SPF roofing composition, fit, limitations, weather, and installation detail |
| `/projects` | Permission-safe categorized project gallery |
| `/partners` | Approved suppliers and approved client/contractor relationships |
| `/locations` | Approved office and operating-location information |
| `/contact` | Public contact channels and intake CTA |
| `/request-estimate` | Existing intake flow with estimate and general-inquiry branches |
| `/request-estimate/thanks` | Existing signed confirmation page; remains `noindex` |

The primary navigation links to About, Services, Projects, Partners, Locations,
Contact, and Request Estimate. Service cards and contextual links connect the
services hub to all four service routes. Contact actions enter the shared intake
flow rather than opening a separate form.

## Route content

### Homepage

The homepage contains a concise hero, credibility statement, four service
paths, an endorsed Strong Fire feature, mission/slogan strip, selected approved
projects, an approved partner strip, coverage summary, visible FAQ, and an
estimate CTA. It does not repeat all interior-page copy.

### About

The About page covers:

- the 2016 company story, subject to the founding-date approval field;
- ICI and multi-unit focus;
- employee culture and safety;
- mission, vision, purpose, promise, and objective;
- “Creating Strong Relationships”;
- “Go Beyond. Go Strong.”;
- “Strong People. Strong Service. Strong Results.”

Conflicting dates or experience-duration claims are held in content metadata
until approved. The rendered page never selects a conflicting value silently.

### Services

The services hub introduces the four public service families and links each to
its detail route. Display routes and stored intake/CRM service identifiers are
separate fields so URLs can change without changing historical records.

### Spray foam insulation

The page explains a systems approach, conditioned-air loss, seamless
application, air sealing, energy performance, suitable assemblies, and the
role of the project specification. Claims use conditional language such as
“helps,” “supports,” and “when specified and applied correctly.”

### Strong Fire Protection

`/services/fire-protection` displays the approved Strong Fire lockup with a
plain endorsement such as “Strong Fire Protection, a Strong Foam service.” It
contains distinct cementitious passive-fire-protection and intumescent-coating
sections. Each section explains use cases, safety, specification-led selection,
and appropriate commercial, industrial, infrastructure, or maintenance
contexts. The two scopes continue to map to the existing `fireproofing` and
`intumescent` intake/CRM identifiers.

### Air-vapour barriers

The page explains air infiltration and exfiltration, vapour movement,
condensation risk, wall durability, transitions, and specification-led
installation. Product-family names are used only as evidenced examples and do
not imply current certification, exclusivity, or applicator status.

### SPF roofing

The page covers system composition, UV-protective coatings, substrates,
recover applications, slope and drainage, suitable conditions, technical
limitations, dew point, weather restrictions, and installer experience. It
does not imply that SPF roofing is suitable for every roof or weather
condition.

### Projects

The projects page is a categorized, permission-safe gallery. A project appears
only when its media is approved and its caption contains no unapproved client
name, address, performance result, or project claim. Generic categories and
trade descriptions are preferred until named-project permission exists.

### Partners

Partners are split into approved suppliers and approved client/contractor
relationships. A card renders only when all of the following are present:

- a stable partner identifier and display name;
- relationship category;
- current-relationship approval;
- publication-permission approval;
- approved official logo path;
- usable alternative text.

Unknown or low-resolution marks remain held. A low-resolution logo is not
upscaled; an official replacement is requested.

### Locations

The locations page may describe the head office, Kitchener operations,
London/Dorchester, and GTA/Woodbridge. Each location carries an approval state
for address, active status, public label, and service-area wording. Unconfirmed
GTA operating status and other operational claims remain held and are omitted
from visible copy and structured data.

### Contact

The contact page shows the approved phone number, public estimating/admin
channels, approved locations, social links, and one CTA into
`/request-estimate`. It never renders internal notification-only addresses.

## Content sources and governance

### Precedence

When sources disagree, copy is reconciled in this order:

1. `SFI WEBSITE/Website revision dec. 15, 2020.docx`
2. `SFI WEBSITE/STRONG FOAM MISSION STATEMENT CK EDITS.docx`
3. `SFI WEBSITE/Website Text 2.docx`
4. Older source documents as supporting evidence only

The higher-priority source wins only when the statement is safe and not marked
for explicit approval. Every source requirement is inventoried in the canonical
source-copy audit and receives exactly one final outcome: `published`, `held`,
or `rejected`. Every outcome includes a reason; published requirements also
identify their typed-content field and public route, while held or rejected
requirements identify the conflict, approval dependency, claims guard, or
superseding source that prevents publication.

### Source-copy audit contract

The copy audit has four separate artifacts:

- `docs/sfi-source-copy-inventory.json` is generated extraction evidence and
  may be replaced only by an explicit extraction run;
- `docs/sfi-source-copy-decisions.json` contains human precedence/publication
  decisions and is never created, normalized, or overwritten by extraction,
  compilation, or checking;
- `docs/sfi-source-copy-audit.json` is the deterministic compiled join used by
  acceptance checks;
- `docs/sfi-source-copy-audit.md` is the compiled human-readable summary.

The inventory covers every distinct requirement extracted from all DOCX source
documents under `SFI WEBSITE/`, including supporting older documents. The
inventory plus its separately maintained decision compile into records that
contain:

- a deterministic requirement ID, source-relative file path, paragraph
  locator/hash, and verbatim source excerpt;
- precedence rank, normalized requirement, topic, and conflict-group ID when
  another source addresses the same fact;
- one final `published`, `held`, or `rejected` outcome and a nonempty reason;
- for `published`, the typed-content field and one or more destination routes;
- for `held`, the specific approval or evidence needed before publication;
- for `rejected`, the higher-precedence source or claims guard that controls.

The audit fails completeness checks when a source document or extracted
requirement is absent, when a record has no final outcome/reason, or when a
published record has no implementation destination. `--check` recomputes
extraction and the compiled audit in memory and never writes any artifact;
tests prove that inventory, decisions, compiled JSON, and report bytes and
modification times remain unchanged. Applying precedence is therefore
executable and reviewable rather than an informal editorial step.

### Claims guards

- `src/content/claims.ts` is the single claims-policy module. It exports the
  canonical banned-term patterns and recursive assertion used by source-copy
  decisions, typed visible copy, metadata, image alt text, and JSON-LD.
- The canonical banned terms are `greenest`, `unrivalled`, `best`,
  `guaranteed`, and `always`, matched case-insensitively as whole words. The
  same guard rejects equivalent configured absolute superiority,
  environmental, performance, or safety claims.
- Treat 2016/2020 founding references, 50/100-year experience references,
  current GTA status, supplier relationships, named clients, applicator
  status, and named projects as explicit approval fields.
- Keep technical limitations, weather constraints, substrate conditions,
  specification dependencies, and maintenance requirements beside benefits.
- Do not turn product-family evidence into a certification, endorsement, or
  exclusivity claim.
- Visible copy, metadata, alt text, and JSON-LD follow the same guard rules.

Typed content modules enforce route uniqueness, required sections, approval
states, approved media references, alt text, and the shared claims assertion
before a page can render the record. Metadata builders and schema graph
builders call that same assertion on their completed output; no surface keeps a
separate term list.

## Media audit and publication model

### Source-set baseline

- Total media files: **576**
- Images: **544**
- Videos: **32**
- Exact-unique images: **484**
- Exact duplicate groups: **47**
- Redundant files in those groups: **60**
- Low-resolution images: **34**
- Corrupt images found by the structural baseline: **0**

These numbers are acceptance baselines. The reproducible audit reports a
count mismatch rather than normalizing it away.

### Required record for every file

Every one of the 576 files receives:

- deterministic source ID and source-relative path;
- file type, byte size, cryptographic hash, dimensions, orientation, and
  duration/frame-sample metadata where applicable;
- exact-duplicate group and preferred keeper;
- subject and trade category;
- technical-quality assessment for resolution, crop, exposure, blur, and
  orientation;
- potential placement: hero, section, card, gallery, logo, decorative, or
  unsuitable;
- safety/privacy review for PPE, faces, vehicle plates, customer signs,
  addresses, and sensitive jobsite details;
- ownership, relationship, and publication-rights status;
- alt text or an explicit decorative designation;
- final `publish`, `hold`, `duplicate`, or `reject` status;
- a specific decision reason.

The audit has three separate artifacts:

- `assets/source-media-inventory.json` is generated structural evidence and may
  be replaced only by an explicit inventory run;
- `assets/source-media-decisions.json` contains human review decisions and is
  never created, overwritten, or normalized by inventory generation;
- `assets/source-media-manifest.json` is the deterministic compiled join used
  by content and public-media checks.

Repository manifest compilation occurs only after every media item has received
human review and a decision. Earlier compiler TDD uses temporary fixture
inventory/decision files and never writes the repository manifest.

`--check` is strictly read-only. It recomputes expected inventory/manifest
content in memory, validates decisions and public references, and exits
non-zero on drift. Tests compare file hashes and modification times before and
after `--check` to prove that it writes nothing.

### Audit and derivative mechanics

- DOCX copy extraction uses the `mammoth` package's raw-text extraction,
  preserving paragraph order and blank-paragraph boundaries before stable
  locators/hashes are calculated.
- Media preflight requires both `ffmpeg` and `ffprobe` on `PATH` and records
  their version lines. A missing binary stops the audit before any output is
  written.
- An image is low resolution when its shorter pixel edge is less than 720
  pixels. The threshold is fixed; the expected 34-file baseline is not changed
  to accommodate a scan.
- Exact duplicates are grouped by SHA-256. The deterministic keeper is the
  candidate with the greatest pixel area, then greatest byte size, then the
  lexicographically smallest normalized source-relative path.
- Every video is sampled at five deterministic timestamps: 0.25 seconds, 25%,
  50%, 75%, and `duration - 0.25 seconds`, clamped to the media duration and
  deduplicated for short clips. `ffprobe` supplies duration and `ffmpeg`
  extracts frames.
- `sharp` supplies image metadata, contact-sheet inputs, metadata stripping,
  resizing, and approved responsive image derivatives. `ffmpeg` supplies
  approved MP4/WebM encodes, poster frames, and audio removal.
- Review directories come from `mktemp -d` below the normalized
  `${TMPDIR:-/tmp}`. Cleanup uses a shell trap and refuses `rm -rf` unless the
  resolved path matches the generated `strongfoam-sfi-media-audit.*` prefix.

### Visual review

Automation inventories and samples; it does not make the final editorial or
rights decision. Contact sheets are generated outside deployable directories.
Reviewers inspect every exact-unique image and representative frames from every
video. The user approves the visual shortlist, third-party logo publish list,
and video selections before route work references those files.

### Asset flow

```text
SFI WEBSITE/
  -> read-only structural inventory and hashes
  -> visual/privacy/rights review
  -> publish | hold | duplicate | reject decision for all 576 files
  -> compile source-media-manifest.json from reviewed decisions
  -> user approval gate
  -> approved keepers copied into assets/brand, assets/projects,
     assets/backgrounds, or assets/partners
  -> scripts/sync-public-media.mjs
  -> public/media/*
  -> typed content references
  -> Next.js marketing routes
```

Raw files and contact sheets are not copied wholesale into `assets/` or
`public/`. Vector Strong Foam and Strong Fire PDFs are the preferred brand
masters. DOCX compilations are reference evidence only.

## Shared UI architecture

Marketing content is server-rendered by default. Shared marketing components
provide interior heroes, service layouts, galleries, partner grids, location
cards, breadcrumbs, CTA bands, and the footer. Existing shadcn/ui primitives
and the current Navigation Menu/Sheet patterns remain the UI foundation.

Browser-only code is limited to interactions and motion. GSAP and scroll-world
behavior stay isolated in client components. Every moving or video surface has
a useful still state; content remains readable when JavaScript, autoplay, or
animation is unavailable.

UI tests use the existing Vitest `node` environment. Server-compatible
marketing components are rendered with `react-dom/server`; no browser testing
dependency is added. The estimate survey moves branch transitions, validation,
progress, draft restoration, and payload mapping into a pure reducer/view-model
module tested without a DOM. Browser verification remains the final check for
focus, Sheet behavior, and real input events.

## Intake and notification data flow

```text
/request-estimate
  -> choose estimate or general inquiry
  -> branch-specific Zod validation
  -> spam, rate-limit, upload-ownership, and idempotency checks
  -> existing lead store and CRM-compatible record
  -> internal email to configured admin + Michael recipient list
  -> visitor confirmation
  -> persisted notification status
  -> signed /request-estimate/thanks URL
```

### Estimate branch

The existing project type, province, services, role, building type, timeline,
drawings, notes, company, contact, upload, qualification, and Calendly behavior
remains unchanged. Existing service IDs remain valid.

### General-inquiry branch

The short branch collects name, email, phone, optional company, message, and
consent. It does not require project type, province, services, role, drawings,
timeline, or uploads. It enters the existing lead pipeline with an explicit
`general` inquiry type and secondary-intake status. It does not offer Calendly
automatically.

The existing `leads` schema requires non-null estimate-shaped columns. It has no
lead-level CHECK constraint on their values, so general inquiries use this
explicit mapping without a database migration:

| Input or stored field | General-inquiry mapping |
|---|---|
| `firstName`, `lastName` | Separate required user inputs; stored unchanged in their required columns |
| `email`, `phone` | Required user inputs; stored unchanged |
| `company` | Trimmed optional input, or `""` |
| `projectType` | `"general_inquiry"` sentinel |
| `city` | `""` |
| `province` | `"not_applicable"` sentinel |
| `services`, `recommendedServices`, `files` | Empty arrays |
| `status` | `"secondary"` |
| `bookingStatus` | `"none"` |
| `answers` | Full payload including `intakeType: "general"` and `message` |

`src/db/schema.ts` and migrations remain unchanged. The discriminator lives in
the existing JSON `answers` column, while the explicit sentinels satisfy the
current non-null columns without inventing a location, service, or construction
scope.

The Office request list and detail screen read `answers.intakeType`. General
rows display “General inquiry,” “Location not supplied,” and no service/project
labels. The detail page shows an “Inquiry” section with the message instead of
the estimate Project block. Existing `formatCompany` behavior displays the
company when supplied and otherwise the person's first/last name. Automatic
opportunity/site creation is not added; a general inquiry remains a request
for follow-up. If it becomes project work, staff starts a new estimate request
with confirmed project fields through the existing estimate workflow; this
change does not add a reclassification feature.

### Notification recipients

`LEAD_NOTIFY_TO` accepts a comma-separated list, trims and validates each
address, removes duplicates, and passes an address array to Resend. Deployment
configuration includes the approved administrator and Michael recipients.
Only public addresses from typed site content appear in pages or structured
data.

Notification failure keeps the saved lead, records `notifyStatus: "failed"`,
and returns the existing meaningful visitor result. It does not discard or
duplicate the request.

Production configuration stores `LEAD_NOTIFY_TO` as a Cloudflare Worker secret
containing the approved comma-separated recipient list. An authorized operator
does not set that production secret or deploy during implementation. Before
release, local development and Cloudflare preview validate routes, intake
behavior, and configuration without a production write. Production secret
entry and deployment occur only after SEO/media verification, the full tests,
lint, build, accessibility/browser checks, both data-flow traces, documentation,
the post-plan review, and explicit user approval.

After the approved production deployment, the controlled general inquiry's
signed thanks response supplies its `lid` UUID. Verification queries D1 by that
exact lead ID, never by “latest lead,” while omitting the signed `k` token and
all names, contact details, message text, recipient values, and secret values
from logs and commands.

## SEO and structured data

Every indexable route has:

- a unique title and description;
- a canonical URL on `https://strongfoam.com`;
- Open Graph and Twitter metadata using approved media;
- crawlable headings and answer-first body copy;
- internal links and a visible breadcrumb trail where appropriate;
- inclusion in `src/app/sitemap.ts`;
- robots behavior from `src/app/robots.ts`.

`/request-estimate` receives route-specific title, description, canonical,
Open Graph, and Twitter metadata that describe both estimate and general
inquiry paths and use only approved media. Its metadata is tested in
`src/app/(marketing)/request-estimate/page.test.tsx`.

JSON-LD is composed from the same typed content that renders the page. The
graph uses the applicable `Organization`, `LocalBusiness`, `Service`,
`FAQPage`, `BreadcrumbList`, `ContactPoint`, `WebSite`, and `WebPage` types.
Schema does not include held locations, unapproved partners, hidden claims, or
text not supported by visible page content. `/request-estimate/thanks` remains
excluded from indexing and the sitemap.

## Accessibility requirements

- Semantic landmarks, one descriptive H1 per route, logical heading order, and
  descriptive link text.
- Full keyboard access with visible focus and a working mobile navigation
  close/focus cycle.
- Approved alt text for informative images; empty alt text for intentionally
  decorative images.
- Captions or equivalent text for meaningful video content, posters for video,
  and no required information available only through motion.
- `prefers-reduced-motion` disables nonessential transitions and supplies a
  stable still presentation.
- Sufficient color contrast, touch target size, responsive text, and no
  horizontal overflow at supported mobile widths.
- Form fields have persistent labels, accessible validation messages, error
  summaries where useful, and branch changes that preserve focus.

## Performance and deployment

- Server components carry page content; client JavaScript is limited to
  interaction and motion.
- Approved images receive purpose-specific responsive derivatives.
- Selected videos may receive web-safe MP4/WebM encodes, stripped unused
  audio, and poster images.
- Cloudflare/OpenNext behavior is verified before choosing image-delivery
  settings; Vercel image optimization is not assumed.
- The existing `assets/` to `public/media/` synchronization remains the only
  public media publication path.

## Known baseline issue

As of 2026-10-13, `npm run build` fails before application compilation because
Next.js/OpenNext establishes a remote Cloudflare development connection for
bindings and that session is not authenticated. The observed error is:

```text
This Worker uses bindings that need to run remotely, even when developing
locally, but the remote session could not be authenticated.
APIError code 10000
```

This is a pre-existing environment/authentication baseline, not an accepted
application failure. Focused tests and lint remain required during
implementation. Final build verification must be rerun after an authorized
operator restores Wrangler authentication with `npx wrangler whoami` and, if
needed, `npx wrangler login`. No credentials are added to source control.

## Workflow authority

Taskmaster MCP authentication was skipped for this approved implementation, and
the installed legacy Taskmaster CLI expects an incompatible task-file layout.
The versioned implementation plan at
`docs/superpowers/plans/2026-10-13-marketing-content-and-media-expansion.md` is
the durable authoritative task/status record. Its checkboxes are updated with
verified work. Attached Cursor todo statuses mirror those checkboxes for the
current session; they do not replace the versioned tracker. This exception does
not change the TDD, review, documentation, or verification gates.

## Acceptance criteria

- [ ] The homepage is a focused overview and all approved public routes are
  reachable from primary or contextual navigation.
- [ ] `/about`, `/services`, all four service routes, `/projects`, `/partners`,
  `/locations`, and `/contact` render server-readable content.
- [ ] Strong Fire is visibly endorsed by Strong Foam, with cementitious and
  intumescent scopes presented separately on one route.
- [ ] Every source-copy requirement has a machine-checked `published`, `held`,
  or `rejected` outcome and reason; every published requirement identifies its
  typed-content field and route.
- [ ] Generated copy inventory, human copy decisions, compiled audit, and
  report remain separate; read-only `--check` never creates, normalizes, or
  overwrites human decisions and leaves all four artifacts unchanged.
- [ ] Banned absolute claims and unapproved factual conflicts do not appear in
  visible copy, metadata, alt text, or structured data, and all four surfaces
  use the shared claims-policy module.
- [ ] All 576 media files have one recorded publish, hold, duplicate, or reject
  outcome and a reason.
- [ ] Generated media inventory, human decisions, and the compiled manifest
  remain separate; read-only `--check` leaves their bytes and modification
  times unchanged.
- [ ] Every unique image and representative frames from every video receive
  visual, quality, safety/privacy, rights, and placement review.
- [ ] No unapproved third-party logo, named client, named project, face,
  vehicle plate, sign, address, or sensitive jobsite detail is published.
- [ ] Only approved keepers are copied into curated `assets/` folders and
  synchronized into `public/media/`.
- [ ] The estimate branch retains current validation, qualification, Calendly,
  upload, storage, idempotency, and confirmation behavior.
- [ ] General inquiries use the same intake and storage pipeline through a
  short branch without irrelevant project questions.
- [ ] General inquiries use the documented non-null sentinel mapping without a
  schema migration, display as “General inquiry” in Office, and never show
  invented location, service, project, or opportunity data.
- [ ] The configured administrator and Michael recipients receive internal
  notifications; internal-only addresses are absent from public output.
- [ ] Cloudflare production verification confirms the secret name, both inbox
  deliveries, and a sent D1 notification status for the exact `lid` from the
  signed thanks response without printing recipient values or using a
  latest-lead query.
- [ ] Every indexable route has unique metadata, a canonical URL, internal
  links, sitemap coverage, and structured data that agrees with visible copy.
- [ ] `/request-estimate` has tested canonical, Open Graph, and Twitter metadata
  describing both intake branches.
- [ ] Keyboard, focus, reduced-motion, alternative-text, contrast, responsive,
  and form-error checks pass.
- [ ] Focused tests, the full test suite, lint, media-reference checks, browser
  checks, and end-to-end estimate/general-inquiry traces pass.
- [ ] `npm run build` passes after Cloudflare authentication is restored, or
  the exact pre-existing authentication failure is recorded separately from
  implementation results.
- [ ] README, changelog, copy-readiness, scroll-direction, media-audit, and
  asset-manifest documentation match the shipped behavior.
- [ ] Production deployment occurs only after all implementation, SEO/media,
  test, lint, build, accessibility, documentation, and post-plan gates pass and
  the user gives explicit approval.
