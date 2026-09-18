---
name: production-artifacts
description: >-
  Craft → Production → Wire contract for shippable org phases. Use when producing
  or reviewing HTML email, app routes, brand stills, video finals, social assets,
  paid creatives, design-system files, Office docs (docx/pptx/xlsx), or any Layer B
  artifact beyond business-idea markdown. Required reading for lifecycle-marketer,
  tech-lead, brand-designer, web-designer, video-producer, paid-media-manager,
  content-strategist, hardware-engineer, ceo-strategist, fundraising-lead, cfo,
  verifier, and their managers (cmo, creative-director, cto).
---

# Production Artifacts

Markdown under `docs/projects/<active>/business-idea/` is **Layer A craft** (SSOT for strategy and copy). Shippable phases also need **Layer B production** files (HTML, code, images, video, **Office**) before C-suite may treat the work as ready to launch. **Wire** (ESP, ad accounts, DNS, operator share) may stay with the operator but must be named — never silently assumed.

## Hard rules

1. **Craft ≠ shipped.** Non-empty `.md` alone does not satisfy production for shippable phases.
2. **Lease production paths** in the IC `write_lease`. Write only leased paths.
3. **`production_status` required** on handoffs for phases in the matrix below: `complete` | `skipped` | `blocked`.
4. **Skip only with reason** — document why Layer B is deferred (budget, operator waiver, Tier-1 capacity). Manager brief must repeat the skip.
5. **Ask peers for production help** via `ask_manager` (e.g. lifecycle → brand for email headers). Do not spawn peers.
6. **Teach via skill packs** listed in the matrix — read those packs before writing Layer B files.
7. **Wire is explicit** — handoff lists `wire_owner` (`operator` | seat slug | `none`) and what remains after approve.
8. **Figma ≠ Layer B.** Editing in Figma alone is not production. Export PNG/SVG/PDF (or tokens/components) into the leased path before `production_status: complete`.
9. **Verifier gate.** Shippable phases require `HANDOFFS/<phase>-verifier.md` with `verdict: pass` before C-suite may approve (see `positions/verifier/`).
10. **Design before production.** Never generate Layer B (HTML, stills, video, design-system tokens, app UI) until a **Design brief** exists that (a) cites the required design skill packs, (b) locks look/feel from brand tokens, and (c) includes generation/layout prompts. Jumping from craft MD → pixels is a reject.
11. **Design-before-Phase-9 is a dispatch refuse.** Orchestrator/OCC must not spawn Phase 9 (`design_before_build`) unless a design brief / `11-brand/MASTER.md` / `HANDOFFS/11-creative-director.md` exists, or a Locked register waiver matches design-before-build / skip design / waiver phase 9.

## Four layers

| Layer | Meaning | Typical paths |
|-------|---------|----------------|
| **Craft** | Strategy, copy, journeys, specs | `business-idea/**/*.md` |
| **Design** | Look/feel, layout system, generation prompts | `**/design/*-design-brief.md` (or `## Design brief` in craft) |
| **Production** | Importable / deployable / renderable files | `.html`, `apps/…`, images, video finals, design tokens |
| **Wire** | Live systems | ESP automations, ad accounts, DNS, analytics property |

Flow: **Craft → Design → Production → Wire**

## Design-before-production gate (mandatory)

Before any still, HTML email, video final, design-system file, or app UI production:

1. **Read** the phase’s **Required design packs** (table below) — not optional skim.
2. **Pull brand tokens** from `11-brand-system.md` (color, type, imagery rules). Do not invent a parallel palette.
3. **Write a Design brief** (file or section) that includes:
   - **Look & feel** — layout, typography, color roles, spacing, mobile rules from the design pack
   - **Component plan** — e.g. email inverted pyramid + bulletproof CTA; page sections; ad frame sizes
   - **Generation prompts** — exact prompts for headers/stills/video keyframes (camera/lens language per `photoreal-stills` when photoreal)
   - **Packs cited** — repo-relative paths of design skills actually applied
4. **Only then** render/generate Layer B from that brief (HTML from email-design rules; stills from prompts in the brief).
5. Handoff sets `design_brief_path` and lists design packs under **Packs used** with one concrete decision each.

### Design brief paths (preferred)

| Asset class | Preferred brief path |
|-------------|----------------------|
| Email | `17-channels/email/design/<journey>-design-brief.md` |
| Brand stills | `11-brand/design/<slug>-design-brief.md` |
| Page imagery | `14-pages/design/<page>-design-brief.md` |
| Video | `15-media/design/<slug>-design-brief.md` |
| Paid creatives | `19-paid/design/<slug>-design-brief.md` |
| Web / design-system | `12-web-design.md` Design brief section **or** `design-system/<venture>/DESIGN-BRIEF.md` |

Short phases may embed `## Design brief (required before production)` in the craft MD instead of a separate file — same required fields.

### Required design packs by phase

| Phase | Required design packs (read before Layer B) | Then produce with |
|-------|---------------------------------------------|-------------------|
| **9** | `design-system/<venture>/` tokens + seat Next/shadcn packs; `landing-page-design` when shipping marketing pages | App routes/components |
| **11** | `ui-ux-pro-max-skill/brand/`, `visual-style`, `visual-skills/image`, **`photoreal-stills`** | Brand stills via fal/inference |
| **12** | `ui-ux-pro-max-skill/design-system/`, `ui-styling`, `shadcn`, figma-design-to-code; **`scroll-craft`** when the landing is a scroll experience | `design-system/<venture>/` + UI stills; scrollcraft plan in `12-web-design.md` |
| **14** | Page craft + `visual-skills/image` + **`photoreal-stills`** for imagery; `landing-page-design` when HTML/app | `14-pages/assets/`; app via P9 |
| **15** | OpenMontage visual-style + storyboard craft; **`photoreal-stills`** for keyframes; **`openvid`** when source is a recording or existing clip | `15-media/openmontage/` or `15-media/openvid/` |
| **17** | **`inference-sh/email-design/`** (layout/CTA/header rules) + craft `emails/` + brand tokens; **`photoreal-stills`** for headers | `email/html/` + `email/assets/` |
| **19** | `ad-creative` / scroll-stopping packs + **`photoreal-stills`** for stills | `19-paid/creatives/` |

**Email example:** Read `email-design` → write design brief (600px, inverted pyramid, CTA table, header prompt with brand hex) → generate header still from that prompt → build HTML matching the brief. Do **not** invent HTML chrome or header prompts without the brief.

## Canonical Layer B paths

`<venture>` = active project slug from `projects/registry.json`. Paths under `docs/projects/<active>/business-idea/` unless noted.

| Asset class | Canonical path | Naming |
|-------------|----------------|--------|
| App / MVP | `apps/<venture>/` | Next app conventions |
| Design system | `design-system/<venture>/` (repo root — SSOT; do not treat `apps/<venture>/design-system/` as SSOT) | tokens, components, docs |
| Hero 3D (img2threejs) | `design-system/<venture>/3d/` | `object-sculpt-spec.json`, TypeScript factory, `review/`, `README.md` mount contract |
| Brand stills | `11-brand/assets/` | `<slug>-<w>x<h>.{png,webp,jpg}` |
| Page imagery | `14-pages/assets/` | `<page>-<slug>.{png,webp}` |
| Video finals | `15-media/openmontage/` | `<slug>-final.{mp4,webm}` |
| Demo / mockup video | `15-media/openvid/` | `<slug>-final.{mp4,webm,gif}` |
| Email HTML | `17-channels/email/html/` | `<journey>-<n>-<slug>.html` |
| Email headers | `17-channels/email/assets/` | `<journey>-header.{png,jpg}` |
| Social stills | `17-channels/social/assets/` | `<platform>-<slug>.{png,webp}` |
| Paid creatives | `19-paid/creatives/` | `<platform>-<size>-<slug>.{png,jpg}` |
| Paid video | `19-paid/openmontage/` | `<slug>-ad-final.{mp4,webm}` |
| Paid demo cutdowns | `19-paid/openvid/` | `<slug>-ad-final.{mp4,webm}` |
| Hardware / CAD | `09b-hardware/` | export formats per CAD pack |
| Exec Word report | `exec/<phase>-<slug>.docx` | e.g. `exec/21-executive-summary.docx` |
| Exec / strategy deck | `exec/<phase>-<slug>.pptx` | e.g. `exec/03-strategy-brief.pptx` |
| Funding deck | `04b-funding/pitch.pptx` | investor-ready slides |
| Funding / financial model | `04b-funding/model.xlsx` | unit economics / raise model |
| Strategy QA report (optional) | `exec/10-strategy-findings.docx` | when Phase 10 claims Office complete |

## Office Layer B (docx / pptx / xlsx)

MD remains SSOT. Produce Office files **from** craft when the audience needs a shareable artifact.

| Rule | Detail |
|------|--------|
| Craft first | Non-empty Layer A MD before Office generation |
| Design brief | **Required** for branded `.pptx` (brand tokens + slide system under `exec/design/` or `04b-funding/design/`) |
| Design brief | Optional for plain `.docx` / `.xlsx` |
| Teach with | `skills/community/awesome-claude-corporate-skills/13-document-processing/{docx,pptx,xlsx}/` |
| Skip | `production_status: skipped` + reason (e.g. no raise this venture; operator waiver) |
| Wire | Usually `wire_owner: operator` (download / email / data room) |

### Office existence QA (seat + verifier)

When `production_status: complete` and `production_paths` include `.docx` / `.pptx` / `.xlsx`:

- [ ] Each listed path **exists** on disk
- [ ] File size **> 0**
- [ ] Extension matches the claim (no `.md` renamed as “pptx”)
- [ ] Branded pptx: `design_brief_path` present
- [ ] Existence is the floor, not the bar. When `ARTIFACT-QUALITY.md` has a row for this phase, those headings must also pass (`quality_fail:<id>` / `quality_scorecard`). Existence alone is not enough.

False completes: MD-only “deck”, empty `exec/`, claiming complete without paths, or a present file that fails the phase quality row.

## Artifact classes (what bound skills must leave behind)

| Artifact class | What “done” looks like | Typical packs | Typical paths |
|----------------|------------------------|---------------|---------------|
| **Craft deliverable (Layer A)** | Non-empty markdown / brief under `business-idea/` named in seat Outputs | BA, strategy, sales research, CS QBR, SEO briefs, most marketingskills | `05-prd.md`, `07-sales-playbook.md`, `17-channels/**/*.md`, `HANDOFFS/…` |
| **Production deliverable (Layer B)** | Importable / deployable / renderable / **Office** file leased in `write_lease` | email-design, landing-page-design, OpenMontage/Remotion, Next/shadcn, brand stills, CAD exports, **docx/pptx/xlsx** | Canonical paths above |
| **Tooling / method** | Improves how the seat works; deliverable is still Craft or Production | TDD, context-engineering, writing-plans, figma-use (as editor) | Same as the phase matrix — tooling alone is never “shipped” |

### Rules for agents

1. **Every pack used in a turn must contribute to at least one artifact** listed in the handoff **Artifacts written** table (or an explicit `ask_manager` for a peer who will write it).
2. **Craft packs → Layer A files.** Do not claim production complete from craft alone on shippable phases.
3. **Production packs → Layer B files** when the phase matrix requires them (or `production_status: skipped` with reason).
4. **Tooling packs** must still leave a Craft or Production artifact for the phase.
5. If a pack’s own `SKILL.md` defines Outputs, map them into org leased paths (never invent paths outside `write_lease`).

## Phase matrix (shippable)

| Phase | Craft (Layer A) | Production owner | Production paths (Layer B) | Teach with | Wire (default) |
|-------|-----------------|------------------|----------------------------|------------|----------------|
| **4B** | `04b-funding.md` | `fundraising-lead` | `04b-funding/pitch.pptx` + `04b-funding/model.xlsx` (or skip) | pitch-deck + **pptx** + **xlsx** + production-artifacts | Data room — **operator** |
| **9** | `09-build-log.md`, `05-prd.md`, `14-pages/` | `tech-lead` | `apps/<venture>/` | Next/shadcn/vercel packs | Vercel/DNS — operator or cto |
| **9B** | `09b-hardware-build.md` | `hardware-engineer` | `09b-hardware/` | text-to-cad + production-artifacts | Fabrication — operator |
| **11** | `11-brand-system.md` | `brand-designer` | `11-brand/assets/` | visual-skills + fal/inference + **photoreal-stills** | Brand kit — operator |
| **12** | `12-web-design.md` | `web-designer` (+ brand) | `design-system/<venture>/`; `design-system/<venture>/3d/` when product ref (img2threejs); UI stills when leased | shadcn, figma-design-to-code, brand-stills, **img2threejs**, **scroll-craft** when the landing is a scroll experience | Consumed by Phase 9 — eng |
| **14** | `14-pages/*.md` | Craft: copy/seo/content; **Imagery:** `brand-designer`; **HTML/app:** `tech-lead` (P9) | `14-pages/assets/`; app via `apps/<venture>/` | copy + visual-skills; eng packs | Deploy — operator/cto |
| **15** | `15-media/` scripts | `video-producer` | `15-media/openmontage/` and/or `15-media/openvid/` (or skip) | OpenMontage + `hero-video` for generated film; **openvid** for recorded/uploaded demos; doctor green or skip | Upload — operator |
| **17** | `17-channels/email/*.md`, `social/*.md` | Email HTML: `lifecycle-marketer`; Headers/social: `brand-designer` via ask | `17-channels/email/html/*.html`; `email/assets/`; `social/assets/` | Craft emails → **Design: email-design brief** → HTML + brand-stills | ESP — **operator** |
| **18** | `18-conversion.md` | Spec; forms → `tech-lead` | `apps/<venture>/` when leased | cro + eng | Analytics — head-of-data / operator |
| **19** | `19-paid.md` | Stills: `paid-media-manager` (+ brand); Video: `video-producer` | `19-paid/creatives/`; `19-paid/openmontage/`; `19-paid/openvid/` when demo ads | ads + fal/OpenMontage; **openvid** for recorded demo cutdowns; budget > $0 or skip | Ad accounts — operator |
| **21** | `21-executive-summary.md` | `ceo-strategist` | `exec/21-executive-summary.docx` (or skip) | **docx** + production-artifacts | Share with operator |

### Office-optional (verifier only if Office claimed complete)

| Phase | Craft (Layer A) | Production owner | Layer B when claimed | Teach with |
|-------|-----------------|------------------|----------------------|------------|
| **3** | `03-strategy.md` | `ceo-strategist` | `exec/03-strategy-brief.pptx` if `production_status: complete` or packet `require_office: true` | **pptx** + design brief |
| **10** | `10-strategy-review.md` | `ceo-strategist` | `exec/10-strategy-findings.docx` if complete / `require_office` | **docx** |

Phases **0–2, 4–8, 13, 16, 20, 22** remain primarily Craft/SPEC unless the packet adds a lease.

**Budget:** Phases **15** and **19** require `budget_usd > 0` on the packet **or** explicit `production_status: skipped` with reason.

## Email HTML standard (Phase 17)

1. Craft journeys first under `17-channels/email/*.md` (subject, preview, body, CTA).
2. For **each** send-ready email: `17-channels/email/html/<journey>-<n>-<slug>.html`
3. Follow `skills/community/inference-sh/email-design/`: max-width 600px, single column, bulletproof CTA tables, alt text, unsubscribe placeholder, mobile-safe fonts (≥14px).
4. Header images → `17-channels/email/assets/` via `brand-designer` (`ask_manager`). Text-only HTML OK with note “headers deferred”.
5. ESP merge tags stay placeholders. Do not invent operator facts.
6. SMS remains skippable with rationale.

### Email HTML QA checklist (lifecycle + verifier)

- [ ] File exists under `17-channels/email/html/`
- [ ] Max-width ~600px, single column
- [ ] Primary CTA is a bulletproof table button (or equivalent)
- [ ] Images have alt text (or no images)
- [ ] Unsubscribe / contact placeholder present
- [ ] Body font ≥14px; readable on mobile
- [ ] Matches craft MD subject/preview/CTA intent

## Wire checklist (operator after approve)

- [ ] ESP: import HTML, set merge tags, schedule/automation
- [ ] Ads: upload creatives, map UTMs
- [ ] DNS / hosting: production domain + TLS
- [ ] Analytics: property + conversion events
- Record `wire_owner: operator` (or seat) and remaining items in `wire_notes`.

## Handoff fields (required on shippable phases)

```yaml
production_status: complete | skipped | blocked
production_paths:
  - docs/projects/<active>/business-idea/17-channels/email/html/...
design_brief_path: docs/projects/<active>/business-idea/17-channels/email/design/...-design-brief.md
wire_owner: operator | tech-lead | none
wire_notes: "Import HTML into ESP; set Q7 CONTACT_EMAIL"
skip_reason: "" # required if production_status=skipped
```

Also list production paths in the **Artifacts written** table. `production_paths` is the light asset registry for the phase. `design_brief_path` required when `production_status: complete` on design-led assets (email, stills, video, paid, design-system).

## Manager / C-suite / verifier gates

Managers **reject** shippable-phase IC handoffs that lack `production_status` or that claim `complete` without listed production files (unless `skipped` with reason).

After the manager brief on shippable phases, orchestrator/CTO spawns **`verifier`**. C-suite may **approve** only when `HANDOFFS/<phase>-verifier.md` has `verdict: pass` (or production was `skipped`/`blocked` with documented reason and verifier confirms the skip is honest).

C-suite scorecards must include **Production** and **Verifier pass?** rows (see ORG-REGISTRY).

## Rationalizations

| Excuse | Reality |
|--------|---------|
| “Full emails in MD is enough” | Phase 17 needs `email/html/` or explicit skip |
| “Operator will make HTML later” | That is a **skip** — record it |
| “tech-lead write_lease is only build-log” | Lease `apps/<venture>/` for MVP routes |
| “Figma file is the deliverable” | Export into leased path first |
| “design-system lives in the app” | SSOT is `design-system/<venture>/` |
| “No ESP in TOOL-REGISTRY” | Wire = operator; Production HTML still required |
| “Manager said it’s done” | Verifier must still pass |
| “I’ll design in the HTML as I go” | Write Design brief from email-design/brand packs first |
| “Prompt is in my head” | Prompts must be in the Design brief before stills/video |
| “MD exec summary is the Word doc” | Phase 21 needs `exec/*.docx` or explicit skip |
| “Pitch outline in MD is the deck” | Phase 4B needs `04b-funding/pitch.pptx` + `model.xlsx` or skip |
| “Empty exec/ folder counts” | Office existence QA: file present and size > 0 |
| “File exists so quality is done” | When `ARTIFACT-QUALITY.md` has a row, headings must pass (`quality_fail:<id>`) |
| “Phase 9 can build without a design brief” | Dispatch refuse: `design_before_build` |
