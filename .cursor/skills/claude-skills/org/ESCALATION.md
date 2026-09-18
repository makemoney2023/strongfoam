# Escalation Matrix

Managers tag escalations in the manager brief. Orchestrator routes secondary C-suite reviewers before final CEO approve when tags are present.

| Tag | When | Secondary reviewer | Then |
|-----|------|--------------------|------|
| `legal` | Contracts, compliance, privacy, liability | `coo` (+ `legal-counsel` via COO) | CEO final |
| `brand` | Identity, visual system, off-brand creative | `creative-director` | CEO final |
| `spend` | Paid/OpenMontage/API cost over `budget_usd` | `cfo` | CEO final |
| `scope` | PRD change, new surface area | `head-of-product` | CEO final |
| `evidence` | Load-bearing claim lacks sources | `head-of-research` | CEO final |

## Protocol

1. Manager sets `recommendation: escalate` and lists tags.  
2. Orchestrator spawns secondary reviewer(s) with the manager brief + artifacts.  
3. Secondary writes comments into `HANDOFFS/<phase>-csuite-review.md` (or an addendum).  
4. `ceo-strategist` issues final `approve` | `revise` | `escalate` (rare double-escalation → user).  

## Budget envelope

Context packets for Phase **15** and **19** (OpenMontage / paid creatives) **must** set `budget_usd > 0` when rendering is expected, **or** the packet/handoff must commit to `production_status: skipped` with reason. If projected cost exceeds budget, IC/manager **must** escalate `spend` — do not silently proceed.
