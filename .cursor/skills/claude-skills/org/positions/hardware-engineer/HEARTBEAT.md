# HEARTBEAT — hardware-engineer

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm `hardware-engineer`, `report_to: cto`, `llm_tier: coding-agent`, `generation_profile: none`. Pin model.
2. **Packet** — Re-read goal, inputs, must_read, outputs, `write_lease`, constraints.
3. **Playbook** — Open `## Phase craft playbooks` → Phase 9B in `SKILL.md`.
4. **Leases** — Write only `09b-hardware-build.md` + `09b-hardware/`.
5. **CAD** — Model and export per PRD fab path (STEP/STL/DXF/G-code); document BOM in build log.
6. **Production** — Non-empty exports or honest `production_status: skipped` with reason.
7. **Handoff** — Write `HANDOFFS/9B-hardware-engineer.md` with production fields + model audit.
8. **Peers** — **Never spawn**. Do **not** mark phase ✅.
