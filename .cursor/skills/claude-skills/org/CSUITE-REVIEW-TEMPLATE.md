# C-Suite Review Template

Copy to `docs/projects/<active>/business-idea/HANDOFFS/<phase>-csuite-review.md`. Orchestrator must not mark the phase ✅ until `verdict: approve` (Phase 0 may use `skip-review` with reason).

Reviewer always uses **`frontier-reasoning`** (`grok-4.5` per MODEL-REGISTRY).

```markdown
---
phase: "<id>"
reviewer: "ceo-strategist"
secondary_reviewers: []
verdict: approve | revise | escalate | skip-review
date: YYYY-MM-DD
llm_tier: frontier-reasoning
llm_model: "<Cursor model ID actually used>"
fallback_applied: false
---

# C-suite review — Phase <id>

## Operator brief (plain English)
3–5 sentences that are a **delta**: the verdict in human terms, one decision, whether work can continue.
Do **not** restate the product one-liner or locked register rows.
Do **not** re-ask a Locked id. At most one new Open question, and only if it is absent from MEMORY/decisions.md.
No runIds or dense tables here. Write this at the source — Jarvis reads it directly. (Alias: `## In plain English`.)

## What we found
- Up to 5 load-bearing agreements or tensions (plain language)

## New risk or disagreement
- One risk or disagreement that is **not** a rewrite of the manager brief. Required. “None” fails acceptance.

## Next steps
1. Who acts next (operator / orchestrator / seat) and the concrete ask
2. …
3. Blocking questions for the operator (if any)

## Inputs reviewed
- Manager brief: `HANDOFFS/<phase>-manager-<slug>.md`
- Key artifacts: …

## Scorecard (from ORG-REGISTRY)
| Criterion | Pass? | Notes |
|-----------|-------|-------|
| … | yes/no | |
| Correct model tier used? | yes/no | Wrong tier/profile on creative/legal → revise |
| Generation profile correct (11/12/15/19)? | yes/no/n/a | e.g. hero-video → Veo 3.1 |
| Production Layer B complete or skipped with reason? | yes/no/n/a | HTML/app/assets/finals — see production-artifacts pack |
| Verifier pass? | yes/no/n/a | `HANDOFFS/<phase>-verifier.md` with `verdict: pass` (required on shippable) |
| Wire owner named? | yes/no/n/a | ESP / ads / DNS may stay operator |
| Artifact quality? | yes/no/n/a | `ARTIFACT-QUALITY.md` headings; fail = `quality_fail:<id>` or `quality_scorecard` |
| Pack procedure? | yes/no/n/a | `PACK-PROCEDURES.md`; fail = `pack_procedure:<slug>` |
| Client artifact path? | yes/no/n/a | Inbox `artifact_path` is the file a client would open — not the handoff (`inbox_not_artifact`) |
| Model tier? | yes/no | Registry pin; fallback on creative/frontier = `model_tier` |

## Verdict
**approve** — orchestrator may mark phase ✅  
**revise** — comments for manager (do not advance)  
**escalate** — pull in listed secondary reviewers, then re-review  
**skip-review** — only Phase 0 or explicit user waiver; reason required

## Comments for manager
- …

## Redlines
Required when `verdict: revise`. Paths the manager may rewrite — do not restart the phase. Empty table still means revise: ask the orchestrator for section comments.

| path | comment |
|------|---------|
| … | … |

## Decisions to log in RUNBOOK-TRACKER
- …
```
