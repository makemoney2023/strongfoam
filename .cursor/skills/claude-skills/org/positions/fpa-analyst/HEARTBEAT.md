# HEARTBEAT — fpa-analyst

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `fpa-analyst`, `report_to` from IC packet (usually `cfo`), and `llm_tier`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Do not invent packs.
3. **Playbook** — Open `## Phase playbooks` → Phase 4 in `SKILL.md`. Follow unit-economics procedure.
4. **Leases** — Write **only** quantitative sections in `write_lease`. Leave pricing posture to PMM unless leased to you.
5. **Assumptions** — Label every number Fact / Inference / Assumption. List operator blockers for firm figures.
6. **Handoff** — Write `HANDOFFS/<phase>-fpa-analyst.md` using HANDOFF-TEMPLATE.md with model audit fields.
7. **Peers** — Need PMM/stripe data? Set `ask_manager` — **never spawn**.
8. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Return summary up the chain.
