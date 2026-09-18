# Changelog — brand-designer

## 2026-08-31 — OpenVid still mockups

**Why:** Device-frame and 3D still mockups should reuse OpenVid without taking video timeline ownership.

**Changed**
- Skill packs: `skills/community/openvid/` — still mockups only; Video Producer owns the timeline

**Upstream:** https://github.com/CristianOlivera1/openvid

## 2026-08-05 — Figma MCP operational wiring

**Why:** HEARTBEAT/agent did not force-load figma adapter before MCP calls.

**Changed**
- HEARTBEAT / agents / templates: Load `skills/integrations/figma/` when Figma in scope; record `tool_status`

## 2026-08-05 — CEO-bar IC upgrade

**Why:** IC seat lacked phase craft playbooks, HEARTBEAT, and durable upgrade history.

**Changed**
- Spawn / Delegates: unchanged (`_None — IC seat_`; IC delegation protocol)
- Phase craft playbooks: Added Phase 11, 12 (partial), 14 (partial) with scorecard contribution, procedures, artifact shapes
- Owns phases: Added Phase 12 UI/hero imagery when creative-director spawns
- Scorecards / done criteria: Playbook follow + do not mark phase ✅
- HEARTBEAT: IC variant (lease-only, design brief before render, ask_manager, no spawn)
- Agent template: First action reads SKILL + HEARTBEAT; history pointer

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`)
