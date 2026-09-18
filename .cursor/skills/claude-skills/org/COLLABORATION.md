# Collaboration & RACI

Peers do **not** spawn each other. Cross-seat work goes through the **immediate manager**, who leases write paths and sequences or parallelizes ICs.

## Operator brief (required on every handoff)

Write plain English **when you author the handoff**, not later. Required sections (see `HANDOFF-TEMPLATE.md` / manager / C-suite templates):

1. `## Operator brief (plain English)` — a **delta**: what this seat uniquely produced, one decision, whether work can continue. Do **not** restate the product one-liner or locked register rows. Do **not** re-ask a Locked `asked_as` id. At most one new Open question, and only if it is absent from `MEMORY/decisions.md`.
2. `## What we found`
3. `## Next steps` (blocking questions for the operator go here and in Asks)

Situation Room / Jarvis reads these at the source. Managers reject IC handoffs that omit them. Managers **reject echo**: same-phase operator briefs with Jaccard > 0.35 fail merge gate (`brief_echo`).

## Rules

1. IC needs a peer → `ask_manager` in handoff (never spawn peer).
2. Manager needs another desk (e.g. CMO needs Creative) → ask orchestrator/CEO to spawn that **manager**, or note `collaborates_with` in the manager brief.
3. Shared artifact → one write_lease owner at a time; others read-only until merge.
4. IC disagreement → manager decides; if still blocked → escalate to CEO with tag.

## Parallel IC leases (shared markdown)

When ORG-REGISTRY marks `(parallel: true)` and multiple ICs contribute to **one** phase `.md` (or one directory tree), the **manager** partitions `write_lease` before spawn. Do not give two ICs the same path.

| Pattern | How to partition | Examples |
|---------|------------------|----------|
| **Section slices** | Lease named H1/H2 sections of one file | Phase 7: enablement→Close; outbound→prospecting; CSM→Retain. Phase 8: ops→ops sections; legal→risk sections |
| **Path trees** | Lease disjoint directories | Phase 17: lifecycle→`email/html/`; brand→`email/assets/` (dual lease). Phase 12: web→`design-system/<venture>/`; brand→stills paths |
| **Artifact roles** | Lease by deliverable type | Phase 14: copy→page bodies; seo→meta; content→blog calendar; brand→imagery |
| **Sequential merge** | If slices collide, run serial: IC A → manager merge → IC B with updated lease | Prefer when section boundaries are unclear |

**Manager checklist before parallel spawn**
1. List each IC’s exact paths or section headings in the IC packet `write_lease`.
2. Confirm no path appears in two leases.
3. Tell ICs: write only leased slices; leave other headings as stubs or untouched.
4. You merge into the canonical phase artifact; resolve conflicts in the manager brief.
5. **Manager merge is an edit pass** — cut repetition and resolve conflicts; do not concatenate IC operator briefs. Point C-suite at the client artifact, not a pasted stack of IC memos.

ICs that need content outside their lease set `ask_manager` — they do not expand the lease themselves.

## Manager merge is an edit pass

The manager brief is an **editor cut**, not a concatenation of IC operator briefs. Cut echo, keep one decision, and point C-suite at the file a client would open. Jaccard echo vs IC briefs still applies (`brief_echo`).

## Phase 14 — Pages (RACI)

| Artifact | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Body copy | `copy-chief` | `cmo` | `product-marketing-manager` | `ceo-strategist` |
| On-page SEO / meta / schema | `seo-manager` | `cmo` | `copy-chief` | |
| Blog calendar drafts | `content-strategist` | `cmo` | `seo-manager` | |
| Page imagery | `brand-designer` | `creative-director` | `cmo` | |
| Phase merge + brief | `cmo` | `cmo` | `creative-director` | `ceo-strategist` |

`collaborates_with`: `cmo` ↔ `creative-director` (imagery + brand consistency).

## Phase 15 — Video (RACI)

| Artifact | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| OpenMontage production | `video-producer` | `creative-director` | `copy-chief` (script), `product-marketing-manager` | `cmo`, `ceo-strategist` |
| Channel strategy note | `video-producer` | `creative-director` | `cmo` | |
| Phase merge + brief | `creative-director` | `creative-director` | `cmo` | `ceo-strategist` |

## Phase 19 — Paid (RACI)

| Artifact | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Ad angles / funnel / stills | `paid-media-manager` | `cmo` | `copy-chief`, `brand-designer` | |
| Video ads | `video-producer` | `creative-director` | `paid-media-manager` | `cmo` |
| Budget overage | `paid-media-manager` | `cfo` (escalation) | `cmo` | `ceo-strategist` |
| Phase merge + brief | `cmo` | `cmo` | `creative-director` | `ceo-strategist` |

## Phase 17 — Channels / email (RACI)

| Artifact | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Email journey craft (MD) | `lifecycle-marketer` | `cmo` | `copy-chief`, `product-marketing-manager` | `ceo-strategist` |
| **HTML email templates** | `lifecycle-marketer` | `cmo` | `brand-designer` (headers) | `ops-manager` |
| Email header / brand assets | `brand-designer` | `creative-director` | `lifecycle-marketer` | `cmo` |
| Social calendar (MD) | `content-strategist` | `cmo` | `lifecycle-marketer` | |
| Social stills / creatives | `brand-designer` | `creative-director` | `content-strategist` | `cmo` |
| ESP / automation wiring | operator (Wire) | `cmo` | `lifecycle-marketer` | `coo` |
| Phase merge + brief | `cmo` | `cmo` | `creative-director` | `ceo-strategist` |

`collaborates_with`: `cmo` ↔ `creative-director` for email headers and social assets. Lifecycle/content **ask_manager** — do not spawn brand.

**Production pack:** All Phase 17 ICs and CMO read [`packs/production-artifacts/SKILL.md`](./packs/production-artifacts/SKILL.md). HTML under `17-channels/email/html/` (or `production_status: skipped` with reason).

**Dual IC lease:** When headers or social stills are in scope, manager packets must lease **both** lifecycle (`email/html/`) and brand (`email/assets/` and/or `social/assets/`). Do not mark Phase 17 production complete with HTML-only if assets were promised without a brand lease or honest skip.

**Verifier:** After CMO manager brief, orchestrator/CTO spawns `verifier`. Phase 17 C-suite approve requires `HANDOFFS/17-verifier.md` with `verdict: pass` (or verified honest skip).

## Production layer (all shippable phases)

See [`packs/production-artifacts/SKILL.md`](./packs/production-artifacts/SKILL.md) for Craft → Production → Wire, path leases, and handoff fields. Shippable: **9, 9B, 11, 12, 14, 15, 17, 18 (when app changes), 19**.

| Artifact | Responsible | Accountable |
|----------|-------------|-------------|
| Production verification (skeptical) | `verifier` | `cto` |

Shippable phases: manager brief → **verifier** → C-suite. `verdict: fail` blocks approve.

## Conflict protocol

1. Manager reads both IC handoffs.  
2. Picks a resolution; documents under “Conflicts resolved” in manager brief.  
3. If brand vs growth or spend vs plan → escalate per `ESCALATION.md`.  
4. Do not mark ready_for_csuite until conflicts are resolved or escalated.
