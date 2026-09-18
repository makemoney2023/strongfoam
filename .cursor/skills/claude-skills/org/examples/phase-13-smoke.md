# Smoke scenario — Phase 13 (docs-only)

Validates the reporting chain **and model routing** without requiring a live multi-agent harness. An agent (or human) can walk this checklist.

## Setup

- Orchestrator skill loaded (`frontier-reasoning`)
- `skills/org/MODEL-REGISTRY.md` readable
- Positions installed; agents synced (`./scripts/sync-org-agents.sh`) optional (degrade OK)
- Prior artifacts exist or stubs: `03-strategy.md`, `.agents/product-marketing.md`

## Expected model pins (Plane A)

| Seat | llm_tier | llm_model |
|------|----------|-----------|
| orchestrator | frontier-reasoning | `grok-4.5` |
| cmo | frontier-reasoning | `grok-4.5` |
| copy-chief | creative-language | `composer-2.5` |
| content-strategist | strong-general | `composer-2.5` |
| product-marketing-manager | strong-general | `composer-2.5` |
| ceo-strategist (review) | frontier-reasoning | `grok-4.5` |

All Phase 13 seats: `generation_profile: none`.

## Steps

1. **Orchestrator** builds manager packet for `cmo`, phase `13`, including:
   ```yaml
   llm_tier: frontier-reasoning
   llm_model: grok-4.5
   generation_profile: none
   ```
   Does **not** spawn `copy-chief` directly. **Refuse** if `llm_tier` omitted.
2. **CMO** spawns (each IC packet has `llm_tier` + `llm_model`):
   - `copy-chief` — lease `13-copy-foundation.md` (DR sections) · `creative-language`
   - `content-strategist` — lease calendar section · `strong-general`
   - `product-marketing-manager` — lease messaging hierarchy if needed · `strong-general`
3. Each IC writes `HANDOFFS/13-<slug>.md` with model audit fields (`llm_tier`, `llm_model`, `generation_profile`, `generation_used`, `fallback_applied`).
4. **CMO** merges → `HANDOFFS/13-manager-cmo.md` with recommendation `approve` + model routing check.
5. **CEO** writes `HANDOFFS/13-csuite-review.md` with `verdict: approve` (or `revise`), including scorecard row **Correct model tier used?**
6. Orchestrator fills tracker Positions & handoffs row (optional Preferred llm_tier column); marks Phase 13 ✅ only if approve.

## Pass criteria

- [ ] No orchestrator→IC spawn
- [ ] Every packet included `llm_tier`
- [ ] Three IC handoffs (or fewer if CMO documented skip) + manager brief + csuite review
- [ ] Handoffs record model audit fields
- [ ] `13-copy-foundation.md` non-empty
- [ ] Tracker verdict column = approve
- [ ] copy-chief used creative-language (or documented `fallback_applied`)

## Related smoke (creative / Veo)

For Phase 15, packet must include `generation_profile: hero-video` and handoff `generation_used` e.g. `fal/veo-3.1` (or skip reason). Env placeholders: `FAL_KEY`, `ELEVENLABS_API_KEY` in `.env.local`.
