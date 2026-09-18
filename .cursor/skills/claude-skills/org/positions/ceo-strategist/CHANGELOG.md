# Changelog — ceo-strategist

## 2026-08-05 — Phase 22 peer handoff paths

**Why:** Peer merge was generic; HoD/CMO/paid used `22-peer-<slug>.md` without CEO playbook listing those paths.

**Changed**
- Phase playbooks: Phase 22 artifacts table lists `22-peer-head-of-data`, `22-peer-cmo`, `22-peer-paid-media-manager`
- Handoffs: Pointer to HANDOFF-TEMPLATE Phase 22 peer convention

**Checklist:** Follow-up alignment with HANDOFF-TEMPLATE / orchestrator / CMO

## 2026-08-05 — Office Layer B (docx / pptx)

**Why:** CEO must ship shareable Word/PowerPoint when operators need production exec artifacts, not MD-only.

**Changed**
- Spawn / May spawn: unchanged
- Phase playbooks: Phase 21 requires `exec/21-executive-summary.docx` (or skip) + verifier; Phase 3/10 optional Office
- Scorecards / done criteria: production_status + Office existence; binds `production-artifacts`, `docx`, `pptx`
- HEARTBEAT / packs / integrations: packs added for Office Layer B

**Checklist:** Role Upgrade Checklist A–G for office deltas; see `docs/superpowers/specs/2026-08-05-office-layer-b-production-design.md`

## 2026-08-05 — Phase playbooks + May-spawn alignment

**Why:** CEO could not legally spawn registry ICs (BA/PMM/HoR), and owned phases lacked executable playbooks.

**Changed**
- Spawn / May spawn: Split org-tree **Delegates to** from phase **May spawn** matching ORG-REGISTRY (1→BA, 3→PMM+BA, 10→HoR+BA); Phase 22 peers via orchestrator only; Phase 0 peers remain Jarvis-spawned
- Phase playbooks: Added full playbooks for phases 0, 1, 3, 10, 21, 22 (goal, scorecard, procedure, artifact shapes, handoffs, done checks)
- Scorecards / done criteria: Echoed registry scorecards; falsifiable done criteria; hard-gate callouts for 3/10/21
- HEARTBEAT / packs / integrations: HEARTBEAT rewritten to template + May-spawn / Phase 0/22 rules; packs unchanged (paths verified)
- Cursor agent: `templates/org/agents/ceo-strategist.md` aligned to May spawn + playbooks; synced via `scripts/sync-org-agents.sh`

**Checklist:** Role Upgrade Checklist A–G passed (spec `docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`)
