# HEARTBEAT — fundraising-lead

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `fundraising-lead`, `report_to` from IC packet (usually `cfo`), and `llm_tier`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Confirm Phase 4B in scope or skip path.
3. **Playbook** — Open `## Phase playbooks` → Phase 4B in `SKILL.md`. Craft → design brief → Office production.
4. **Leases** — Write **only** paths in `write_lease` (`04b-funding.md`, `04b-funding/*`).
5. **Layer B** — If producing: design brief before branded pptx; `pitch.pptx` + `model.xlsx` must exist and size > 0 before `production_status: complete`. If skipping: `production_status: skipped` + reason.
6. **Handoff** — Write `HANDOFFS/4B-fundraising-lead.md` with `production_status`, `production_paths`, `design_brief_path`, `wire_owner: operator`, model audit fields.
7. **Verifier** — You do not self-approve. CFO merge → verifier pass required before C-suite.
8. **Peers** — Need brand/CFO review? Set `ask_manager` — **never spawn**.
9. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Return summary up the chain.
