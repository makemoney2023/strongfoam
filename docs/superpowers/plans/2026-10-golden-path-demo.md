# Golden-path demo

> **For agentic workers:** Commit this plan before implementation. The demo is local only. Do not merge or deploy.

**Goal:** One Ontario spray-foam job can be walked on camera from inbound mail to closeout, with the same AI text every time, under `OPS_DEMO=1` and under `wrangler dev` without remote bindings.

**Architecture:** `OPS_DEMO=1` already forces the in-memory demo store and ignores D1. The golden warehouse is appended to that memory only when `DEMO_GOLDEN=1` and the seed guard allows it. A separate Node process cannot fill the running server, so `npm run demo:golden` checks the guard and prints the start command. Reset is a restart without `DEMO_GOLDEN`. AI fixtures return model-shaped JSON and then go through the existing grounders (`validateBidEstimateProposal`, `parseJobDraft`, `triageInbound`, `voiceDraftsFromModel`, `photoDraftsFromModel`, sentence keep for follow-up and digest). They turn on only when `DEMO_AI_FIXTURES=1`, or when `OPS_DEMO=1` and `DEMO_GOLDEN=1`, and a live gateway or Deepgram key is absent. Plain `OPS_DEMO=1` keeps today's short demo draft.

**Tech Stack:** Next.js 16, the existing demo store, Vitest. No new D1 migration. No Playwright dependency.

---

## Scenario

Riverside Logistics, Cambridge, Ontario. A 2,400 sq ft commercial warehouse retrofit: roof deck closed-cell, east wall, west bay. Stable ids start with `24000000-2400-4400-8400-` so they do not collide with `DEMO_JOB_ID`.

Walk order: inbound email, triage, opportunity, estimate with a cited bid draft, version diff (2,400 sq ft to 2,600 sq ft), proposal, accept, project and job, schedule, dispatch, field prefill, voice note to quoted drafts, photo with caption, lot and gauge, arrival labor, daily report, deficiency and quality, closeout photo log, photo report PDF, automation batch, morning digest.

## Guard

`assertDemoSeedAllowed` throws when `OPS_DEMO` is unset, when argv contains `--remote`, when `WRANGLER_REMOTE` or `CF_D1_REMOTE` is `1`, or when the caller marks the binding remote. The script never opens D1 and never runs `wrangler d1 execute`.

## What this leaves out

- Seeding production or local D1.
- Replacing `demoAiResult` for ordinary `OPS_DEMO=1`.
- A live model call when `AI_GATEWAY_API_KEY`, `DEEPGRAM_API_KEY`, or `DEMO_AI_LIVE=1` is set.
- Merge and deploy.

## Tasks

- [ ] Guard, fixtures, and tests that a bad citation, quote, area, or city is dropped.
- [ ] Append the warehouse to demo memory when `DEMO_GOLDEN=1` and the guard allows it. Show the inbound card and the automation drafts in demo mode.
- [ ] `npm run demo:golden` and `npm run demo:reset`.
- [ ] Generated PNG and WAV under `assets/demo/`.
- [ ] `docs/demo/golden-path.md` click script, and `scripts/demo/record.spec.ts` as step data with no Playwright import.
- [ ] Changelog and a short README note.
