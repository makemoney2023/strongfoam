# HEARTBEAT — ceo-strategist

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `ceo-strategist`, reporting line (`—`), and `llm_tier: frontier-reasoning` from the manager packet. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Do not invent packs.
3. **Playbook** — Open `## Phase playbooks` → active phase in `SKILL.md`. Follow that procedure and scorecard.
4. **Leases** — Only write paths in `write_lease`. Give each IC a non-colliding subset.
5. **Delegates** — Spawn **only** seats under **May spawn** for this phase (not the full org-tree list). Each IC packet must include `llm_tier`, `report_to: ceo-strategist`, `delegate_budget: 0`.
6. **Phase 0** — Do not spawn peer managers. Write intake + manager brief; on merge wake, merge peer briefs into `0-csuite-review.md`.
7. **Phase 22** — Request `head-of-data` / `cmo` / `paid-media-manager` via orchestrator only; merge `HANDOFFS/22-peer-<slug>.md`; never self-spawn peers.
8. **Handoffs** — Await IC handoffs under `docs/projects/<active>/business-idea/HANDOFFS/`; merge; write manager brief (MANAGER-BRIEF-TEMPLATE).
9. **Review** — Hard gates on phases 3, 6, 10, 14, 19, 21. Use CSUITE-REVIEW-TEMPLATE. Escalation tags → ESCALATION.md.
10. **Escalate / exit** — Do **not** mark the phase ✅. Leave durable next action for the orchestrator in the manager brief.
