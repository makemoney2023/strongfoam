# Content System — SEO + GEO + AEO

How every public page is researched, structured, and gated. Brand-agnostic. Bind product nouns from the project's locked terminology before writing.

---

## Why this skeleton exists (measured)

| Lever | Effect | Application |
|-------|--------|-------------|
| Statistics (specific numbers + units) | up to +40% AI visibility (GEO / KDD '24) | ≥1 verifiable number per ~100 words |
| Cite primary sources inline | +115% relative lift for a mid-pack page; ~+41% avg | Every major claim links a primary URL |
| Answer in first 30% of page | ~44% of LLM citations come from there | Lead the page and every section with the answer |
| Self-contained labeled sections | RAG/chunk extraction | Each H2 quotable alone |
| Question headings | Headings are extraction keys | H2 names the query; never clever/vague |
| Comparison tables + FAQ schema | Over-represented in AI answers; FAQ+citations ~40% higher ChatGPT weighting | One extraction table + `FAQPage` |
| 3+ schema types | +13% citation probability | Article/WebApplication + FAQPage + BreadcrumbList (+ HowTo/Person as relevant) |
| Expert quotation | Top-3 GEO method | One attributable, real quote per guide |
| Specificity | Generic adjectives are not cited | "drops 22 seconds off a 46:00 10K" not "gets you faster" |
| Keyword stuffing | **−8% PAWC** | Natural language after the first mention |

Acquia (2026): restructuring existing pages to answer-first H2s + FAQ + consistent naming moved AI-citation share **14% → 38% in 90 days with zero new URLs**. Structure alone moves GEO.

Organic CTR drops ~61% when an AI Overview appears; AI-referred traffic converts ~8–16% vs ~1.8% organic. Still ship SEO — volume lives there.

---

## Research before draft

1. Search the primary query. Note top 5 formats (guide, tool, listicle, forum). **The SERP is ground truth for intent** — do not infer intent from your own draft.
2. Collect People Also Ask / Reddit / support questions → FAQ + H2s (query fan-out). Cover several sub-questions so one URL can be the source for a decomposed prompt.
3. Find **3–5 primary sources** (papers, datasets, official docs, first-party data). Not other blogs. Fetch the URL; quote only what is on the page.
4. Decide the **angle** the SERP lacks (original table, first-party method, unique worked example). Do not rewrite the #1 result.
5. Map 2–3 internal URLs to link to/from (same cluster first).

If Firecrawl/web fetch is available, use it. Save sources next to the draft.

---

## Page types

### Informational (blog / guide)

Intent: how / what / why. Convert via mid-page + closing CTA to the tool.

Length: enough to be the last click (typically 1,200–2,000 prose words). Do not pad.

### Tool / product URL

Intent: do the thing. ChatGPT cites product pages far more than Perplexity.

Above the fold: working tool + 2–4 sentence answer of what the result means.
Below: method (plain language), extraction table, FAQ, citations, related guides.
Never a widget-only page.

### Commercial investigation (vs / alternative / best)

Honest comparison table. Name competitors fairly. Product row uses locked claims only.
`ItemList` or comparison-shaped table + FAQPage.

### Transactional (pricing / signup)

Proof, objections, CTA. Schema: `SoftwareApplication` / `Product` / `Offer` as accurate.
Do not stuff informational FAQs that the page does not answer.

---

## Title, H1, meta

**Title (50–60 chars)** — primary query at the front + hook:

- Number + query + promise
- How to [query]: [concrete outcome]
- [Query] vs [alternative]: [verdict]
- What is [query]? [short answer]

**H1** — same intent as title; may be slightly longer; one H1.

**Meta (150–160 chars)** — what the page delivers + benefit + CTA. Must match the first-screen answer (no bait). Include the primary query once, naturally.

**Slug** — hyphenated query, no dates unless the content is inherently dated.

**OG/Twitter** — unique title/description/image; image 1200×630; `og:url` = canonical.

---

## Extraction table rules

- Exactly **one** per URL unless the page is a genuine multi-dataset hub
- Caption states what the table decides
- Headers are nouns a model can reuse ("Distance", "Multiplier", "When it breaks")
- Every cell is a complete fact (no "see above")
- Numbers include units
- Prefer HTML `<table>` (not an image, not a JS canvas)

---

## Section writing

```
## [Question the user actually types]?

[Complete answer in one sentence. Include the number or verdict.]

[2–5 short paragraphs. One idea each. Worked example. Citation.]
```

- First sentence after H1 answers the primary query
- Average paragraph 2–4 sentences
- Define technical terms on first use
- Lists for sequences; tables for comparisons
- Bold the verdict, not random keywords
- Internal links use descriptive anchors that include the target query

---

## Evidence hunt (mandatory)

Before adding a number or quote:

1. Web search / fetch the primary page
2. Record: claim, number, unit, source name, URL, date, sample size if any
3. If it cannot be verified, **delete the claim** or replace with a related verified stat (say so)

Never: "studies show", "experts estimate", invented author names, fake years.

First-party data (your product metrics, operator-locked accuracy numbers) is the strongest GEO signal. Use only numbers the operator has approved.

---

## FAQ writing

- Real questions from PAA, GSC, Reddit, sales — not "What is [Brand]?"
- Answer 2–4 sentences, no markdown, quotable verbatim
- First sentence is the full answer; rest is constraint/exception
- Visible accordion **and** JSON-LD must be identical
- Google deprecated FAQ rich results (2026). Keep FAQPage for **AI extraction**, not star-snippet hunting

---

## Voice

Plain, short, confident. Numbers first, explanation second. No hype verbs (unlock, leverage, elevate, revolutionize). No em-dash padding if the brand forbids it. No throat-clearing.

Match reading level to audience. Consumer tools: short sentences, define jargon. Developer docs: precise terms, still answer-first.

---

## On-page SEO checklist

- Primary query in title, H1, first 100 words, one H2, slug, meta
- Secondary queries as H2s / table headers / FAQ — not stuffed
- Images: descriptive alt, compressed, width/height, lazy below fold
- Unique title/H1/meta vs every other URL
- `datePublished` / `dateModified` real and updated on material edits
- Outbound links to primary sources (new window optional; do not `nofollow` citations)

---

## QA gate (content)

- [ ] Last-click test: would the reader still need to Google this?
- [ ] SERP format match (if top results are tables, you have a table)
- [ ] First 150 words = the answer
- [ ] Extraction table stands alone
- [ ] Every H2 question + self-contained first sentence
- [ ] Stat density and real citations
- [ ] Locked terminology clean; no banned competitor-formula names if the product forbids them
- [ ] CTA present early and at end, pointing at the real conversion URL
- [ ] 2–3 internal links each direction
- [ ] FAQs ≥3, visible + schema-identical

---

## Refresh cadence

Pages still ranking: if `dateModified` > 90 days and the topic moves, refresh numbers, re-fetch sources, update the table, bump `dateModified` only when the body materially changed. Recency correlates with Perplexity citations.

Declining GSC clicks + stale content → refresh before writing a competing URL.
