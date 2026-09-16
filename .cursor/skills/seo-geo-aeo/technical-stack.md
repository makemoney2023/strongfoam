# Technical Stack — Crawl, Index, Schema, Speed

Ship once per site. Keep tests so it cannot silently regress.

---

## Canonical and hosts

- Pick one production host (`https://www.example.com` **or** apex, not both)
- 301 the other host and http → https
- Every public page: `<link rel="canonical" href="{absolute self}">`
- `metadataBase` / equivalent so OG URLs are absolute
- Do not canonicalize tools to the homepage
- Parameter/share/preview URLs: `noindex,follow` or omit from sitemap

---

## robots.txt

Allow search + **AI retrieval**. Blocking an AI bot = zero citations on that engine.

**Allow (retrieval + training-that-feeds-search):**

```
Googlebot
Bingbot
GPTBot
OAI-SearchBot
ChatGPT-User
PerplexityBot
Perplexity-User
Claude-SearchBot
Claude-User
ClaudeBot
anthropic-ai
Google-Extended
Applebot-Extended
Amazonbot
```

**Disallow for everyone:** `/api/`, authenticated app, admin, reset-password, private shares, staging.

**Block abusive scrapers** (optional, recommended): `Bytespider`, `CCBot`.

Declare `Sitemap: https://www.example.com/sitemap.xml`.

Next.js pattern: `app/robots.ts` returning `MetadataRoute.Robots` with an `AI_SEARCH_BOTS` user-agent group (allow `/`, disallow private paths), Googlebot/Bingbot group, scraper deny-all, then `*`.

Test: fetch `/robots.txt`; grep that GPTBot/PerplexityBot are not `Disallow: /`.

---

## Sitemaps

- Public marketing, tools, docs, blog only
- Lastmod = real `dateModified`
- Split if >50k URLs
- Submit in **Google Search Console (domain property)** and **Bing Webmaster Tools**
- Bing coverage is the ChatGPT path (~87% of ChatGPT citations overlap Bing top-10)

---

## IndexNow (Bing + Yandex)

Google ignores IndexNow. ChatGPT does not ignore Bing. Ping on every publish and significant update.

1. Generate a key; serve it at `https://{host}/{key}.txt`
2. POST to `https://api.indexnow.org/indexnow`:

```json
{
  "host": "www.example.com",
  "key": "<key>",
  "keyLocation": "https://www.example.com/<key>.txt",
  "urlList": ["https://www.example.com/new-page"]
}
```

3. Treat HTTP 200 and 202 as success
4. Wire into the CMS publish path / cron so it is not a manual step
5. Idempotent: skipping a day then sending the backlog is fine

---

## Metadata per page

Required:

| Field | Rule |
|-------|------|
| `title` | 50–60 chars, query front-loaded |
| `description` | 150–160 chars, intent-true |
| `canonical` | Absolute self |
| `og:title` `og:description` `og:image` `og:url` `og:type` | Present |
| `twitter:card` | `summary_large_image` |
| `robots` | index,follow on public; noindex on private |
| `hreflang` | Only for real translations |

Optional but useful: `article:published_time` / `article:modified_time` on posts.

Generate titles from a single helper so templates cannot emit "Home" / "Blog | Brand" duplicates.

---

## JSON-LD

Use `@graph`. Prefer **≥3 types** on content/tool URLs.

**Sitewide (layout or home):** `Organization`, `WebSite` (with `SearchAction` only if a working site search exists), `sameAs` list.

**Articles:** `Article` or `BlogPosting` + `BreadcrumbList` + `FAQPage` + `Person` author + `ImageObject` when a hero exists.

**Tools:** `WebApplication` or `SoftwareApplication` (accurate `applicationCategory`, `offers` only if true) + `FAQPage` + `BreadcrumbList` + `HowTo` if there are real steps.

**Person author** (E-E-A-T / March 2026-style experience weighting):

```json
{
  "@type": "Person",
  "name": "Jane Coach",
  "jobTitle": "Head of Performance Science",
  "url": "https://www.example.com/about",
  "sameAs": [
    "https://www.linkedin.com/in/jane",
    "https://orcid.org/0000-0000-0000-0000"
  ]
}
```

Organization `sameAs`: Wikidata, LinkedIn company, Crunchbase, YouTube, Wikipedia (if it exists). Identical facts.

**Hard rules:**

- Absolute URLs only
- ISO-8601 dates
- FAQ questions/answers **identical** to visible copy
- Do not mark up content the user cannot see
- Do not invent `aggregateRating` — only with a real, defensible source
- Google killed FAQ *rich results*; **do not remove FAQPage** — it remains an AI-extraction signal
- Validate: https://search.google.com/test/rich-results and https://validator.schema.org/

Emit JSON-LD from the same source as the UI (FAQ array → accordion + schema) so they cannot drift. Cover with unit tests that assert `@type` set and FAQ count.

---

## llms.txt / llms.txt

Keep a short markdown map at `/llms.txt` (and `/llms.txt` if you already have it):

```
# Product — one-line what it is

## Primary tools
- [Name](https://www.example.com/tool): one-line what it does

## Guides
- [Title](https://www.example.com/blog/slug): one-line answer
```

Use canonical URLs. `noindex` the file if you like.

**Honest verdict (2026):** no major AI search system uses `llms.txt` for retrieval (Mueller/Illyes). Do not spend a sprint on it. `robots.txt` + extractable HTML + entity are the levers.

---

## Rendering

- Answer paragraph, H1, table, FAQ must be in the **HTML document** (RSC, SSR, SSG, or prerender)
- Client-only shells fail AI crawlers and many Googlebot paths
- `loading.tsx` skeletons are fine; the final payload must still include the text

---

## Performance (ranking + AEO)

Google uses CrUX field data. Targets:

| Metric | Good |
|--------|------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |

Practical:

- Hero image sized + priority; fonts `display: swap` or subset
- No layout shift from ads/embeds above the fold
- Defer non-critical JS
- Mobile-first; 44px targets; no `text-xs` on inputs (iOS zoom)
- After fleet content/template changes, bump any service-worker cache that would serve stale HTML/API

---

## Index hygiene

- 404 real gone URLs; 301 moved URLs (single hop)
- Pagination: rel next/prev or a crawlable index
- Soft 404s (thin "no results" with 200) → 404 or useful content
- Duplicate intent → one winner, others 301 or `rel=canonical`
- International: hreflang reciprocal; x-default

---

## Implementation checklist (new site)

- [ ] Host + HTTPS + canonical helper
- [ ] robots AI allowlist + private disallow + sitemap line
- [ ] sitemap of public URLs; GSC + Bing submitted
- [ ] IndexNow key file + publish hook
- [ ] Organization/WebSite graph + Person author module
- [ ] Per-template metadata tests (title/canonical/og)
- [ ] Per-template JSON-LD tests (≥3 types on article/tool)
- [ ] FAQ source-of-truth shared with UI
- [ ] llms.txt stub
- [ ] Lighthouse mobile pass on money URL
