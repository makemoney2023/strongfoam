# Changelog — hardware-engineer

## 2026-08-05 — CEO-bar IC upgrade

**Why:** IC seat lacked phase craft playbooks, HEARTBEAT, and durable upgrade history.

**Changed**
- Spawn / Delegates: unchanged (`_None — IC seat_`)
- Phase craft playbooks: Added Phase 9B (CAD/fab) with export verification steps
- Scorecards / done criteria: Playbook follow + non-empty exports or skip
- HEARTBEAT: IC variant (lease-only, no spawn)
- Agent template: First action reads SKILL + HEARTBEAT; history pointer

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`)
