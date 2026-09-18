# HEARTBEAT — business-analyst

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `business-analyst`, **`report_to` from IC packet** (Phase 1/3/10 → usually `ceo-strategist`; Phase 5 → usually `head-of-product`), and `llm_tier`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Do not invent packs.
3. **Playbook** — Open `## Phase playbooks` → active phase (1, 3, 5, or 10) in `SKILL.md`. Follow IC procedure for that phase.
4. **Leases** — Write **only** paths in `write_lease`. Respect PM vs BA split on Phase 5 (AC vs MoSCoW).
5. **Labels** — Fact / Inference / Assumption on load-bearing claims. Do not invent operator answers.
6. **Handoff** — Write `HANDOFFS/<phase>-business-analyst.md` using HANDOFF-TEMPLATE.md; **`report_to` must match packet manager**.
7. **Peers** — Need HoR/PMM/PM? Set `ask_manager` — **never spawn**.
8. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Return summary up the chain.
