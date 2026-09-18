# HEARTBEAT — market-research-analyst

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm position `market-research-analyst`, `report_to` from IC packet (usually `head-of-research`), and `llm_tier`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, write_lease, constraints. Do not invent packs.
3. **Playbook** — Open `## Phase playbooks` → Phase 2 in `SKILL.md`. Follow IC procedure and scorecard slice.
4. **Leases** — Write **only** paths in `write_lease`. Do not write manager merge paths or competitor sections unless leased.
5. **Research** — Cite sources (URL, date). Use parallel-research / firecrawl per TOOL-REGISTRY; record `tool_status`.
6. **Handoff** — Write `HANDOFFS/<phase>-market-research-analyst.md` using HANDOFF-TEMPLATE.md with model audit fields.
7. **Peers** — Need CIA/seo-manager? Set `ask_manager` — **never spawn**.
8. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Return summary up the chain.
