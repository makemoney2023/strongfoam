# Changelog — verifier

## 2026-08-31 — OpenVid finals path

**Why:** Phase 15 / 19 can now land recorded demo exports next to OpenMontage film.

**Changed**
- Video QA: also accept `15-media/openvid/` and `19-paid/openvid/` (size > 0 or skip)

## 2026-08-05 — Playwright MCP operational wiring

**Why:** Verifier had no Integrations; Phase 9 live smoke was doctor/shell only.

**Changed**
- Integrations: Added `playwright-browser` secondary
- Phase 9 procedure / HEARTBEAT / agents: Spot-check 1–2 routes via Playwright when runnable MVP claimed; `tool_status` fallback
- TOOL-REGISTRY: verifier seat row added

## 2026-08-05 — CEO-bar IC upgrade

**Why:** Strong delegation protocol but missing HEARTBEAT, phase craft playbooks grouping, agent template, and changelog.

**Changed**
- Spawn / Delegates: unchanged (`_None — IC seat_`)
- Phase craft playbooks: Added verification playbooks by group (build, brand/design, pages/email, video, office, paid)
- Scorecards / done criteria: Playbook follow + verdict falsifiability
- HEARTBEAT: IC variant (skeptical verify-only, no craft, no spawn)
- Agent template: **Created** `templates/org/agents/verifier.md`

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`)
