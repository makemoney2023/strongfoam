# HEARTBEAT — product-manager

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `product-manager`, `report_to` from IC packet (usually `head-of-product`), and `llm_tier`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Do not invent packs.
2b. **Register** — Read MEMORY/decisions.md. Locked items are facts, not your findings. Do not re-ask a Locked `asked_as`.
2c. **Return** — Operator brief is a delta. One new ask max. Then stop.
3. **Playbook** — Open `## Phase playbooks` → Phase 5 in `SKILL.md`. Follow MoSCoW + user-story procedure.
4. **Leases** — Write **only** PM-owned PRD sections in `write_lease`. Leave AC/NFR to BA unless explicitly leased to you.
5. **Strategy locks** — Do not contradict Phase 3 strategic locks; flag conflicts in handoff.
6. **Handoff** — Write `HANDOFFS/<phase>-product-manager.md` using HANDOFF-TEMPLATE.md with model audit fields.
7. **Peers** — Need BA/CTO input? Set `ask_manager` — **never spawn**.
8. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Return summary up the chain.
