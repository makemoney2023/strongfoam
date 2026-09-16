# PIRX Blog Writing — Reference

Detailed craft, evidence, schema, and QA backing for the `pirx-blog-writing` skill. Read this when you need the "why" behind a rule, the full citation evidence, or the complete QA gate.

## 0. Content-quality contract — how each rule is measured

The automated gate (`pirx-frontend/scripts/check-content-quality.mjs`, thresholds from `docs/content/blog-content-calendar.json` `meta.contentRules`) enforces:

- **Reading level — Flesch-Kincaid Grade ≤ 5.** Measured on *prose only*: strip frontmatter, fenced + inline code, JSX/HTML tags, and markdown link syntax (keep link text), then score with `text-readability`. To hit grade 5: keep sentences short (aim ≤ 14 words), prefer one-syllable words, and define every technical term in plain language the first time it appears. The grade-5 target fights with citing physiology studies — when a passage cannot drop below ~FK 6 without distorting the science, **flag it in the draft for human judgment, do not silently ship or dumb it down into inaccuracy**.
- **Length — 1500–2000 words**, prose only (same stripping).
- **No em dashes.** Zero `—` (U+2014). Rewrite with a period or comma. En-dash numeric ranges (`5–10`, U+2013) are fine; em dashes are the ban.
- **Uniqueness — 3-gram-shingle Jaccard < 0.25** vs every other post (and the existing 13). Lowercase, strip non-alphanumerics, build the set of 3-word shingles, compare pairwise. Above threshold = too similar; differentiate the angle, examples, table, and primary sources. Each post owns a distinct `primaryQuery`.
- **Terminology** (all posts, existing + new): never `PR`/`PRs`/`Personal Record`, never `Riegel`/`VDOT`/`Daniels`/`Mercier`, never `confidence interval`/`midpoint`/`form score`/`capacity index`; canonical 5 driver names; "Personal Best"; "Supported Range"; "Projected Time".

Reading time shown on the page uses the same prose word count at 200 wpm (`computeReadingTime`).

## 1. The 2026 search reality (why GEO/AEO matters)

The click is collapsing on informational queries, but the AI *citation* converts far better than an organic click — and almost nobody optimizes for it yet. This is a first-mover window.

- Organic CTR drops ~61% when a Google AI Overview appears (Seer Interactive, Sept 2025).
- 80-83% of AI-Overview searches are zero-click (Exposure Ninja / Mersel AI 2026).
- AI-referred traffic converts ~8-16% vs ~1.76% for Google organic (Seer / First Page Sage 2026).
- Only ~14% of marketers track AI search at all (Conductor 2026).
- BUT traditional organic still sends ~345x more raw traffic than all AI engines combined — so GEO/AEO is **additive to SEO, not a replacement** ("80% of GEO is good fundamental SEO").

Where the engines pull from:
- **ChatGPT** (~60-73% of AI search) reads the **Bing** index; Wikipedia is 47.9% of its top-10 cited domains.
- **Perplexity / Google AI Overviews** read **Google**; **Reddit** is a huge citation source (Perplexity ~46.5%).
- Only ~11% of domains are cited by BOTH ChatGPT and Perplexity — presence is needed in both worlds.

## 2. Content-engineering levers (measured effects)

From the Princeton/Georgia Tech/Allen AI GEO study (Aggarwal et al., KDD '24) + 2025-26 citation studies (Zyppy, Authoritas, SE Ranking, Acquia, Position Digital):

| Lever | Measured effect | How PIRX posts apply it |
|---|---|---|
| **Statistics addition** | up to **+40%** AI visibility | ≥1 verifiable number per ~100 words; `<KeyStat>` for headline numbers. |
| **Cite sources** (inline primary refs) | **+115%** for a position-5 page; +41% avg | Every major claim links to a peer-reviewed/primary source. |
| **Answer-first in first 30%** | **44.2%** of LLM citations come from there | Lead the page and every section with the direct answer. |
| **Self-contained, labeled sections** | extraction path for RAG chunking | Each H2 quotable alone; first sentence = complete answer. |
| **Descriptive (question) headings** | headings are extraction signals | H2 names the question; never clever/vague headings. |
| **Comparison tables + FAQ schema** | over-represented in AI answers; FAQ+citations ~40% higher ChatGPT weighting; 3+ schema types +13% citation probability | One `<ExtractionTable>` + the `faqs` frontmatter (FAQPage JSON-LD). |
| **Specificity** (named outcomes/dates/results) | generic claims don't get cited | "drops 22 seconds off a 46:00 10K", not "gets you faster". |
| **Expert quote** | top-3 GEO method | one quotable, attributable line per guide. |
| **Indexed HTML, no PDFs/gated content** | LLMs can't reliably parse PDFs/forms | all content lives on the indexed MDX page. |

Real-world proof (Acquia case study): restructuring existing pages to answer-first H2s + FAQ blocks + consistent naming took AI-citation share from **14% → 38% in 90 days with zero new content** — structure alone.

## 3. Query fan-out (finding the questions to answer)

LLM answer flows decompose a prompt into sub-questions. Cover the fan-out so PIRX is the source for several of them. Sources for real questions:
- Google Search Console queries + "People Also Ask"
- Reddit (r/running, r/AdvancedRunning, r/Marathon_Training, r/artc), Quora
- Sales/support themes and competitor FAQs
- The `faqSeeds` in the content calendar are a starting point — expand them.

Each blog post's `faqs` frontmatter should answer 2-4 of these sub-questions verbatim-quotably.

## 4. Schema (kept as an AI-extraction asset)

The blog system already emits JSON-LD via `pirx-frontend/src/lib/blog-schema.ts` (Article/Blog graph) and the `faqs` frontmatter powers FAQPage. Rules:

- Do NOT remove FAQPage/HowTo/Article schema. Google deprecated FAQ *rich results* (May 2026), but the schema is now a **top AI-extraction signal**, not blue-link decoration.
- Author is a `Person` node (E-E-A-T) via `site-author.ts` — the March 2026 core update rewards real author credentials + first-hand experience. Keep author attribution credible.
- Keep multi-type `@graph` (3+ schema types → +13% citation probability).
- You write schema indirectly: complete, accurate frontmatter (title, description, dates, faqs) is what feeds it. Garbage frontmatter = garbage schema.

## 5. Off-page (not part of the MDX, but part of winning the citation)

On-page structure is necessary but not sufficient. Entity + authority move AI citations the most (tracked in the SEO/GEO execution plan + operational runbook, not here): Wikidata entity, consistent NAP across Crunchbase/LinkedIn/Product Hunt/G2, genuine Reddit/Quora participation, 2-3 YouTube comparison videos, and digital-PR mentions (Runner's World, DC Rainmaker, podcasts). A blog post is one node in that web — link it, and reference it from genuine community answers (never astroturf).

## 6. PIRX differentiation language (the conversion bridge)

Every post needs one short section that pivots from the educational topic to why PIRX is the fix. Use this framing (adapt, don't copy verbatim each time):

- Static formulas (Riegel) and wrist VO2-max guesses treat every runner the same.
- PIRX uses **a proprietary machine-learning prediction engine** that learns the individual.
- It breaks performance into **5 drivers** (Aerobic Base, Threshold Density, Speed Exposure, Load Consistency, Running Economy) and shows **where your seconds come from**.
- It outputs a **Projected Time** with a **Supported Range** and recalculates after every synced activity.
- Free, no signup, no new wearable — connect Garmin / COROS / Strava.
- Operator-locked proof point: **98% validated prediction accuracy (PIRX users)**.

## 7. Closing CTA blueprint (verbatim intent)

From the operator plan (see `meta.ctaBlueprint` in the calendar). Render the prose, then a `<BlogCta>`:

> Stop guessing what your training is worth. Don't rely on generic watch algorithms that treat every runner the same. Connect your Garmin, Apple Watch, or COROS to PIRX in under 30 seconds. Analyze your 5 performance drivers, see exactly where your seconds are coming from, and get the most accurate race-time projection on the market.

Then `<BlogCta href={calculatorHref} label={calculatorLabel} />`. Trial terms (14-day, no credit card) only if operator-confirmed and live.

## 8. Full QA gate

A post is done only when ALL pass:

### Structure
- [ ] Answer-first paragraph in the first screenful; key verdict bolded.
- [ ] Exactly one `<ExtractionTable>`, placed near the top, self-contained and quotable.
- [ ] `<BlogCta>` appears early and again at the close.
- [ ] Every `##` is a question; first sentence under it is a complete answer.
- [ ] One PIRX-differentiation section; one expert-framed quote.
- [ ] `## Sources` lists every cited source with a one-line parenthetical.

### SEO/GEO/AEO
- [ ] ≥1 verifiable statistic per ~100 words; headline numbers in `<KeyStat>`.
- [ ] Every major claim has an inline primary-source citation (study/dataset/original formula — not another blog).
- [ ] 2-3 internal links (same cluster first); round-ups link all week siblings.
- [ ] `primaryQuery` appears in title, description, first paragraph, and ≥1 H2.
- [ ] `faqs` answer real fan-out questions, verbatim-quotably (≥2 entries).

### Terminology (hard fails)
- [ ] No banned words (PR/PRs/Personal Record, Midpoint, Confidence Interval, etc.).
- [ ] 5 drivers use canonical names and sum-in-seconds framing.
- [ ] "Event Readiness" with correct bands; "Supported Range"; "Projected Time".
- [ ] Riegel/VDOT/VO2 max only as critiqued generic methods, never PIRX's.
- [ ] PIRX = "proprietary machine-learning prediction engine".
- [ ] Every product number is operator-locked ("98% … PIRX users") or flagged for operator verification (135k+, 180k+, trial terms, device list).

### Build/system
- [ ] Frontmatter typed and complete; slug unique; file at `pirx-frontend/content/blog/<slug>.mdx`.
- [ ] `cd pirx-frontend && npx vitest run src/lib/__tests__/blog*.test.ts` green.
- [ ] `cd pirx-frontend && npm run build` prerenders the post; schema valid.
- [ ] Calendar post `status` updated; `docs/dev/frontend-changelog.md` README Delta appended.

## 9. Sources (this skill's evidence base)

- Aggarwal et al., "GEO: Generative Engine Optimization" (KDD '24) — +40% stats, +115% cite-sources.
- Zyppy 2025 — 44.2% of LLM citations from first 30% of page.
- Authoritas 2025/2026 — FAQ+citations ~40% higher ChatGPT weighting; 3+ schema types +13%.
- Acquia 2026, "AEO Content Strategy: How to Structure Pages for AI Citation" — direct answers, labeled headings, specificity, schema; 14%→38% case study. (`.firecrawl/blog-writing/acquia-structure.md`)
- Position Digital 2026, "Answer Engine Optimization: 6 Best Practices" — RAG retrieval, query fan-out, off-page UGC. (`.firecrawl/blog-writing/position-aeo.md`)
- Seer Interactive (Sept 2025), Mersel AI 2026, Conductor 2026, SE Ranking (Nov 2025), Lantern (Feb 2026) — via `research/pirx-seo-geo-strategy.md`.
