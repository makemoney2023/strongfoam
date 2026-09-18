# Changelog — head-of-research

## 2026-08-05 — Parallel plugin operational wiring

**Why:** Registry listed `parallel-research` but packs/HEARTBEAT/agent did not force Parallel CLI usage; extract/enrich packs missing; adapter still said MCP.

**Changed**
- Skill packs: Added `parallel-web-extract`, `parallel-data-enrichment`; clarified Firecrawl = crawl/map
- Phase 2/10: Must-read + procedure require `skills/integrations/parallel-research/` choose-table (search → extract → deep/enrich); record `tool_status`
- HEARTBEAT / agents: Tool gate + Parallel before Firecrawl (except crawl)
- Adapter/TOOL-REGISTRY: CLI + OAuth or `PARALLEL_API_KEY` (not MCP)

## 2026-08-05 — Phase playbooks + May-spawn (incl. seo-manager)

**Why:** Phase 2 registry allows `seo-manager` but the skill only listed org-tree analysts — spawn would fail; no executable playbooks for Phase 2 / 10 / 0.

**Changed**
- Spawn / May spawn: Split org-tree **Delegates to** from phase **May spawn** (Phase 2 → MRA + CIA + `seo-manager` parallel); Phase 10 IC mode (no spawn); Phase 0 peer-only
- Phase playbooks: Added Phase 0 peer, Phase 2 manager, Phase 10 IC fact-check playbooks with scorecards + artifact shapes
- Scorecards / done criteria: Echoed registry (“evidence cites sources; market doc non-empty”); falsifiable done checks
- HEARTBEAT / packs / integrations: HEARTBEAT rewritten; packs unchanged (paths verified)

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`); Office Layer B for evidence binders deferred
