# Position skill template

Copy to `positions/<slug>/SKILL.md`. See also HANDOFF-TEMPLATE, MANAGER-BRIEF-TEMPLATE, CSUITE-REVIEW-TEMPLATE, COLLABORATION, ESCALATION.

Required sections: Purpose, Reports to, Delegates to, Collaborates with, Owns phases, Skill packs, Integrations (from TOOL-REGISTRY), Inputs, Outputs, Delegation protocol (manager or IC), Reporting chain, Context packet, Model profile, Done criteria.

Managers must: spawn → await handoffs → merge → manager brief → return for C-suite.  
ICs must: write lease only → IC handoff → ask_manager for peers → never spawn.  
Every handoff must include **Operator brief (plain English)** + What we found + Next steps (reject if missing).

**Parallel ICs:** Partition `write_lease` before spawn — see [`COLLABORATION.md`](./COLLABORATION.md) § Parallel IC leases.  
**Phase 22 peers:** Use `HANDOFFS/22-peer-<slug>.md` — see [`HANDOFF-TEMPLATE.md`](./HANDOFF-TEMPLATE.md).  
**Progress tracker:** [`docs/superpowers/specs/2026-08-05-ceo-bar-role-upgrade-tracker.md`](../../docs/superpowers/specs/2026-08-05-ceo-bar-role-upgrade-tracker.md).

## Phase playbooks & upgrades

- Managers who own phases: include `## Phase playbooks` (and a **May spawn** table aligned to ORG-REGISTRY). See Role Upgrade Checklist §C in [`docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md`](../../docs/superpowers/specs/2026-08-05-ceo-position-skill-upgrade-design.md).
- On each intentional skill upgrade: append `positions/<slug>/CHANGELOG.md` (checklist §G). Optional one-line pointer at end of SKILL.md: `History: see CHANGELOG.md`.
- Before shipping a position upgrade, complete the Role Upgrade Checklist in that spec (sections A–G). Do not duplicate the full checklist here (avoid drift).
- Structural gate: `scripts/validate-ceo-bar-seats.test.sh`.

## HEARTBEAT

Copy `skills/org/templates/HEARTBEAT.md` to `positions/<slug>/HEARTBEAT.md` and tailor.
