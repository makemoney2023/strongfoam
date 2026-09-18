# Org Positions (Virtual Company Subagents)

Portable **position skills** + Cursor **agent definitions** so the business-idea runbook can spin up a full company as subagents.

**Registry:** [ORG-REGISTRY.md](./ORG-REGISTRY.md) — org tree, phase owners, delegation  
**Tools:** [TOOL-REGISTRY.md](./TOOL-REGISTRY.md) — seat → API/MCP map · portable skills in [`skills/integrations/`](../integrations/)  
**Orchestrator:** [orchestrator/SKILL.md](./orchestrator/SKILL.md) — CEO dispatcher  
**Template:** [POSITION-TEMPLATE.md](./POSITION-TEMPLATE.md)

**MCP posture:** Position skills are markdown brains, not MCP servers. External SaaS access goes through integration skills / connected MCPs in TOOL-REGISTRY. Company actions go through OCC (Jarvis HTTP or optional `occ-control`). See [MCP posture design](../../docs/superpowers/specs/2026-07-20-mcp-posture-and-control-plane-design.md).

## Install into a project

```bash
# Position skills (keep folder structure)
mkdir -p /path/to/project/.cursor/skills/org
cp -r skills/org/positions skills/org/orchestrator skills/org/ORG-REGISTRY.md \
  /path/to/project/.cursor/skills/org/

# Cursor custom agents (required for native subagent dispatch)
mkdir -p /path/to/project/.cursor/agents
cp templates/org/agents/*.md /path/to/project/.cursor/agents/
```

Also copy the community packs each position needs (or the whole `skills/community/` tree).

## How it works (reporting chain)

1. Main session loads **orchestrator** (runbook principle #9).
2. Orchestrator spawns the phase **Owner manager only** (never ICs).
3. Manager spawns ICs with `write_lease` → IC handoffs → manager brief.
4. C-suite review file must `verdict: approve` before phase ✅.
5. Artifacts in `docs/projects/<active>/business-idea/`; handoffs in `docs/projects/<active>/business-idea/HANDOFFS/`.

**Contracts:** `HANDOFF-TEMPLATE.md` · `MANAGER-BRIEF-TEMPLATE.md` · `CSUITE-REVIEW-TEMPLATE.md` · `COLLABORATION.md` · `ESCALATION.md`  
**Production:** [`packs/production-artifacts/SKILL.md`](./packs/production-artifacts/SKILL.md) — Craft → Production → Wire for shippable phases (HTML email, apps, stills, video, creatives).  
**Standing context:** [`packs/standing-context/SKILL.md`](./packs/standing-context/SKILL.md) — venture-agnostic psychology, persuasion, humor, and sales-YouTube frameworks bound on relevant seats.

**Handoff merge gate:** Managers/orchestrator reject creative/eng/CRO/brand/web handoffs that lack (1) pack paths and (2) one decision tied to each pack. See `HANDOFF-TEMPLATE.md` § Merge gate.

**Pack path CI:** `scripts/validate-skill-pack-paths.sh` (also runs from `scripts/sync-org-agents.sh`) — fails if position Skill pack tables point at missing paths.  
**Wave-1 skill bindings:** `scripts/validate-wave1-skill-bindings.test.sh` — inference-sh design/video/content + BA core packs must stay bound to their seats.  
**Wave-2 skill bindings:** `scripts/validate-wave2-skill-bindings.test.sh` — marketingskills leftovers + legal/CS/sales/data packs must stay bound to their seats.  
**Wave-3 skill bindings:** `scripts/validate-wave3-skill-bindings.test.sh` — Remotion/CAD/marketing leftovers + selective Figma/Vercel/superpowers/context-engineering; also gates artifact-class language in `packs/production-artifacts/`.  
**Standing-context pack:** `scripts/validate-standing-context-pack.test.sh` — imported configs/frameworks present, scrubbed of vendor brand locks, bound on marketing/sales seats.

**Degrade path:** Role-play in hierarchy order; still write handoff files; still run C-suite gate.

## Org Command Center (Jarvis Theater)

**Situation Room** UI — mission strip, C-suite board + standups, drill-down, live tasks, OmniVoice + LLM chat, optional Cursor SDK spawn:

```bash
cd tools/org-command-center && npm install
npm run voice:setup && npm run voice:up   # OmniVoice in tools/OmniVoice-Studio
npm run dev                               # http://localhost:5177
```

- **Assign** → `docs/projects/<active>/business-idea/DISPATCH/queue/`; **Spawn now** uses `CURSOR_API_KEY` + Cursor SDK (manager-only).
- **Briefings** → `docs/projects/<active>/business-idea/BRIEFINGS/<slug>-standup.md`
- OmniVoice vendored at `tools/OmniVoice-Studio/`

Spec: `docs/superpowers/specs/2026-07-16-org-command-center-design.md` · App README: `tools/org-command-center/README.md`

## Position count

36 seats — see `ORG-REGISTRY.md`. Example: `examples/phase-13-smoke.md`.
