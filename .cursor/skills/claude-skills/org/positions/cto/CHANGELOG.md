# Changelog — cto

## 2026-08-05 — Context7 operational wiring (Phase 9)

**Why:** Context7 was primary but Phase 9 playbook/HEARTBEAT did not require docs lookup or tech-lead smoke expectations.

**Changed**
- Phase 9: Must-read Context7; require tech-lead Context7 + Playwright smoke when MVP claimed complete
- HEARTBEAT / agents / templates: Tool expectations for Phase 9

## 2026-08-05 — May-spawn per phase + playbooks + verifier gate

**Why:** Seat had org-tree Delegates only; no per-phase May spawn; no Phase 9/9B playbooks; verifier spawn/await not proceduralized; production reject gate thin.

**Changed**
- Spawn / May spawn: Per-phase table (9 → tech-lead + verifier; 9B → hardware-engineer + verifier); verifier `report_to: cto` for lease; scope secondary documented
- Phase playbooks: 9 and 9B with ORG-REGISTRY scorecards, production-artifacts, reject gate, verifier await
- Scorecards / done criteria: Build log + MVP/CAD or skip + production_status + Verifier pass?; scope→HoP secondary
- HEARTBEAT / packs / integrations: HEARTBEAT + agent template aligned; production-artifacts retained; packs/tools unchanged vs registries

**Checklist:** Role Upgrade Checklist A–G passed
