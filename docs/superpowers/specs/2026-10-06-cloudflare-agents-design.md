# Cloudflare Agents — Design Specification

**Date:** 2026-10-06
**Product:** Strong Foam Operations Platform
**Status:** Specified and reviewed. Not built past the current stub.
**PRD requirements:** AI-008 through AI-027
**Primary surfaces:** Office jobs, opportunities, estimates, closeout, dispatch, plan takeoff, and a later warranty inbox

## Executive summary

Strong Foam uses one `StrongfoamAgent` class on the `strongfoam` Worker. Each
office or field record that needs a draft gets its own instance. Every model
call goes through AI Gateway `strongfoam`. D1 remains the system of record,
including for drafts.

The agent runs the model call and reports run status. D1 stores the draft,
its citations, and its outcome. A person confirms or dismisses. The command
that already writes that record is the only business write. The agent does not
set a price, send a customer message, rank a worker, or treat an inspection as
a score.

This covers the whole application. Public qualification, workforce
efficiency, and inspections stay deterministic. Commercial drafts, plan
takeoff, retrieval, cost explanation, and warranty triage use the same agent
when their source records exist.

Cloudflare Agents: https://developers.cloudflare.com/agents/

## Current code

| Piece | Where | Behavior today |
|---|---|---|
| Agent class | `src/lib/cloudflare/agent.ts` | `draft()` calls Workers AI and counts drafts in agent state |
| Worker entry | `cloudflare-worker.ts`, `wrangler.jsonc` `main` | Re-exports `StrongfoamAgent`. The 2026-10-06 deploy listed `env.STRONGFOAM_AGENT (StrongfoamAgent)` as a Durable Object binding |
| Gateway | `src/lib/cloudflare/gateway.ts` | Gateway id `strongfoam`. `completeWithWorkersAi` replaces any model that does not start with `@cf/` with Llama 3.3 |
| Job drafts | `src/lib/ops/ai-gateway.ts` | Calls `namespace.get(namespace.idFromName("strongfoam"))`, one name for every job, otherwise HTTP to the gateway |
| Commercial drafts | `src/lib/ops/commercial-ai.ts`, `store.ts` | AI-016 and AI-018 proposals already run. `ai_runs` stores the run with an idempotency key, `ai_proposals` stores the output as `proposed`, `dismissed`, or `applied`. The model call is HTTP and asks for JSON. `commercialAiGateReasons` gates it |
| Commercial records | `src/db/schema.ts` | `estimate_versions`, `estimate_lines`, `document_pages`, `document_chunks`, `price_book_items`, and `change_orders` exist |
| Plan geometry | `job_plan_annotations` | `x`, `y`, and polygon points are fractions of the page, from 0 to 1. Page size is not stored |

Two facts change the earlier draft of this spec:

- The “class not exported” message comes from the local platform proxy that
  `initOpenNextCloudflareForDev()` and the OpenNext cache step start. The
  published Worker bound the class. Whether a live draft reaches it still
  needs one live check, not a code change.
- AI-016 and AI-018 are partly built and already persist drafts in D1. The
  PRD table still marks them Blocked. That status needs to be corrected after
  an audit of what the opportunity page actually exposes.

## Goals

1. Prove one live draft reaches `StrongfoamAgent` on the deployed Worker.
2. Send job drafts and commercial drafts through that class, using `getAgentByName`.
3. Name each instance by organization and record.
4. Keep every draft in D1 with its run, citations, and outcome, so refresh, replay, and audit work.
5. Keep the requested model and JSON mode. Fail instead of silently changing models.
6. Measure plan quantities from a confirmed scale and a confirmed region. The server calculates the number.
7. Enforce per-organization model limits and keep the manual screen usable when the model is off or failing.

## Non-goals

- A second CRM, or a second draft store, in agent storage.
- A public chat on the marketing site.
- Code Mode, a sandbox, payments, or Slack.
- Generated price, markup, tax, or an approval decision.
- A stored quantity that the model invented.
- Measuring a sheet that has no confirmed scale.
- Full BIM, IFC, or Revit authoring.
- Changing efficiency, rank, or the quality label with a model.
- Scoring inspections.
- Posting invoices, bills, or payments.
- Sending a closeout packet or a change order to a customer.
- Storing prompts or chain-of-thought.

## Runtime

One Worker, `strongfoam`. The agent is a Durable Object from the Agents SDK
(`agents` 0.26). `nodejs_compat` is on. The class stays in
`new_sqlite_classes`.

Server code reaches an instance with `getAgentByName(env.STRONGFOAM_AGENT,
name)`, not a bare `get(idFromName())`. The Agents runtime expects the instance
name to be set through that call.

There is no public `/agents/...` route. Staff server actions call the agent.
A browser WebSocket waits until a later change checks the staff session before
`routeAgentRequest`.

Demo mode (`OPS_DEMO=1`) stays local and deterministic. It does not call the
agent or the gateway.

## Models

Every call goes through gateway id `strongfoam`.

- A Workers AI model (`@cf/...`) uses `env.AI.run(model, input, { gateway: { id } })`.
- Any other model id uses the gateway's provider route with `AI_GATEWAY_API_KEY`.
- JSON drafts request JSON output on both paths.
- The model id comes from `AI_GATEWAY_MODEL`, `AI_COMMERCIAL_MODEL`, or the takeoff vision model setting. If that id cannot be served, the run fails with `model-unavailable`. It is never replaced with another model.
- Plan takeoff needs a vision model. The current text model cannot read a sheet image.

The HTTP compat URL remains for tests and for a process without the Durable
Object binding.

## Instance identity

```text
org:{organizationId}:job:{jobId}
org:{organizationId}:opportunity:{opportunityId}
org:{organizationId}:estimate:{estimateId}
org:{organizationId}:project:{projectId}
```

`JobEvidencePack` does not carry the organization id. The server action takes
it from the signed-in session after loading the record. A caller cannot choose
another organization's name.

## Drafts

D1 is the draft record. `ai_runs` and `ai_proposals` already do this for
AI-016 and AI-018: idempotency key, content hash, cited source ids, model,
status, and the output the user saw. Every agent capability uses that pattern.

- `ai_runs.capability_id` is widened by migration from `AI-016`, `AI-018` to every shipped AI id.
- A job draft gets a record id beside the opportunity id, so job, opportunity, estimate, and project drafts share one table shape.
- Confirm marks the proposal `applied` in the same command that writes the business row. Dismiss marks it `dismissed`. Replay with the same idempotency key returns the first result.
- Agent state holds only what is in flight for that instance: run id, purpose, and `running`, `completed`, or `failed`. One instance can run a summary and a daily report without overwriting each other's draft.

A citation is kept only when its id is in the server-built pack. The pack is
the authorization boundary.

## Where the agent sits

| Surface | Instance | Person |
|---|---|---|
| Public site and estimate request | None | Qualification stays deterministic |
| Job summary, daily report, morning brief, pace, pick list, deficiencies by sheet | Job | Confirm or dismiss. The current command writes the note, pin, or task |
| Voice on the plan and schedule slip | Job | Accept writes only the pin or the dates already shown |
| Scope outline and bid lines (AI-016, AI-018) | Opportunity | Apply selected lines through the estimate-version command. Partly built |
| Revision explanation and change-order draft (AI-017, AI-019) | Estimate or project | A person sets the price and decides |
| Plan takeoff (AI-027) | Opportunity or job, per document version and page | Calibrate, confirm the region, and accept the calculated quantity |
| Closeout packet (AI-021) | Job | Save stores the narrative. Nothing is sent |
| Dispatch recommendation (AI-023) | Job | Accept assigns the open task. Capacity stays 1–3 |
| Workforce and quality | None | Efficiency and the quality label stay calculated |
| Inspections | None | Stay out of the score |
| Approved notes and transcripts (AI-022) | Read tool on the job instance | Retrieval only. Audio files are not indexed |
| Cost variance (AI-026) | Job, after accounting | Read the explanation. Accounting posts the money |
| Warranty email (AI-025) | Closed project, after a portal or mailbox | Create the warranty job, or discard the proposal |

## Plan takeoff

AI-016 and AI-018 cite a quantity only when it is written in the document.
AI-027 is the measurement path.

### Coordinates

Plan marks store fractions of the rendered page. A fraction has no physical
size. Each measured page must store its width and height in PDF points (or,
for an image, in pixels with a calibration). The server converts fractions
to page units before it measures.

### Scale

Two ways to set the scale, both confirmed by a person on one immutable
document version and page:

1. **Calibrate** (primary). The person picks two points on a known dimension and enters its real length. This works on images and on prints that were rescaled.
2. **Title block.** The agent reads a printed scale such as `1/4" = 1'-0"` and cites it. The person confirms or replaces it. `NTS`, a missing scale, or two conflicting scales stays **Takeoff required**.

### Region

The agent may propose one closed polygon, one polyline, or count points from a
page image. The person can move or delete points before confirming. A region
may subtract openings. Spray-foam wall area from a plan run is length times a
person-entered height. Roof slope is a person-entered factor.

### Quantity

The server calculates it from the confirmed scale and points. A polygon uses
the shoelace formula, less any openings, in square feet. A polyline sums
segment lengths, in linear feet. A count is the number of confirmed points.
A model field named quantity, bags, price, or total is rejected.

Bags are not measured. After square feet are confirmed, a person may enter
thickness or yield, and the server converts. Without that, bags stay empty.

### Record

A confirmed takeoff is stored in a new D1 table with the organization,
document version, page, page size, scale method and value, geometry, openings,
height or slope factor, calculated quantity and unit, model run id, and the
confirming user. The estimate line references that row, so BID-005 can cite
it. Confirming does not set the unit price. Dismissing writes nothing.

### Page image

Workers cannot rasterize a PDF with `pdfjs-dist` and `@napi-rs/canvas`. The
browser already renders the page. It uploads that page image to R2 at the
same resolution it shows, and the agent sends that image to the vision model.

### Accuracy

Before AI-027 is turned on, an evaluation set of Strong Foam plans with known
manual takeoffs records how far each proposed region is from the manual one.
The person-confirmed quantity is the one stored, so a wrong proposal costs
review time, not a wrong estimate.

## Limits, residency, and logging

- Section 24.8 requires per-organization usage limits. Agent instances are per record, so the limit lives in D1 or the gateway, not in agent state.
- AI Gateway logging can capture document and transcript text. Set its log retention before commercial documents go through it.
- Durable Object placement and gateway logs must satisfy open decision 10 on Canadian data residency before production use of bid documents.

## Sequence

1. Prove one live draft reaches the class, and name instances with `getAgentByName`.
2. Move job drafts onto the agent, with the D1 draft record and no silent model swap.
3. Move AI-016 and AI-018 onto the agent behind the existing commercial gate. Correct their PRD status.
4. Build AI-017 and AI-019. A person sets the price.
5. Build AI-027: deterministic measurement, calibration, page size, the takeoff table, then the vision proposal.
6. Index approved notes and transcripts in AI Search for AI-022.
7. After job costing and accounting, explain variance for AI-026.
8. After a portal or inbound mailbox, propose a warranty job for AI-025.

## Authorization and failure

- The server action checks the staff or field session before it loads the pack or names the instance.
- Field sessions only reach jobs that user can already open.
- A missing model, a missing binding in local demo, or a provider error returns the existing disabled or failed result. The page stays usable.
- Cross-organization packs return no content.
- Replaying confirm uses the D1 idempotency key. The business write happens once.
