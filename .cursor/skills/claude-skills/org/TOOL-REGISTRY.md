# Tool Registry — Digital Worker Integrations

Single source of truth for **which seats use which external APIs / MCP servers**.  
Craft packs stay in position `Skill packs`. Live tool access uses `skills/integrations/`.

**Related:** [`ORG-REGISTRY.md`](./ORG-REGISTRY.md) · [`MODEL-REGISTRY.md`](./MODEL-REGISTRY.md) · [`orchestrator/SKILL.md`](./orchestrator/SKILL.md)

## Hard rules

1. Before any live API call, resolve secrets via `obsidian-secrets` (if Obsidian MCP is available) else `.env.local`. Never invent keys or metrics.
2. Prefer MCP when the server is connected; otherwise use the skill’s REST/CLI fallback.
3. If a tool is unavailable, set `tool_status: unavailable` on the handoff and continue with craft packs / exports.
4. Seats may only use tools listed as **primary** or **secondary** for their slug (orchestrator may grant one-off exceptions in the packet).
5. Managers ensure IC packets include required env/property IDs when a phase expects live data.

## MCP posture

Seat `SKILL.md` files are **instructions**, not MCP servers. Do not create an MCP server per digital worker.

| Layer | Role |
|-------|------|
| Brain | `skills/org/positions/<seat>/SKILL.md` loaded locally into Cursor workers |
| External toolbelt | MCP/REST tools in this registry (Firecrawl, GitHub, GA, …) |
| Internal toolbelt | OCC HTTP (Jarvis) and optional **`occ-control`** MCP for non-Jarvis clients |

**Forbidden:** wrapping Cursor SDK as an MCP tool solely for LiveKit; per-seat MCP under `positions/`.  
**Allowed:** one proprietary OCC Control MCP (`occ-control`) when a non-Jarvis MCP host needs company actions.  
**Spec:** [`docs/superpowers/specs/2026-07-20-mcp-posture-and-control-plane-design.md`](../../docs/superpowers/specs/2026-07-20-mcp-posture-and-control-plane-design.md)

## Tool catalog

| tool_id | Skill path | Depth | Preferred access | Env / secrets | MCP server id(s) | Fallback |
|---------|------------|-------|------------------|---------------|------------------|----------|
| google-auth | `skills/integrations/google-auth/` | full | ADC / service account JSON | `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT` | — (shared) | `gcloud auth application-default login` |
| google-analytics | `skills/integrations/google-analytics/` | full | GA4 Data API / GA MCP | `GA4_PROPERTY_ID` + google-auth | `analytics-mcp` / googleanalytics MCP | REST `analyticsdata.googleapis.com` |
| google-search-console | `skills/integrations/google-search-console/` | full | GSC API / GSC MCP | `GSC_SITE_URL` + google-auth | `gsc` / `mcp-server-gsc` | REST `searchconsole.googleapis.com` |
| pagespeed-insights | `skills/integrations/pagespeed-insights/` | thin | PageSpeed Insights API | `GOOGLE_API_KEY` (optional) | — | Public PSI endpoint / Lighthouse CLI |
| google-ads | `skills/integrations/google-ads/` | thin | Google Ads API | `GOOGLE_ADS_*` + google-auth | Google Ads MCP if present | Ads UI exports |
| firecrawl | `skills/integrations/firecrawl/` | thin | Firecrawl MCP | `FIRECRAWL_API_KEY` | `user-firecrawl-mcp` | — |
| parallel-research | `skills/integrations/parallel-research/` | thin | Parallel Cursor plugin + `parallel-cli` | `PARALLEL_API_KEY` or OAuth (`parallel-cli login`) | — (CLI skills) | firecrawl + context7 |
| context7-docs | `skills/integrations/context7-docs/` | thin | Context7 MCP | — | `plugin-context7-plugin-context7`, `user-context7-mcp` | Vendor docs URLs |
| figma | `skills/integrations/figma/` | thin | Figma MCP + plugin skills | Figma auth via MCP | `plugin-figma-figma`, `user-Figma` | — |
| supabase | `skills/integrations/supabase/` | thin | Supabase MCP + plugin skill | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | `plugin-supabase-supabase`, `user-supabase` | Supabase CLI |
| vercel | `skills/integrations/vercel/` | thin | Vercel MCP + plugin skills | `VERCEL_TOKEN` | `user-vercel` | Vercel CLI |
| github | `skills/integrations/github/` | thin | GitHub MCP / `gh` | `GITHUB_TOKEN` | `user-github` | `gh` CLI |
| stripe | `skills/integrations/stripe/` | thin | Stripe plugin skill | Stripe keys via secrets | stripe plugin | Stripe Dashboard |
| fal-media | `skills/integrations/fal-media/` | thin | fal API (Veo/FLUX) | `FAL_KEY` / `FAL_AI_API_KEY` | — | inference-sh adapters |
| ai-toolkit-local | `skills/integrations/ai-toolkit-local/` | thin | Local FLUX.2-dev via Ostris ai-toolkit (Mac MPS) | `HF_TOKEN`; `AI_TOOLKIT_ROOT` | — | fal-media (commercial API upgrade) |
| elevenlabs | `skills/integrations/elevenlabs/` | thin | ElevenLabs API | `ELEVENLABS_API_KEY` | ElevenLabs MCP if present | OpenMontage local TTS |
| obsidian-secrets | `skills/integrations/obsidian-secrets/` | thin | Obsidian MCP vault notes | — | Obsidian MCP when configured | `.env.local` only |
| playwright-browser | `skills/integrations/playwright-browser/` | thin | Playwright MCP | — | `user-playwright`, `cursor-ide-browser` | — |
| shadcn-ui | `skills/integrations/shadcn-ui/` | thin | shadcn MCP | — | `user-shadcn-ui` | CLI `npx shadcn@latest` |

## Seat → tools

| Seat | Primary | Secondary |
|------|---------|-----------|
| company-orchestrator | obsidian-secrets, github | context7-docs |
| ceo-strategist | obsidian-secrets, context7-docs | parallel-research, github |
| head-of-research | parallel-research, firecrawl, context7-docs | github |
| market-research-analyst | parallel-research, firecrawl | context7-docs |
| competitive-intelligence-analyst | parallel-research, firecrawl, playwright-browser | — |
| cfo | obsidian-secrets | stripe, github |
| fpa-analyst | — | stripe |
| fundraising-lead | — | parallel-research |
| head-of-product | github, context7-docs | supabase, vercel |
| product-manager | github | figma, supabase |
| business-analyst | context7-docs | github, firecrawl |
| cmo | google-analytics, google-search-console | parallel-research, google-ads |
| product-marketing-manager | parallel-research | google-analytics |
| copy-chief | — | firecrawl |
| content-strategist | google-search-console, firecrawl | parallel-research |
| seo-manager | google-search-console, google-analytics, pagespeed-insights, firecrawl | playwright-browser |
| paid-media-manager | google-ads, google-analytics | fal-media, elevenlabs |
| lifecycle-marketer | google-analytics | — |
| pr-manager | parallel-research, firecrawl | — |
| creative-director | figma, fal-media, ai-toolkit-local | elevenlabs |
| brand-designer | figma, ai-toolkit-local, fal-media | — |
| web-designer | figma, shadcn-ui, vercel, pagespeed-insights | playwright-browser, fal-media, ai-toolkit-local |
| video-producer | fal-media, elevenlabs | — |
| head-of-sales-cs | — | google-analytics, parallel-research |
| sales-enablement-lead | — | firecrawl, parallel-research |
| outbound-lead | parallel-research, firecrawl | — |
| customer-success-manager | google-analytics | stripe |
| coo | github, obsidian-secrets | — |
| ops-manager | github | vercel, supabase |
| legal-counsel | — | parallel-research, firecrawl |
| head-of-people | — | parallel-research |
| recruiter | parallel-research | firecrawl |
| cto | github, vercel, supabase, context7-docs | playwright-browser |
| tech-lead | github, vercel, supabase, context7-docs, shadcn-ui, playwright-browser | stripe |
| verifier | playwright-browser | — |
| hardware-engineer | context7-docs | github |
| head-of-data | google-analytics, google-search-console, context7-docs | supabase |
| analytics-engineer | google-analytics, google-auth, context7-docs | google-search-console, supabase |

**Every seat:** may use `obsidian-secrets` when a listed tool needs a missing key.

## Phase → live tools

| Phase | Live tools expected | Notes |
|-------|---------------------|-------|
| 2 | parallel-research, firecrawl | Evidence with sources |
| 9 / 9B | github; vercel/supabase if stack uses them; context7-docs; playwright-browser (MVP smoke) | Build log |
| 11–12 | figma, fal-media; pagespeed optional | Brand / web |
| 14–16 | GSC, GA4 (if property exists), pagespeed, firecrawl | Organic |
| 18–19 | google-ads, GA4, fal-media, elevenlabs | Paid / creative |
| 20 | google-analytics, google-auth; GSC optional | KPI + events |
| 22 | GA4, GSC, google-ads as available | Cadence; degrade OK |

## Position Integrations section (format)

Each `positions/<slug>/SKILL.md` includes:

```markdown
## Integrations
Live tools for this seat (see `skills/org/TOOL-REGISTRY.md`). Read each skill before first use.

| tool_id | Access | Skill |
|---------|--------|-------|
| … | primary \| secondary | `skills/integrations/…/` |

Resolve secrets via `obsidian-secrets` then `.env.local`. If unavailable → `tool_status: unavailable` on handoff.
```

## Env placeholders (repo `.env.local`)

| Variable | Used by |
|----------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | google-auth, GA, GSC |
| `GOOGLE_CLOUD_PROJECT` | google-auth / GA MCP |
| `GA4_PROPERTY_ID` | google-analytics (numeric property id) |
| `GSC_SITE_URL` | google-search-console (`https://…/` or `sc-domain:…`) |
| `GOOGLE_API_KEY` | pagespeed-insights (optional) |
| `FIRECRAWL_API_KEY` | firecrawl |
| `PARALLEL_API_KEY` (or `parallel-cli login` OAuth) | parallel-research |
| `FAL_KEY` / `FAL_AI_API_KEY` | fal-media |
| `ELEVENLABS_API_KEY` | elevenlabs |
| `SUPABASE_*` / `DATABASE_URL` | supabase |
| `VERCEL_TOKEN` | vercel |
| `GITHUB_TOKEN` | github |
