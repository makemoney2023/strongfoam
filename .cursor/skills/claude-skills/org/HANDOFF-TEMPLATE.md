# IC Handoff Template

Copy to `docs/projects/<active>/business-idea/HANDOFFS/<phase>-<slug>.md` before returning to your manager.

## Merge gate (managers / orchestrator — hard)

**Reject or send back for revision** if any of the following fail on creative, eng, CRO, brand, web, lifecycle, or paid handoffs:

1. YAML frontmatter includes `status` and `verdict_for_manager`.
2. **Operator brief** sections present near the top: `Operator brief (plain English)`, `What we found`, `Next steps` (non-technical; no runIds / path laundry lists in the brief).
3. **Packs used** is a table (or bullets) with **repo-relative pack paths**.
4. Every listed pack has **one concrete decision** tied to it (not just a name-drop).
5. `write_lease` artifact table is present (paths actually written).
6. Risks / blockers and Do-not sections present.
7. Handoff is not a ≤20-line stub when the phase changed user-visible craft.
8. On shippable phases (**4B, 9, 9B, 11, 12, 14, 15, 17, 19, 21**): `production_status` set; if `complete`, `production_paths` lists real Layer B files (see `packs/production-artifacts`, including Office `.docx`/`.pptx`/`.xlsx`).
9. When Layer B includes designed visuals/HTML: **Design brief** exists (`design_brief_path`) citing required design packs (e.g. `email-design` before email HTML/headers). Reject “craft → pixels” with no brief.
10. Operator brief Jaccard vs any other same-phase handoff is ≤ 0.35 (OCC: `brief_echo`).
11. Next steps / Asks do not contain Locked `asked_as` tokens (OCC: `reask:<id>`).
12. Packs used ⊆ position SKILL.md Skill packs table (+ handoff templates).
13. Quality scorecard: when `ARTIFACT-QUALITY.md` has a row for this phase, the leased artifact contains every listed heading (`quality_fail:<id>`; missing file = `quality_scorecard`).
14. Pack procedure: every used pack that appears in `PACK-PROCEDURES.md` has those required headings in leased artifacts (`pack_procedure:<slug>`).
15. Design before build + client path: Phase 9 (and design-led Layer B) has a Design brief or Locked waiver (`design_before_build`). Inbox `artifact_path` is the file a client would open — not this handoff (`inbox_not_artifact`).
16. Reference + model: Open register items whose `blocks_seats` include this seat are not marked done (`reference_blocked:<id>`). `llm_tier` matches MODEL-REGISTRY; `fallback_applied` on creative/frontier is a fail (`model_tier`).

Exception: pure skip handoffs (e.g. Phase 15 skip) may be short if they only record the skip reason.

### Verifier handoff (shippable — blocking)

Copy to `HANDOFFS/<phase>-verifier.md`. C-suite must not approve until `verdict: pass`.

```yaml
---
phase: "<id>"
position: verifier
reports_to: cto
status: done
verdict: pass | fail
llm_tier: strong-general
llm_model: "<used>"
generation_profile: none
happy_path_status: pass | fail | skipped
happy_path_spec: "apps/<venture>/e2e/happy-path.spec.ts"
---
```

Include sections: **Passed**, **Failed / incomplete**, **Issues** (specific fixes).

```markdown
---
phase: "<id>"
position: "<slug>"
reports_to: "<manager-slug>"
status: done | blocked | needs_input
verdict_for_manager: ready_to_merge | needs_revision | escalate
llm_tier: "<from MODEL-REGISTRY>"
llm_model: "<Cursor model ID actually used>"
generation_profile: none | brand-stills | hero-video | ad-creative
generation_used: none | "<provider/model e.g. fal/veo-3.1>"
fallback_applied: false
# Optional — when the seat ran via Cursor SDK (OCC / script), for Agent.resume:
# sdk_runtime: local | cloud
# sdk_agent_id: "<agent-… or bc-…>"
# sdk_run_id: "<run id>"
# sdk_request_id: "<platform UUID>"
# Required on shippable phases (4B, 9, 9B, 11, 12, 14, 15, 17, 19, 21) — see packs/production-artifacts:
production_status: complete | skipped | blocked
production_paths: []
design_brief_path: ""   # required when production_status=complete for email/stills/video/paid/design-system
photoreal_qa: ""        # pass | draft (images); draft needs skip_reason cursor-draft|plane-b-missing|lab-only
generation_used: ""     # local/flux-2-dev | fal/flux-2-max | …
license_basis: ""       # bfl-self-hosted-commercial when local commercial Layer B
wire_owner: operator | none | "<seat-slug>"
wire_checklist_path: "" # required when wire_owner != none and complete
wire_notes: ""
skip_reason: ""
---

# Handoff — <Title> → <Manager>

## Operator brief (plain English)
Max **5 sentences** that are a **delta**: what this seat uniquely produced, one decision, whether work can continue.
Do **not** restate the product one-liner or locked register rows.
Do **not** re-ask a Locked id. At most one new Open question, and only if it is absent from MEMORY/decisions.md.
No runIds, no scorecard tables, no path laundry lists here. (Alias: `## In plain English`.)

## What we found
- Up to 5 load-bearing facts or labeled assumptions

## Next steps
1. Who acts next (operator / manager / peer) and the concrete ask
2. …
3. Blocking questions the operator must answer (if any)

## Goal (from context packet)
…

## Artifacts written (write_lease only)
| Path | Notes |
|------|-------|
| `docs/projects/<active>/business-idea/…` | |

## Model routing
| Field | Value |
|-------|-------|
| llm_tier | … |
| llm_model | … |
| generation_profile | … |
| generation_used | … |
| fallback_applied | yes/no — why if yes |

## Production (shippable phases — required)
| Field | Value |
|-------|-------|
| production_status | complete / skipped / blocked |
| production_paths | repo-relative Layer B paths (or none if skipped) |
| wire_owner | operator / seat / none |
| wire_notes | what remains after approve |
| skip_reason | required if skipped |

Read `skills/org/packs/production-artifacts/SKILL.md` before claiming complete.

## SDK correlation (optional)
| Field | Value |
|-------|-------|
| sdk_runtime | local / cloud / n/a |
| sdk_agent_id | … |
| sdk_run_id | … |
| sdk_request_id | … |

## Decisions
- …

## Asks for manager (`ask_manager`)
- Peer help needed: `<slug>` for `<why>` | none
- Clarification needed: … | none

## Risks / blockers
- …

## Packs used
| Pack | Decision tied to pack |
|------|------------------------|
| `skills/community/…` | One decision this pack caused |

## Do not
- Mark the phase complete
- Write outside write_lease
- Spawn other positions
- Inherit parent model when MODEL-REGISTRY pins a different tier (esp. creative/legal)
- Name-drop packs without a decision row
```

## Phase 22 peer briefs (operating loop)

When orchestrator dispatches you as an **on-demand peer** for Phase 22 (CEO owns the phase), do **not** use `<phase>-<slug>.md` as if you were the phase manager.

**Path convention:** `docs/projects/<active>/business-idea/HANDOFFS/22-peer-<slug>.md`

| Seat | Path |
|------|------|
| `head-of-data` | `HANDOFFS/22-peer-head-of-data.md` |
| `cmo` | `HANDOFFS/22-peer-cmo.md` |
| `paid-media-manager` | `HANDOFFS/22-peer-paid-media-manager.md` |

Frontmatter: `phase: "22"`, `position: "<slug>"`, `reports_to: ceo-strategist` (or packet `report_to`), peer mode — no IC spawn, no manager brief, do not edit `22-operating-cadence.md` unless leased. CEO merges peer bullets into the cadence entry + `HANDOFFS/22-manager-ceo-strategist.md`.

Weekly C-suite one-bullet standup (orchestrator) may be lighter than a full peer brief; still prefer this path when a seat is formally dispatched for Phase 22.
