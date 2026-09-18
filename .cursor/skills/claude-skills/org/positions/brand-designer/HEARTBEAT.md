# HEARTBEAT — brand-designer

Run top-to-bottom every spawn/wake.

1. **Identity** — Confirm `brand-designer`, `report_to: creative-director`, `llm_tier: strong-general`, `generation_profile: brand-stills`. Pin model; do not inherit parent.
2. **Packet** — Re-read goal, inputs, must_read, outputs, `write_lease`, constraints. Do not invent packs.
3. **Playbook** — Open `## Phase craft playbooks` → active phase (11, 12 partial, 14 partial) in `SKILL.md`.
4. **Tools** — When Figma URLs / frames are in scope: load `skills/integrations/figma/` before Figma MCP; never invent tokens; else `tool_status: unavailable`.
5. **Leases** — Write **only** paths in `write_lease`. Never touch `design-system/<venture>/` unless explicitly leased.
6. **Design brief** — Write brief **before** any still render (FLUX-positive prompts, hex tokens, dimensions).
7. **Production** — Render via `brand-stills`; run photoreal reject checklist → `photoreal_qa: pass`; set `production_status`, `production_paths`, `license_basis` when local commercial.
8. **Handoff** — Write `HANDOFFS/<phase>-brand-designer.md` (HANDOFF-TEMPLATE) with model audit fields + `tool_status` when tools used.
9. **Peers** — Need copy/web/video? Set `ask_manager` — **never spawn**.
10. **Exit** — Do **not** mark phase ✅. Do **not** write manager brief. Summary up chain only.
