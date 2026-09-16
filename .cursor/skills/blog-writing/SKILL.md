---
name: pirx-blog-writing
description: Authoritative workflow for writing PIRX blog posts (MDX) that are optimized for SEO, GEO (generative engine optimization), AEO (answer engine optimization), and AI-chat citation. Enforces the repeatable answer-first + extraction-table + citation + FAQ post skeleton, the exact fumadocs frontmatter, the locked PIRX terminology, and the per-post QA gate. Use when drafting, editing, or reviewing any post in pirx-frontend/content/blog, when working through docs/content/blog-content-calendar.json, or when the user mentions PIRX blog content, SEO/GEO/AEO writing, or "get cited by AI".
---

# PIRX Blog Writing

Every PIRX blog post follows ONE skeleton so each article earns the same SEO + AI-citation visibility. The goal: be the easiest, most specific, most trustworthy thing for Google AND an LLM (ChatGPT/Perplexity/Gemini/AI Overviews) to quote — then convert the reader into a free predictor run.

This skill is the HOW. The WHAT (topics, order, slugs, per-post guards) lives in the content calendar:
`docs/content/blog-content-calendar.json`. The strategy basis is `research/pirx-seo-geo-strategy.md`. Deeper craft + QA detail is in [reference.md](reference.md).

## Before you write (preflight)

1. Open `docs/content/blog-content-calendar.json`, find the post by `day`, and read its `cluster`, `order`, `primaryQuery`, `secondaryKeywords`, `angle`, `calculatorHref/Label`, `extractionTableIdea`, `faqSeeds`, and `terminologyGuards`. The per-post guards override nothing — they ADD to the global guards below.
2. Read the global guards in the calendar's `meta.globalTerminologyGuards` and the Locked Terminology section here.
3. Research the topic with Firecrawl (user rule: research before writing). Find 3-5 PRIMARY sources (peer-reviewed studies, large datasets, original formulas) — not other blogs. Save to `.firecrawl/`. You cite these inline.
4. Read 1-2 existing posts as style/structure references, e.g. `pirx-frontend/content/blog/how-to-pace-a-marathon.mdx`.
5. Confirm the slug is unique (calendar slugs are pre-checked against existing posts).

## The non-negotiable post skeleton

Write the MDX body in exactly this order. Every post. No exceptions.

```
1. ANSWER-FIRST PARAGRAPH   — the direct answer in the first screenful (≤ first 30% of page).
                              Bold the key verdict. 2-4 sentences. (44.2% of AI citations come
                              from the first 30% of a page.)
2. <ExtractionTable>        — exactly ONE quotable, self-contained comparison/data table near the top.
3. <BlogCta>                — early calculator CTA (deep-link from the calendar's calculatorHref).
4. ## Question-format H2s   — each H2 is a real question; the FIRST sentence under it is a complete,
                              self-contained answer (then elaborate). One idea per section.
5. ≥1 hard statistic        — target ≥1 verifiable number per ~100 words; use <KeyStat> for the
                              headline number(s). Numbers must be real and sourced (or operator-locked).
6. Inline primary citations — every major claim links to a primary source: [Author, Year](url).
7. The PIRX differentiation — one short section: why PIRX (proprietary ML engine, 5 drivers,
                              Supported Range) beats a static formula or a wrist VO2-max guess.
8. Closing CTA paragraph    — the CTA blueprint prose (see meta.ctaBlueprint) + a final <BlogCta>.
9. ## Sources               — bulleted list of every cited source with a one-line parenthetical.
```

Also add 2-3 internal links to related PIRX posts in the body (same `cluster` first). Round-up posts MUST link all sibling posts of that week.

## Exact frontmatter (fumadocs — `source.config.ts`)

Copy this block. Every field is required and typed; `faqs` needs ≥ 2 entries.

```yaml
---
title: "<≤ ~60 char, leads with the primaryQuery intent>"
description: "<150-160 char meta; contains primaryQuery; ends with the free/no-signup hook>"
datePublished: "YYYY-MM-DD"
dateModified: "YYYY-MM-DD"
cluster: "pillar | prediction | training | execution"   # from the calendar
primaryQuery: "<from the calendar>"
calculatorHref: "/race-predictor | /race-predictor/5k | /10k | /half-marathon | /marathon"
calculatorLabel: "<e.g. Marathon Time Predictor>"
order: <integer from the calendar (14-43 for this batch)>
faqs:
  - q: "<real question a runner types or asks a chatbot>"
    a: "<self-contained answer, 2-4 sentences, no markdown, quotable verbatim>"
  - q: "..."
    a: "..."
---
```

The `faqs` become FAQPage JSON-LD. Since Google killed FAQ rich results (May 2026), this schema's job is now AI extraction — write each answer so an LLM can lift it whole.

## MDX components (the only three)

- `<ExtractionTable caption="..." headers={["A","B"]} rows={[["1","2"],["3","4"]]} />` — ONE per post.
- `<BlogCta href="/race-predictor/marathon" label="Marathon Time Predictor" />` — early + closing.
- `<KeyStat value="98%" label="validated prediction accuracy (PIRX users)" />` — for headline numbers.

Do not invent new components or import anything else into MDX.

## Locked terminology (hard fails if violated)

Mirror the `pirx-product-blueprint` skill. The highest-risk traps for blog copy:

| Trap | Rule |
|---|---|
| **"PR" / "PRs" / "Personal Record"** | BANNED. Always **"Personal Best"** (or "New Best" for an in-block badge). |
| **The 5 drivers** | Use ONLY: **Aerobic Base, Threshold Density, Speed Exposure, Load Consistency, Running Economy.** The calendar's casual names (Aerobic Efficiency, Anaerobic Capacity, Fatigue Resistance, Metabolic Fitness) are NOT canonical — map them. Drivers always **sum to total improvement, in seconds**. |
| **Readiness** | "Event Readiness" (0-100; bands: 95-100 Race Ready, 88-94 Sharpening, 75-87 Building, 60-74 Foundational). Never a generic "daily readiness score". |
| **Riegel / VDOT / Daniels / Mercier** | NEVER name them anywhere (enforced by `blog.test.ts`). Refer to generic third-party math as **"a single fixed formula"** or **"one-size-fits-all calculators"**. PIRX is **"a proprietary machine-learning prediction engine"**. |
| **VO2 max** | Only as a critiqued generic metric. Never a PIRX input or output. (It is NOT a banned word — it may be discussed; just never as PIRX's method.) |
| **Supported Range** | Never "confidence interval" / "variance band". |
| **Projected Time** | Never "midpoint", "prediction score", "model output". |
| **Performance change** | PIRX-specific changes in **seconds**, never percentages. |
| **Numbers** | "98% validated prediction accuracy (PIRX users)" is operator-locked and OK. Any other product stat ("135k+ data points", "180k+ projections", trial terms) MUST be operator-verified before publish — never invent or alter. |
| **Updates** | Projection "recalculates after every synced activity; a visible change shows only when structural change ≥ 2 seconds" — not "updates daily" arbitrarily. |
| **Devices** | Only claim integrations that actually exist (blueprint: Garmin, COROS, Strava). Verify WHOOP/Oura/Apple before naming them. |

### Content-quality contract (measured by the gate — hard fails)

| Rule | Threshold | Check |
|---|---|---|
| **Reading level** | Flesch-Kincaid Grade **≤ 5** | measured on prose only (frontmatter/JSX/code/links stripped). Short sentences, simple words, define every technical term plainly. Flag (don't hide) any section that cannot drop below ~6 without distorting the science. |
| **Length** | **1500–2000 words** | prose only (body paragraphs + headings; excludes frontmatter/FAQs, the table, KeyStat, and CTAs). |
| **No em dashes** | zero `—` (U+2014) | use periods or commas. En-dash numeric ranges (`5–10`) are allowed; em dashes are not. |
| **Uniqueness** | below 3-gram-shingle Jaccard **0.25** vs every other post | each post needs a distinct angle, primaryQuery, table, and examples. |

Run the gate before considering any draft done:
`cd pirx-frontend && node scripts/check-content-quality.mjs content/blog/<slug>.mdx`

Banned words (never user-facing): Midpoint, Structural Shift, Projection Delta, Model Output, Confidence Interval, Algorithmic Adjustment, Form Score, Capacity Index, PR, PRs, Personal Record, Riegel, VDOT, Daniels, Mercier. Banned punctuation: the em dash (—).

## Voice

Plain, short, confident — match the existing posts. Read the `natural-human-voice` skill if writing long prose. Short sentences. One idea per sentence. No hype words, no "unlock/leverage/elevate", no em-dash padding. Numbers first, explanation second. Calm confidence, never breathless.

## GEO / AEO / chat levers (why the skeleton is shaped this way)

Condensed; full evidence + sources in [reference.md](reference.md).

- **Answer-first** — lead each section with the answer; 44.2% of LLM citations come from the first 30%.
- **Statistics** — adding specific numbers lifts AI visibility up to **+40%**. ≥1 verifiable stat / 100 words.
- **Cite sources** — inline primary-source citations give up to **+115%** citation lift. Always link.
- **Self-contained sections** — each H2 block must be quotable alone (LLMs extract chunks, not pages).
- **Descriptive question headings** — headings are extraction signals; name the question, don't be clever.
- **Comparison tables & FAQ schema** — over-represented in AI answers; keep the table + the `faqs`.
- **One expert-framed quote** per guide is a top GEO method — add a quotable, attributable line.
- **Specificity beats adjectives** — "drops 22 seconds off a 46:00 10K" beats "gets you faster".

## Workflow checklist

```
- [ ] Pulled the post's row + guards from docs/content/blog-content-calendar.json
- [ ] Firecrawl research done; 3-5 PRIMARY sources saved to .firecrawl/
- [ ] Frontmatter complete + typed (cluster/order/primaryQuery match the calendar; ≥2 faqs)
- [ ] Body follows the skeleton in order (answer-first → table → CTA → Q-H2s → stats → cite → diff → CTA → Sources)
- [ ] Exactly one <ExtractionTable>; ≥1 <KeyStat>; <BlogCta> early + closing
- [ ] ≥1 verifiable stat / ~100 words; every major claim has an inline primary citation
- [ ] 2-3 internal links (same cluster first); round-ups link all week siblings
- [ ] Terminology QA: ran the hard-fail table; no banned words; canonical driver names; "Personal Best"; no Riegel/VDOT/Daniels/Mercier
- [ ] Content contract: FK grade ≤ 5; 1500–2000 words; zero em dashes; unique vs siblings
- [ ] Unverified product numbers flagged for operator (not published as fact)
- [ ] Slug unique; file at pirx-frontend/content/blog/<slug>.mdx
- [ ] Set the calendar post's "status" and update docs/dev/frontend-changelog.md (README Delta)
- [ ] cd pirx-frontend && node scripts/check-content-quality.mjs content/blog/<slug>.mdx  (gate green)
- [ ] cd pirx-frontend && npx vitest run src/lib/__tests__/blog*.test.ts  (blog tests green)
- [ ] cd pirx-frontend && npm run build  (post prerenders, schema valid)
```

## QA gate (before "done")

Run the full QA checklist in [reference.md](reference.md). A post ships only when: blog tests pass, build prerenders it, the terminology hard-fail table is clean, every product-specific number is operator-locked or operator-verified, and the answer-first + table + citation + FAQ pattern is present.
