# Model Registry — Digital Worker Routing

Single source of truth for **which Cursor LLM** and **which generation stack** each position uses.  
Env placeholders: repo-root `.env.local`. Org tree: [`ORG-REGISTRY.md`](./ORG-REGISTRY.md).

**Two planes**

| Plane | What | Where configured |
|-------|------|------------------|
| **A — Cursor LLM** | Reasoning / writing / coding | Agent frontmatter `model:`, Task `model=`, packet `llm_tier` / `llm_model` |
| **B — Generation** | Image / video / audio APIs | `generation_profile` → OpenMontage / fal / inference.sh (not Cursor `model:`) |

Designers do **not** “run as Veo.” They use a Plane A LLM and **must** render via Plane B when `generation_profile != none`.

---

## Tier catalog (Plane A)

| Tier | Preferred Cursor `model` | Fallback ladder | Typical seats |
|------|--------------------------|-----------------|---------------|
| `frontier-reasoning` | `grok-4.5` | → `composer-2.5` → `inherit` | Orchestrator, C-suite, legal, hard gates |
| `strong-general` | `composer-2.5` | → `inherit` | Most managers + research/product/marketing ICs |
| `creative-language` | `composer-2.5` | → `inherit` | Copy, CD briefs, PR |
| `coding-agent` | `composer-2.5` | → `inherit` | CTO, eng, analytics, hardware text |
| `fast-ops` | `composer-2.5` | → `inherit` | SEO checklists, ops, recruiter drafts |
| `inherit-parent` | `inherit` | — | Rare; only when packet explicitly allows |

**Policy:** Use **Grok 4.5** (`grok-4.5`) for thinking / reasoning seats (`frontier-reasoning`). Use **Composer 2.5** (`composer-2.5`) for all other Plane A work. Both are first-party models ([Cursor models docs](https://cursor.com/docs/models-and-pricing)).

**Cost policy:** Prefer `composer-2.5` for ICs and day-to-day manager work. Reserve `frontier-reasoning` / `grok-4.5` for orchestrator decisions, C-suite review, legal, and hard-gate phases (3, 6, 10, 14, 19, 21).

If a preferred model is blocked by plan/admin, apply the fallback ladder and set `fallback_applied: true` on the handoff.

### Optional: Cursor Router (SDK / API hosts)

For **programmatic** `@cursor/sdk` / `cursor-sdk` hosts (e.g. OCC runtime), Teams/Enterprise may expose Router as model id `auto-smart` with required param `optimize_for`: `cost` | `balanced` | `intelligence`. Discover via `Cursor.models.list()` before pinning — do not hardcode if missing from the catalog. Org position packets still prefer explicit `composer-2.5` / `grok-4.5` from this registry unless an operator opts a seed into Router for cost exploration. See the `sdk` skill.

---

## Generation profiles (Plane B)

| Profile | Image | Video | Audio | Env (minimum) | Used by |
|---------|-------|-------|-------|---------------|---------|
| `none` | — | — | — | — | Most text roles |
| `brand-stills` | **Mac:** FLUX.2-dev local via `ai-toolkit-local` (`HF_TOKEN`); **API:** FLUX.2 pro/max via fal or inference.sh; drafts may use klein / Cursor gen; **upscale** via `image-upscaling` | — | — | `HF_TOKEN` (+ `AI_TOOLKIT_ROOT`) and/or `FAL_KEY` / `INFSH_API_KEY` | brand-designer, web-designer |
| `hero-video` | FLUX keyframes | **Veo 3.1** via fal (`OPENMONTAGE_DEFAULT_VIDEO_MODEL=veo-3.1`) | ElevenLabs | `FAL_KEY`, `ELEVENLABS_API_KEY` | video-producer Phase 15 |
| `ad-creative` | FLUX.2 pro/max / GPT Image + photoreal-stills QA | Veo 3.1 or Kling short | optional ElevenLabs | `FAL_KEY`; optional `KLING_API_KEY`, `OPENAI_API_KEY` | Phase 19 video + paid creatives |

Provider strings must match OpenMontage / `.env.local`. Optional fallbacks: `HEYGEN_API_KEY`, `RUNWAY_API_KEY`, `GOOGLE_API_KEY`.

**Photoreal stills:** Seats on `brand-stills` / `ad-creative` must follow [`packs/photoreal-stills/SKILL.md`](./packs/photoreal-stills/SKILL.md) (camera/lens prompting, multi-ref identity, reject checklist, `photoreal_qa` on handoff). Cursor built-in image gen is draft-only — not Layer B final.

---

## Position → model map

Every roster slug appears **once**. Orchestrator included.

| Slug | llm_tier | Preferred `model` | generation_profile |
|------|----------|-------------------|--------------------|
| company-orchestrator | frontier-reasoning | `grok-4.5` | none |
| ceo-strategist | frontier-reasoning | `grok-4.5` | none |
| head-of-research | strong-general | `composer-2.5` | none |
| market-research-analyst | strong-general | `composer-2.5` | none |
| competitive-intelligence-analyst | strong-general | `composer-2.5` | none |
| cfo | frontier-reasoning | `grok-4.5` | none |
| fpa-analyst | strong-general | `composer-2.5` | none |
| fundraising-lead | strong-general | `composer-2.5` | none |
| head-of-product | strong-general | `composer-2.5` | none |
| product-manager | strong-general | `composer-2.5` | none |
| business-analyst | strong-general | `composer-2.5` | none |
| cmo | frontier-reasoning | `grok-4.5` | none |
| product-marketing-manager | strong-general | `composer-2.5` | none |
| copy-chief | creative-language | `composer-2.5` | none |
| content-strategist | strong-general | `composer-2.5` | none |
| seo-manager | fast-ops | `composer-2.5` | none |
| paid-media-manager | strong-general | `composer-2.5` | ad-creative |
| lifecycle-marketer | strong-general | `composer-2.5` | none |
| pr-manager | creative-language | `composer-2.5` | none |
| creative-director | creative-language | `composer-2.5` | none |
| brand-designer | strong-general | `composer-2.5` | brand-stills |
| web-designer | strong-general | `composer-2.5` | brand-stills |
| video-producer | strong-general | `composer-2.5` | hero-video |
| head-of-sales-cs | strong-general | `composer-2.5` | none |
| sales-enablement-lead | strong-general | `composer-2.5` | none |
| outbound-lead | strong-general | `composer-2.5` | none |
| customer-success-manager | strong-general | `composer-2.5` | none |
| coo | frontier-reasoning | `grok-4.5` | none |
| ops-manager | fast-ops | `composer-2.5` | none |
| legal-counsel | frontier-reasoning | `grok-4.5` | none |
| head-of-people | strong-general | `composer-2.5` | none |
| recruiter | fast-ops | `composer-2.5` | none |
| cto | coding-agent | `composer-2.5` | none |
| tech-lead | coding-agent | `composer-2.5` | none |
| verifier | strong-general | `composer-2.5` | none |
| hardware-engineer | coding-agent | `composer-2.5` | none |
| head-of-data | strong-general | `composer-2.5` | none |
| analytics-engineer | coding-agent | `composer-2.5` | none |

**Phase 19 note:** `paid-media-manager` defaults to `ad-creative`. When `video-producer` works paid ads, packet may set `generation_profile: ad-creative` (overrides default `hero-video` for that spawn only).

---

## Pack → model needs

| Pack / skill area | llm_tier hint | generation_profile |
|-------------------|---------------|--------------------|
| `advertising-skills` (copy-chief / foundations) | creative-language | none |
| `visual-skills/image` | strong-general | brand-stills |
| `visual-skills/video` | strong-general | hero-video / ad-creative |
| `openmontage` | strong-general | hero-video (Veo 3.1 primary) |
| `inference-sh` (image render) | strong-general | brand-stills |
| corporate finance / DCF | strong-general | none |
| product-marketing / marketingskills | strong-general | none |
| research / firecrawl / parallel | strong-general | none |

---

## Enforcement

1. **Refuse spawn** if context packet lacks `llm_tier`.
2. Resolve `llm_model` from this file (or `.env.local` `WORKER_<SLUG>_MODEL` if set).
3. Set agent / Task `model` to preferred ID; never invent IDs.
4. For phases **11, 12, 15, 19**, packet must include `generation_profile` (may be `none` only if skip-reason documented).
5. Handoffs must record: `llm_tier`, `llm_model`, `generation_profile`, `generation_used`, `fallback_applied`.
6. C-suite may **revise** if wrong tier/profile used on hard-gate or creative/legal work.
7. C-suite review itself always uses `frontier-reasoning` (`grok-4.5`).

### Audit fields (handoffs)

```yaml
llm_tier: strong-general
llm_model: composer-2.5
generation_profile: none
generation_used: none          # or "fal/veo-3.1", "inference-sh/nano-banana-2", …
fallback_applied: false
```

### Install agents

```bash
./scripts/sync-org-agents.sh
```

Cursor loads `model:` from `.cursor/agents/<slug>.md` (not `templates/`). If the IDE strips YAML frontmatter, re-run the sync script or edit externally.

### Related env

See `.env.local` for `WORKER_*_MODEL`, `GEN_PROFILE_*`, and API key placeholders (`FAL_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`, …).
