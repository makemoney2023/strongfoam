# Strong Foam — Next.js rebuild brief (v1)

**Date:** 2026-09-16 (America/Toronto)  
**Domain:** https://strongfoam.com  
**Legal:** Strong Foam Insulation Inc. (LioCorr Holdings)  
**Stack:** Next.js (App Router) + TypeScript + Tailwind + GSAP ScrollTrigger + Three.js (scroll-world / 3D one-pager craft)  
**Do not:** reuse WordPress, migrate spam posts, invent GEO stats or unverified claims.

## Product goal
Beautiful **3D one-page scroll craft / scroll-world** marketing site for commercial & industrial spray foam (ICI + multi-unit residential) in Ontario, with full **AEO + SEO + GEO**, structured **JSON-LD**, and content system ready for the **90-day ICP calendar**.

## Brand
- Colors: `#009ee2` (primary blue), `#e8043d` (accent red)
- Tone: industrial craft / competent / specification-aware — not residential DIY fluff
- Logo + assets: see attached images and `/workspace/strongfoam-assets/` (more backgrounds still harvesting)

## Verified NAP (prefer Breithaupt as ops until client confirms primary)
- Phone: +1 519-900-6000
- Email: estimating@strongfoam.com (also admin@strongfoam.com)
- Ops: 1-399 Breithaupt Street, Kitchener ON N2H 5H8
- Also published: St. Leger (head office unit), Dorchester/London, Woodbridge/Toronto, LioCorr Cambridge HQ
- Social: Facebook STRONGFOAMINSULATION, Instagram strongfoaminsulation, LinkedIn company/strong-foam-insulation-inc

## Services (homepage sections + service anchors)
1. Spray foam insulation (SPF)
2. Cementitious fireproofing / passive fire protection
3. Intumescent coatings
4. Air-vapour barrier membranes
5. SPF roofing

## Claims guards
- Do **not** assert “greenest insulation” as absolute
- Flag founding year **2016 vs LioCorr 2020** — use soft “serving ICI/MUR since 2016” only if needed; prefer “from 2016” with client confirm note in comments
- Soften “50 / 100 years combined experience” — prefer “decades of combined construction experience” or omit until client confirms
- No casino/spam content

## IA (one-page scroll + light multi-route for SEO)
**Scroll world (home `/`):** Hero → Trust/proof → Services orbit → Process → Sectors (ICI/MUR/industrial) → Projects gallery → Coverage (KW–London–GTA) → FAQ → Contact/estimate CTA

**Lead capture:** `/request-estimate` adaptive estimate survey; `/request-estimate/thanks` noindex confirmation.

**SEO routes (SSR, answer-first):**  
`/services/*`, `/sectors/*`, `/resources/*` (blog MDX from calendar), `/locations/kitchener-waterloo`, `/locations/london`, `/locations/gta` (unique synthesis only), `/contact`, `/projects`

Follow pattern memo in uploads for content law, schema `@graph`, robots AI allowlist, IndexNow stub, FAQPage.

## Craft requirements
- GSAP ScrollTrigger scrubbed scenes; pin sections; parallax layered plates
- Three.js canvas (or R3F) for foam/insulation “world” moments — performant, pause offscreen, respect `prefers-reduced-motion` (CSS fallback still beautiful)
- Full-bleed image/video backgrounds from project photos (Ken Burns / subtle camera drift OK); use attached assets
- Industrial luxury aesthetic (dark concrete, foam texture, cyan/red accents)
- Mobile: scroll still works; reduce 3D complexity; never block content behind WebGL

## SEO / AEO / GEO deliverables in code
- `src/lib/site-schema.ts` — Organization + WebSite stable `@id`s; per-page `@graph` ≥3 types
- FAQ blocks → FAQPage JSON-LD matching visible copy
- LocalBusiness / Service schemas from `03-json-ld-schema.md`
- `robots.txt` + `sitemap.xml` + optional `llms.txt` (low priority)
- Meta + OG + Twitter cards; canonical https://strongfoam.com
- Seed MDX posts or content stubs for **week 1** of `02-content-calendar-90d.md` (pillars + KW + contact FAQ)
- Include `content/calendar.json` adapted from the 90-day calendar

## Success criteria
1. `npm run build` succeeds
2. Home is a polished scroll-world experience with GSAP + Three.js
3. Schema validates structurally (Organization, WebSite, Service, FAQPage where FAQ exists)
4. Week-1 content stubs + full calendar JSON present
5. README with run instructions; no secrets; no WP code
6. PR/main has clear commit history
7. Homepage primary CTAs open `/request-estimate`; qualified thanks can embed Calendly

## Attached uploads (read these)
- Research dossier, recovered copy, security notes
- strongfoam-seo/00–04
- This brief
- Brand/project images for visual direction
