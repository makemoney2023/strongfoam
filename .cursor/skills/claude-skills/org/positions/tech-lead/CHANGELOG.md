# Changelog — tech-lead

## 2026-08-31 — scroll-craft implement path

**Why:** Phase 12 can now emit a scrollcraft plan that must land in `apps/<venture>/` without forking the engine.

**Changed**
- Skill packs: `skills/community/scroll-craft/` (implement; theme tokens/fonts only)
- Skill packs: `openvid/.agents/skills/3d-web-experience/` for 3D web notes beyond img2threejs
- Phase 9: when `12-web-design.md` has a scrollcraft plan, mount the engine; never edit `engine/`

**Upstream:** https://github.com/nateherkai/scroll-craft

## 2026-08-10 — cinematic hero stack (R3F / Rapier)

**Why:** Interactive cinematic heroes (accordion physics, selective bloom, mobile tiers) must be a reusable Tech Lead path.

**Changed**
- Skill packs: `img2threejs/CINEMATIC-HERO-STACK.md` + Context7 integration pointer
- Phase 9 procedure: cinematic island mount when Phase 12 SSOT + packet requests it

**Spec:** `docs/superpowers/specs/2026-08-10-income-stack-cinematic-hero3d-design.md`

## 2026-08-10 — img2threejs consume path

**Why:** Phase 12 now emits procedural Three.js factories under design-system SSOT.

**Changed**
- Skill packs: Added `skills/community/img2threejs/` for consuming `design-system/<venture>/3d/` into WebGL islands

**Spec:** `docs/superpowers/specs/2026-08-10-img2threejs-org-wiring-design.md`

## 2026-08-05 — Context7 + Playwright operational wiring

**Why:** Context7 was primary and Playwright secondary in registry but Phase 9 playbook/HEARTBEAT did not mandate live docs or smoke.

**Changed**
- Integrations: `playwright-browser` promoted to **primary**
- Phase 9: Must-read + procedure require Context7 before library APIs and Playwright smoke for critical routes
- HEARTBEAT / agents / templates: Tool gates + `tool_status` on handoff

## 2026-08-05 — CEO-bar IC upgrade

**Why:** IC seat lacked phase craft playbooks, HEARTBEAT, and durable upgrade history.

**Changed**
- Spawn / Delegates: unchanged (`_None — IC seat_`)
- Phase craft playbooks: Added Phase 9 (TDD MVP) with PRD traceability and production fields
- Scorecards / done criteria: Playbook follow + TDD evidence in build log
- HEARTBEAT: IC variant (TDD, scope→HoP via ask_manager, no spawn verifier)
- Agent template: First action reads SKILL + HEARTBEAT; history pointer

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`)
