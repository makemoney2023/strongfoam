# Manager Brief Template

Copy to `docs/projects/<active>/business-idea/HANDOFFS/<phase>-manager-<mgr-slug>.md` after ICs return and before C-suite review.

```markdown
---
phase: "<id>"
manager: "<slug>"
ics_spawned: []
status: ready_for_csuite | blocked
recommendation: approve | revise | escalate
llm_tier: "<manager tier from MODEL-REGISTRY>"
llm_model: "<Cursor model ID actually used>"
generation_profile: none
fallback_applied: false
---

# Manager brief — <Title> — Phase <id>

## Operator brief (plain English)
Max **5 sentences** that are a **delta**: what this seat uniquely produced, one decision, whether work can continue.
Do **not** restate the product one-liner or locked register rows.
Do **not** re-ask a Locked id. At most one new Open question, and only if it is absent from MEMORY/decisions.md.
No runIds, no scorecard tables here. Write this at the source — Jarvis reads it directly. (Alias: `## In plain English`.)

## What we found
- Max **5 bullets**: load-bearing facts or labeled assumptions

## Next steps
1. Who acts next (operator / seat) and the concrete ask
2. …
3. Blocking questions the operator must answer (if any)

## Summary (5 bullets max)
- … (optional detail; prefer the three sections above for Jarvis / operators)

## IC handoffs merged
| IC | Handoff path | Status | llm_tier | generation_used |
|----|--------------|--------|----------|-----------------|
| `copy-chief` | `HANDOFFS/<phase>-copy-chief.md` | done | creative-language | none |

## Model routing check
- [ ] Every IC packet had `llm_tier`
- [ ] Creative ICs used correct `generation_profile` (or skip reason)
- [ ] Fallbacks recorded when Max Mode / plan blocked preferred model

## Conflicts resolved
- … | none

## Artifacts for C-suite review
| Path | Scorecard check |
|------|-----------------|
| `docs/projects/<active>/business-idea/…` | |

## Production check (shippable phases)
| Field | Value |
|-------|-------|
| production_status (merged) | complete / skipped / mixed |
| Layer B paths | … |
| wire_owner | operator / … |
| skip_reason | … \| none |

Reject IC handoffs missing `production_status` on phases 9, 9B, 11, 12, 14, 15, 17, 19. See `skills/org/packs/production-artifacts/SKILL.md`.

## Escalation tags
- none | legal | brand | spend | scope | evidence

## Asks for C-suite
- …

## Recommendation
**approve** — ship phase artifacts as-is  
**revise** — send back to ICs with comments below  
**escalate** — needs another C-suite seat (see tags)
```
