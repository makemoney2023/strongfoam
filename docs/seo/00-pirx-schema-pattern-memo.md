# Strong Foam — Pattern memo (PIRX blog + schema project)

**Client:** Strong Foam Insulation Inc. (`strongfoam.com`)  
**Audience for this memo:** Company Orchestrator + Creative/Engineering (Next.js rebuild)  
**Date:** 2026-09-16 (America/Toronto)  
**Ground truth for company facts:** `/workspace/strongfoam-research-dossier.md`  
**Do not:** reuse WordPress, migrate spam posts, or copy PIRX product copy / race terminology.

---

## Sources reviewed (structure only)

| Path | Role |
|------|------|
| `Desktop/Projects/PIRX/research/pirx-seo-geo-strategy.md` | SEO + GEO + AEO thesis, schema-as-AI-extraction, 90-day levers |
| `Desktop/Projects/PIRX/.cursor/skills/seo-geo-aeo/` | Production playbook (content law, tech stack, entity) |
| `Desktop/Projects/PIRX/.cursor/skills/pirx-blog-writing/` | Answer-first post skeleton + frontmatter + FAQ → JSON-LD |
| `Desktop/Projects/PIRX/.cursor/skills/content-planner/` | Calendar buckets / opportunity rubric |
| `Desktop/Projects/PIRX/docs/content/blog-content-calendar.json` (+ wave2/3) | Calendar JSON shape (clusters, primaryQuery, faqSeeds, status) |
| `Desktop/Projects/PIRX/pirx-frontend/src/lib/site-schema.ts` | Site-wide `@graph` (Organization + WebSite) with stable `@id`s |
| `Desktop/Projects/PIRX/.cursor/skills/schema-markup-generator/` (+ `references/schema-templates.md`) | **Schema project** — JSON-LD templates + type mapping |
| Twin also at `Desktop/ClaudeSkills/skills/community/notfair-seo/schema-markup-generator/` | Same skill package |
| Dossier IA §12 | Strong Foam page tree (services / sectors / projects / resources) |

---

## What to COPY (structure)

### 1. Two-layer search model
GEO/AEO sit **on top of** classic SEO. ~80% of citation wins = excellent fundamentals + extractability. Do not replace blue-link SEO with “AI SEO.”

### 2. Content law (every public URL)
Reuse this skeleton — swap PIRX calculator CTAs for Strong Foam **estimate / contact** CTAs:

1. **Answer first** (first screenful / ≤ first 30% of page)  
2. **One extraction table** (self-contained; quotable without prose)  
3. **Primary CTA early** → `estimating@strongfoam.com` / tel:+15199006000 / contact form  
4. **Question-format H2s** (first sentence under each H2 = complete answer)  
5. **Evidence density** (≥1 verifiable fact per ~100 words; cite manufacturers, codes, project certificates — never invent)  
6. **Differentiation** (ICI/MUR + spray foam + PFP/intumescent + AVB; multi-branch Ontario)  
7. **FAQ** 3–6 chatbot-real Q&As (2–4 sentence answers)  
8. **Sources** list  

### 3. Pillar + cluster IA
- One **pillar** per money intent (e.g. commercial spray foam Ontario; cementitious fireproofing high-rise).  
- Cluster posts answer fan-out questions and link up with descriptive anchors.  
- Service pages are **content pages**, not brochure stubs (ChatGPT over-cites tool/service URLs when they carry answer + FAQ + table).  
- Avoid thin programmatic city pages: every geo URL needs unique synthesis (local project proof, code notes, branch NAP) or it risks weakest-link penalties.

### 4. Blog / resources frontmatter pattern (adapt from PIRX)
Carry these fields into MDX/CMS (rename clusters for Strong Foam):

```yaml
title: "…"
description: "…"   # 150–160 chars
datePublished: "YYYY-MM-DD"
dateModified: "YYYY-MM-DD"
cluster: "spray-foam | fireproofing | avb | sectors | geo | specs"
primaryQuery: "…"
secondaryKeywords: []
ctaHref: "/contact/"   # or /services/…
ctaLabel: "Request an estimate"
faqs:
  - q: "…"
    a: "…"   # ≥2; drives FAQPage JSON-LD; answers must match visible copy
```

Calendar JSON fields to keep: `day`, `status` (planned→drafting→in-review→published), `cluster`, `primaryQuery`, `angle`, `faqSeeds`, `extractionTableIdea`, terminology/claims guards.

### 5. Technical stack (ship once)
- One canonical host (`https://strongfoam.com`); HTTPS; self-canonicals  
- `robots.txt`: allow Googlebot, Bingbot, **and** AI retrieval bots (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, …); block abusive scrapers; declare sitemap  
- XML sitemap of **clean** public URLs only; submit GSC **and** Bing Webmaster  
- IndexNow on publish (helps Bing → ChatGPT)  
- JSON-LD `@graph` with **≥3 types** per URL; schema must match visible content  
- Keep `FAQPage` even though Google killed FAQ rich results (May 2026) — it is an **AI-extraction** signal  
- SSR/prerender answer + table + FAQ (JS-only main content fails many AI crawlers)  
- `llms.txt` optional/cheap; **do not** invest maintenance — `robots.txt` matters more  
- Spam cleanup: 410/301 plan for ~2k casino URLs; fresh CMS; no WP DB migrate  

### 6. Schema patterns from the schema project
Use `schema-markup-generator` templates + PIRX `buildSiteGraph()` pattern:

- Site-wide: `Organization` + `WebSite` with stable `@id` (`#organization`, `#website`)  
- Location pages: `LocalBusiness` / prefer more specific type when accurate (e.g. `SpecialtyTradeContractor` if validating) — **only with verified NAP**  
- Service pages: `Service` + `BreadcrumbList` + `FAQPage`  
- Blog: `BlogPosting`/`Article` + `BreadcrumbList` + `FAQPage` (+ `Person` author when real)  
- Multi-type via `@graph` so page graphs link to the same Organization `@id`  
- **Never** emit `aggregateRating`, `sameAs`, or `SearchAction` pointing at surfaces that do not exist  

### 7. Entity / GEO (contractor version of PIRX entity plan)
Identical NAP + description across site, GBP, LinkedIn, directories. `sameAs` only for verified profiles (Facebook, Instagram, LinkedIn, YouTube from dossier). Wikidata later if notability exists. Trade PR / named case studies > thin city spam.

---

## What NOT to copy (PIRX-specific)

| PIRX | Strong Foam |
|------|-------------|
| Race predictors, VDOT bans, “Personal Best,” 5 drivers, Supported Range | N/A — write construction/trade locked terms instead |
| Calculator CTAs / embed widgets | Estimate + phone + trade login path (if any) |
| Flesch ≤5 consumer reading level | B2B GC/architect tone; still answer-first and clear |
| Product Hunt / G2 / runner Reddit | ConstructConnect, manufacturer directories, LinkedIn, GBP, trade associations |
| Soft “greenest insulation” absolute claims | Prefer qualified efficiency / performance language (dossier flag) |
| Invented project stats | Only ConstructConnect / client-cleared case studies |

---

## Locked claims guards (from dossier — put in calendar meta)

- **Founding:** 2016 (site) vs LioCorr “Launched 2020” — **client confirm**; do not invent a merge story.  
- **Experience:** “50 years” vs LioCorr “100 years” — **pick one verified number**.  
- **Primary NAP:** Prefer one SEO primary (operational: **1-399 Breithaupt St, Kitchener ON N2H 5H8** appears on certificates); St. Leger / Dorchester / Woodbridge / McGovern need client active/inactive confirmation.  
- Phone: **+1 519-900-6000**; estimating: **estimating@strongfoam.com**.  
- Do not claim CUFCA / BBB / SPFA unless client supplies proof.  
- Residential is secondary to ICI/MUR unless client expands mandate.

---

## Hand-off to build

1. Implement site-wide `@graph` + per-template schema helpers (mirror `site-schema.ts` pattern).  
2. Resources/blog MDX or CMS with FAQ frontmatter → FAQPage.  
3. Service + geo landing templates following content law.  
4. Content calendar in `02-content-calendar-90d.md` drives first 90 days.  
5. Orchestrator owns Next.js build with Creative/Engineering — this pack is research only.
