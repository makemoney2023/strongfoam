# Org Registry — Virtual Company Positions

Single source of truth for position slugs, reporting lines, phase ownership, and skill-pack bindings. Orchestrator and runbook both read this file.

**Model routing (LLM + generation):** [`MODEL-REGISTRY.md`](./MODEL-REGISTRY.md) — tiers, Cursor `model:` pins, Veo/FLUX profiles.  
**Tool / MCP integrations:** [`TOOL-REGISTRY.md`](./TOOL-REGISTRY.md) — seat → API/MCP map; skills in `skills/integrations/`.  
**Env placeholders:** repo-root `.env.local`  
**Position skills:** `skills/org/positions/<slug>/SKILL.md`  
**Cursor agents:** `templates/org/agents/<slug>.md` → install with `./scripts/sync-org-agents.sh` → `.cursor/agents/`  
**Note:** Cursor only honors agent `model:` from `.cursor/agents/` (or `~/.cursor/agents/`). Plane A defaults: `grok-4.5` for frontier-reasoning; `composer-2.5` for all other seats.

## Org tree

```
ceo-strategist
├── head-of-research
│   ├── market-research-analyst
│   └── competitive-intelligence-analyst
├── cfo
│   ├── fpa-analyst
│   └── fundraising-lead
├── head-of-product
│   ├── product-manager
│   └── business-analyst
├── cmo
│   ├── product-marketing-manager
│   ├── copy-chief
│   ├── content-strategist
│   ├── seo-manager
│   ├── paid-media-manager
│   ├── lifecycle-marketer
│   └── pr-manager
├── creative-director
│   ├── brand-designer
│   ├── web-designer
│   └── video-producer
├── head-of-sales-cs
│   ├── sales-enablement-lead
│   ├── outbound-lead
│   └── customer-success-manager
├── coo
│   ├── ops-manager
│   └── legal-counsel
├── head-of-people
│   └── recruiter
├── cto
│   ├── tech-lead
│   └── hardware-engineer
└── head-of-data
    └── analytics-engineer
```

## Roster

| Slug | Title | Reports to | Level | Dept |
|------|-------|------------|-------|------|
| ceo-strategist | CEO / Strategist | — | manager | exec |
| head-of-research | Head of Research | ceo-strategist | manager | research |
| market-research-analyst | Market Research Analyst | head-of-research | ic | research |
| competitive-intelligence-analyst | Competitive Intelligence Analyst | head-of-research | ic | research |
| cfo | CFO | ceo-strategist | manager | finance |
| fpa-analyst | FP&A Analyst | cfo | ic | finance |
| fundraising-lead | Fundraising Lead | cfo | ic | finance |
| head-of-product | Head of Product | ceo-strategist | manager | product |
| product-manager | Product Manager | head-of-product | ic | product |
| business-analyst | Business Analyst | head-of-product | ic | product |
| cmo | CMO | ceo-strategist | manager | marketing |
| product-marketing-manager | Product Marketing Manager | cmo | ic | marketing |
| copy-chief | Copy Chief | cmo | ic | marketing |
| content-strategist | Content Strategist | cmo | ic | marketing |
| seo-manager | SEO Manager | cmo | ic | marketing |
| paid-media-manager | Paid Media Manager | cmo | ic | marketing |
| lifecycle-marketer | Lifecycle Marketer | cmo | ic | marketing |
| pr-manager | PR Manager | cmo | ic | marketing |
| creative-director | Creative Director | ceo-strategist | manager | creative |
| brand-designer | Brand Designer | creative-director | ic | creative |
| web-designer | Web Designer | creative-director | ic | creative |
| video-producer | Video Producer | creative-director | ic | creative |
| head-of-sales-cs | Head of Sales & CS | ceo-strategist | manager | sales |
| sales-enablement-lead | Sales Enablement Lead | head-of-sales-cs | ic | sales |
| outbound-lead | Outbound Lead | head-of-sales-cs | ic | sales |
| customer-success-manager | Customer Success Manager | head-of-sales-cs | ic | sales |
| coo | COO / Legal | ceo-strategist | manager | ops |
| ops-manager | Ops Manager | coo | ic | ops |
| legal-counsel | Legal Counsel | coo | ic | ops |
| head-of-people | Head of People | ceo-strategist | manager | people |
| recruiter | Recruiter | head-of-people | ic | people |
| cto | CTO / Engineering | ceo-strategist | manager | eng |
| tech-lead | Tech Lead | cto | ic | eng |
| hardware-engineer | Hardware Engineer | cto | ic | eng |
| verifier | Verifier | cto | ic | eng |
| head-of-data | Head of Data | ceo-strategist | manager | data |
| analytics-engineer | Analytics Engineer | head-of-data | ic | data |

**Count:** 37 positions.

## Phase → owner map

**May delegate** = the **manager** may spawn those ICs. The orchestrator never spawns ICs directly. See `orchestrator/SKILL.md`.

**Collaboration:** Phases 14, 15, 17, 19 → [`COLLABORATION.md`](./COLLABORATION.md). Escalations → [`ESCALATION.md`](./ESCALATION.md).  
**Production (Craft → Production → Wire):** [`packs/production-artifacts/SKILL.md`](./packs/production-artifacts/SKILL.md) — required for shippable phases **4B, 9, 9B, 11, 12, 14, 15, 17, 19, 21** (and 18 when app/forms change; Office-optional **3, 10** when `production_status: complete`).  
**Standing context:** [`packs/standing-context/SKILL.md`](./packs/standing-context/SKILL.md) — psychology / persuasion / humor / sales-YouTube frameworks (venture-agnostic; see seat Skill packs).

| Phase | Manager owner | Manager may spawn | C-suite reviewer | Secondary if tagged | Scorecard (must pass) |
|-------|---------------|-------------------|------------------|---------------------|------------------------|
| 0 | ceo-strategist | — | ceo-strategist | cfo, cmo, coo, head-of-research (Jarvis roundtable; not manager-spawned) | Intake complete; classification set; peer briefs + `0-csuite-review.md` (`skip-review` allowed) |
| 1 | ceo-strategist | business-analyst | ceo-strategist | — | Problem + assumptions labeled |
| 2 | head-of-research | market-research-analyst, competitive-intelligence-analyst, seo-manager `(parallel: true)` | ceo-strategist | evidence→HoR | Evidence base cites sources; market doc non-empty |
| 3 | ceo-strategist | product-marketing-manager, business-analyst | ceo-strategist | — | Strategy + `.agents/product-marketing.md` exist |
| 4 | cfo | fpa-analyst, product-marketing-manager | ceo-strategist | spend→cfo | Unit economics + pricing explicit |
| 4B | cfo | fundraising-lead | ceo-strategist | spend→cfo | Deck + model paths present (`04b-funding/pitch.pptx` + `model.xlsx` or skip); production_status set; **Verifier pass?** |
| 5 | head-of-product | product-manager, business-analyst `(parallel: true)` | ceo-strategist | scope→HoP | PRD + MoSCoW + AC |
| 6 | cmo | product-marketing-manager, content-strategist, pr-manager `(parallel: true)` | ceo-strategist | — | GTM channels + launch outline |
| 7 | head-of-sales-cs | sales-enablement-lead, outbound-lead, customer-success-manager `(parallel: true)` | ceo-strategist | — | Playbook covers close + retain |
| 8 | coo | ops-manager, legal-counsel `(parallel: true)` | ceo-strategist | legal→coo | Ops + risk checklist |
| 8B | head-of-people | recruiter | ceo-strategist | — | First hires + JDs |
| 9 | cto | tech-lead, verifier | ceo-strategist | scope→HoP | Build log + **verified MVP in `apps/<venture>/`** (or skip); production_status set; **Verifier pass?** |
| 9B | cto | hardware-engineer, verifier | ceo-strategist | — | CAD artifacts under `09b-hardware/` or skip reason; **Verifier pass?** |
| 10 | ceo-strategist | head-of-research, business-analyst | ceo-strategist | evidence→HoR | Fact-check of load-bearing claims |
| 11 | creative-director | brand-designer | ceo-strategist | brand→CD | Brand system documented; **stills rendered** via `brand-stills` (or production skip); **Verifier pass?** |
| 12 | creative-director | web-designer, brand-designer | ceo-strategist | brand→CD | IA + **`design-system/<venture>/` production paths**; brand-stills when imagery rendered; **Verifier pass?** |
| 13 | cmo | copy-chief, content-strategist, product-marketing-manager `(parallel: true)` | ceo-strategist | — | Voice + awareness + headlines; copy-chief `creative-language` |
| 14 | cmo | copy-chief, seo-manager, content-strategist, brand-designer `(parallel: partial)` | ceo-strategist | brand→CD | All listed pages have body + meta; **imagery assets or skip**; HTML/app via Phase 9 production; **Verifier pass?** |
| 15 | creative-director | video-producer | ceo-strategist | brand→CD | OpenMontage **finals path** or production skip; `hero-video` / Veo 3.1 (or skip reason); **Verifier pass?** |
| 16 | cmo | seo-manager | ceo-strategist | — | Technical SEO checklist |
| 17 | cmo | lifecycle-marketer, content-strategist `(parallel: true)` | ceo-strategist | brand→CD | Full email journeys **+ HTML under `email/html/`** (or production skip); social assets or skip; **Verifier pass?** |
| 18 | cmo | paid-media-manager, product-marketing-manager | ceo-strategist | — | Funnel map + test hypotheses; app form changes leased to eng when needed |
| 19 | cmo | paid-media-manager, video-producer `(parallel: true)` | ceo-strategist | spend→cfo, brand→CD | Channel plan + **creatives files** under `19-paid/creatives/` (or skip); video finals when budgeted; **Verifier pass?** |
| 20 | head-of-data | analytics-engineer | ceo-strategist | — | KPI + event plan |
| 21 | ceo-strategist | — | ceo-strategist | — | Exec summary + launch checklist + `exec/21-executive-summary.docx` (or skip); production_status set; **Verifier pass?** |
| 22 | ceo-strategist | head-of-data, cmo, paid-media-manager (on demand) | ceo-strategist | — | Cadence entry with actions |

Classification may drop ICs/phases — see CLASSIFICATION-SKIPS.md.

**Hard C-suite gates** (full review, not rubber-stamp): Phases **3, 6, 10, 14, 19, 21**.

## Parallel tracks (post Phase 10)

| Track | Manager | IC positions |
|-------|---------|--------------|
| Build | cto | tech-lead, hardware-engineer |
| Brand & design | creative-director | brand-designer, web-designer |
| Content | cmo | copy-chief, content-strategist, seo-manager; creative-director → video-producer for Phase 15 |
| Channels | cmo | seo-manager, lifecycle-marketer, paid-media-manager, pr-manager |
