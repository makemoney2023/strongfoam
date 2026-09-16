# Entity, Off-Page, and Measurement

On-page extractability gets you *eligible*. Entity + measurement get you *chosen* and *improvable*.

---

## Why entity

- Engines cite brands they can resolve to a Knowledge Graph node
- Wikipedia/Wikidata seed a large share of ChatGPT's world model; Reddit dominates Perplexity and is heavy in AI Overviews
- Only ~11% of domains are cited by **both** ChatGPT and Perplexity — you must exist in Bing/Wikipedia *and* Google/Reddit
- Yext-style finding: most AI citations come from brand-managed properties (first-party site + listings)
- Domain-level referring-domain count correlates with ChatGPT citation likelihood; unlinked mentions still help entity resolution

NAP + one-sentence description must be **byte-identical** across site JSON-LD and every profile.

---

## Per-engine bias (use when prioritizing)

| Engine | Index | Overweighted sources | On-page emphasis |
|--------|-------|----------------------|------------------|
| ChatGPT | Bing | Wikipedia, established pubs, **product/tool pages** | Depth, entity, Bing index |
| Perplexity | Google | Reddit, recent primary sources | Freshness, first-party data, thesis in para 1 |
| Gemini / AI Overviews | Google | Organic top-10, Reddit, snippets | Featured-snippet format, schema, already ranking |
| Claude | Broad / primary | Academic and primary docs | Citations, methodology, low-hype tone |

Cross-engine citation overlap is low. Do the cross-engine moves first (entity, tables, sources, robots), then the per-engine extras.

---

## Entity build order

### 1. First-party (week 1)

- Organization JSON-LD: `name`, `legalName`, `url`, `logo`, `foundingDate`, `address` or `areaServed`, `sameAs`
- About page with the same facts in prose
- Author Person nodes with credentials (not Organization-as-author on guides)

### 2. Wikidata (week 1–2)

Create or edit an item:

- instance of: software / business as accurate
- official website
- inception
- headquarters location
- official blog if it exists

Mirror Q-id in `sameAs`: `https://www.wikidata.org/wiki/Q…`

Do **not** spam. One factual item. Wikipedia article only after independent reliable sources exist.

### 3. Listings (week 2)

Same description + URL on: LinkedIn company, Crunchbase, Product Hunt, G2 or Capterra if you are software, Apple/Google listings if you have apps.

### 4. Communities (ongoing, never fake)

- Answer real threads in the niche. Lead with the method. Mention the product only when it is the honest tool.
- Astroturf gets you banned and becomes a negative training example.
- Quora / Stack Exchange / specialty forums: credentialed account, same rule.

### 5. YouTube (days 61–90)

2–3 videos that answer a money query or compare methods. Unique title/description; chapters; spoken first-30-seconds = the answer. Transcripts are extractable.

### 6. Digital PR

Pitch trade press, newsletters, podcasts for mentions and links. Target publications the niche already cites. Unlinked brand mentions still feed entity recognition.

---

## Programmatic / scale warnings

Google's weakest-link treatment: a pile of thin templated URLs can suppress the **domain**. Every generated URL needs unique synthesis (original table, local facts, unique sources). If you cannot write that, do not generate the URL.

---

## Measurement

### GA4 — AI referrals

Create this **immediately** (custom channel groups do not backfill).

Native GA4 "AI Assistants" channel often already classifies ChatGPT/Perplexity/Gemini/Copilot/Claude. Confirm it exists.

If you add a custom group, put **AI Search above Referral**:

```
chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|bing\.com/chat|meta\.ai|you\.com|poe\.com
```

**Caveat:** Google AI Overviews/AI Mode usually send **no** distinct referrer — those clicks look like Organic. Use GSC for AIO visibility; use GA4 for ChatGPT/Perplexity/Claude/Gemini chat referrals (ChatGPT often appends `utm_source=chatgpt.com`).

Also: 14-month data retention; mark signup/tool-complete as key events.

### Google Search Console

- Domain property (covers www + apex)
- Watch AI Mode / AI Overview filters when present
- Striking distance: position 4–20, impressions ≥100 / 90d → content refresh, not a new competing URL
- Query regex for questions: `^(who|what|when|where|why|how|is|are|can|should)\b`
- CTR gaps vs expected-by-position → title/meta rewrite before a rewrite of the body

### Bing Webmaster

- Import verification from GSC if possible
- Sitemap submitted; inspect money URLs
- IndexNow key verified

### Citation share of voice (monthly)

Pick 20 prompts (head + fan-out). For each engine (ChatGPT, Perplexity, Gemini, AI Overviews):

| Prompt | Cited us? | URL cited | Competitor cited | Notes |
|--------|-----------|-----------|------------------|-------|
| | Y/N | | | |

Score: `% of prompts where we are a cited source`. Direction over 90 days matters more than one screenshot.

Optional tools: Profound, Otterly, Peec, Ahrefs Brand Radar — not required to start.

### Page-level SEO score (when auditing one URL)

Weight: intent 20%, E-E-A-T 20%, depth 20%, on-page 15%, structure 15%, technical 10%. Use the full 0–10 range. Indexability failure outranks all other scores.

Expected CTR (informational, no AIO): pos1 25–30%, pos2 13–17%, pos3 9–12%, pos4–5 5–8%, pos8–10 1.5–3%. AIO can cut organic CTR ~30–50% further.

---

## 20-prompt set (how to build)

1. 3 head money queries
2. 8 how-to / what-is fan-outs
3. 5 comparison / vs
4. 4 "best X for Y" / situational

Re-run the same 20. Do not rotate every month or the series is noise.

---

## 90-day operating cadence

| Cadence | Action |
|---------|--------|
| Weekly | IndexNow on publishes; GSC coverage errors; one cluster URL shipped or refreshed |
| Monthly | 20-prompt SoV; GA4 AI channel vs organic conversion; cannibalization check |
| Quarterly | Wikidata/listings fact audit; CWV field data; kill thin URLs |

---

## Priority if resources are scarce

1. Money URL extractability + Bing index + robots allowlist
2. GA4 AI channel + GSC domain property
3. Wikidata + identical sameAs
4. Cluster content with tables and primary citations
5. Reddit/YouTube/PR

Do not start with `llms.txt` polish or schema types the page does not deserve.
