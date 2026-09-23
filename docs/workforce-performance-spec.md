# Workforce performance specification and implementation plan

Status: specified, not built

PRD requirements: WFP-001 through WFP-018 in
`docs/strongfoam-crm-erp-prd.md`

## 1. Purpose

Give a field worker a private, useful view of their own production trend, and
give authorized office staff a comparable view of crew and worker performance.
The first release is an operational performance feature. It does not calculate
payroll, expose individual wages, or replace the future financial dashboard.

The feature should encourage complete, efficient, high-quality work. It must
not reward unverified volume, unsafe speed, excessive hours, incomplete
documentation, or work that later requires correction.

## 2. Product boundaries

### Included

- Verified production in bags or square feet.
- Labor duration and piece-work attribution.
- Crew-hours, production rate, earned hours, and normalized efficiency.
- Private field-worker trends and actionable daily widgets.
- Office crew and worker views with filters, sample size, and drill-down.
- Quality and documentation context when those source records exist.
- A future bridge from earned hours into restricted job-cost reporting.

### Excluded

- Individual wage, piece rate, bonus, payroll amount, or tax calculation.
- A public field-worker leaderboard.
- Automated discipline, termination, scheduling, compensation, or other
  employment decisions.
- Comparing unlike trades, units, roles, or work conditions as if they were
  equivalent.
- Treating an estimate, task remainder, field note, or self-entered piece count
  as verified production without an explicit production record and review
  state.

IMP-024 remains controlling: individual compensation requires a separately
restricted model.

## 3. Core definitions

**Production entry:** The authoritative quantity installed on one job and work
date, optionally scoped to a task and work area. It has one unit, a crew or
individual attribution mode, and a draft, verified, or void state.

**Labor entry:** The operational fact already defined by LAB-001 through
LAB-007: a person's hours or piece count on a job and date. It contains no rate
or pay.

**Piece allocation:** A link that credits some or all of a verified production
entry to a person. Allocations across people must not exceed the production
entry's quantity.

**Crew-hours:** The sum of linked participant minutes divided by 60. A person's
hours must be counted once even if the production entry has multiple piece
allocations.

**Production target:** An approved, effective-dated expected rate for a
comparable work class, expressed as bags or square feet per crew-hour or
person-hour.

**Comparable work class:** Organization, trade, unit, work type or assembly,
target basis, and any approved condition that materially changes expected
production. The first implementation must not invent missing classifications.

**Earned hours:** Verified quantity divided by the matching target rate.

**Efficiency index:** Earned hours divided by actual comparable hours,
multiplied by 100. An index of 100 means actual production matched the approved
target for that work class.

## 4. Source-of-truth and attribution rules

1. A production quantity is counted once. Existing quantity field notes may
   create or link to a production entry, but analytics must not sum both.
2. A stated task quantity is planned or remaining work. It is not installed
   production.
3. A labor piece count records operational piece-work credit. It is not
   automatically authoritative installed output.
4. Existing piece-work labor records remain valid operational records. They
   are excluded from efficiency rankings until linked to verified production
   or explicitly reviewed and converted.
5. Crew production without individual allocations produces a crew score only.
   It must not be copied in full to every participant.
6. Individual efficiency requires an individual production allocation and
   linked hours on the same comparable work.
7. A person may not verify a production entry or allocation that affects their
   own individual score.
8. Corrections create audited before-and-after evidence. Voiding preserves the
   original record.

## 5. Proposed data model

### `production_entries`

- `id`, `organization_id`, `job_id`, `work_date`
- Optional `task_id` and `work_area_id`
- `trade`, `work_type`
- `unit`: `bags` or `sq_ft`
- `quantity`: positive whole number
- `attribution_mode`: `crew` or `individual`
- `status`: `draft`, `verified`, or `void`
- `recorded_by`, `verified_by`, `verified_at`
- `source_type` and optional `source_id`
- `created_at`, `updated_at`, and optimistic `version`

### `production_participants`

- `production_entry_id`, `user_id`
- Links the participating workers and their eligible labor entries.
- A linked labor minute may contribute to only one production entry for the
  same work interval or approved allocation window.

### `production_allocations`

- `production_entry_id`, `user_id`, `quantity`
- Optional for crew-only reporting; required for individual efficiency.
- The sum of active allocations cannot exceed verified production.

### `production_targets`

- `organization_id`, `trade`, `work_type`, `unit`, and `basis`
- `target_rate`
- `effective_from`, optional `effective_to`
- `status`, `approved_by`, `approved_at`
- Audit evidence for every revision.

Approved target revisions are immutable. A replacement receives a new
effective range.

### Derived performance

Performance rows are derived, not manually editable. A cache or snapshot may
be added only when needed, and must retain:

- Formula version.
- Target revision.
- Included production, allocation, and labor IDs.
- Calculated-at timestamp.

This evidence prevents a target edit from silently rewriting historical
performance.

## 6. Calculations and eligibility

For one comparable segment:

```text
actual_hours = linked_minutes / 60
actual_rate = verified_quantity / actual_hours
earned_hours = verified_quantity / target_rate
efficiency_index = earned_hours / actual_hours * 100
```

The service returns `not_calculable` with a reason when production is
unverified, hours are zero or missing, the unit does not match, no approved
target applies, attribution is incomplete, or records overlap.

Roll-ups use total earned hours divided by total actual hours. They must not
average percentages, mix bags with square feet, or combine incomparable work
classes before normalization.

Ranked office results require a configurable minimum sample. The proposed
initial policy is at least three verified comparable shifts and at least twelve
actual hours. Rows below the threshold remain visible as “insufficient data”
and are not assigned a rank.

Quality, safety, and documentation are shown as separate dimensions. They are
never hidden deductions inside the efficiency formula:

- Open or reopened deficiencies.
- Rework or voided production when those records exist.
- Required inspection result when inspections exist.
- Required daily documentation completion.
- Safety events only after a separately authorized source and policy exist.

If a quality source does not exist yet, the UI says “not available”; it does
not assume a passing result.

## 7. Field experience: My Performance

Only the signed-in worker sees their individual view. The initial widgets are:

- Today's verified production and hours.
- Current pace against the applicable target.
- Seven-day and 28-day efficiency trend.
- Piece-work quantities by job and unit.
- Comparable shifts included in the result.
- Documentation complete or missing.
- Quality exceptions when the source records exist.
- Recent personal bests for the same comparable work class.
- A factual next action such as “record hours,” “production awaiting review,”
  or “two verified bags from today's target.”

The field application does not show wages, coworker rankings, or a company-wide
leaderboard. It must not celebrate overtime, skipped breaks, or unverified
quantity.

## 8. Office experience: Workforce Performance

The office receives a dedicated Workforce Performance route, not a financial
card mixed into the general Home summary.

### List columns

- Worker or crew.
- Role and primary trade.
- Verified production by unit.
- Actual hours.
- Actual production rate.
- Efficiency index.
- Seven-day and 28-day trend.
- Quality and documentation context.
- Comparable shift and hour sample.
- Last active date.

### Filters

- Date range.
- Worker or crew.
- Trade and work type.
- Bags or square feet.
- Job and customer.
- Role.
- Data eligibility and review state.

Every result links to the production, labor, target revision, job, and
exceptions that produced it.

### Home exceptions

Home shows actionable exceptions rather than a leaderboard:

- Missing labor for verified production.
- Missing production for a completed or dispatched shift.
- Production awaiting review.
- Repeated below-target comparable shifts.
- High efficiency accompanied by quality exceptions.
- Overlapping labor or over-allocated production.

## 9. Financial bridge

Workforce efficiency becomes an input to the financial dashboard only after
the accounting system of record and synchronization boundary in open decision
6 are approved.

The future restricted financial view may add:

- Earned hours versus actual hours.
- Standard labor cost versus accounting actual.
- Labor cost per bag or square foot.
- Estimate-to-actual labor variance.
- Gross margin by job, trade, and crew.

Standard cost and accounting actuals must be permission-restricted. Individual
wages never appear in My Performance or the general operations view.

## 10. Authorization

- Field worker: own performance and own underlying authorized records.
- Field lead: own performance; assigned crew results only if the permission
  policy grants it.
- Office or administrator: organization workforce and crew performance.
- Accounting: restricted cost extensions in addition to operational results.
- Executive or manager: organization roll-ups subject to the same cost
  permissions.

Authorization is enforced in queries and commands, not only by hiding UI.
Exports use the same permissions.

## 11. Implementation sequence

### Slice 1: policy and data contract

- Approve attribution modes, verifier roles, target ownership, minimum sample,
  comparison groups, and correction policy.
- Add production permissions and domain types.
- Add migrations for production entries, participants, allocations, and
  effective-dated targets.
- Keep all performance widgets off behind an organization feature flag.

### Slice 2: capture and verification

- Add one mobile production form for job, task or area, quantity, and unit.
- Let authorized reviewers verify, correct, or void production.
- Link existing quantity notes rather than duplicating quantities.
- Link labor hours and piece allocations.
- Show unverified legacy piece counts without ranking them.

### Slice 3: calculation service

- Implement deterministic segment and roll-up calculations.
- Return eligibility and exclusion reasons.
- Add overlap, over-allocation, target-version, mixed-unit, and boundary tests.
- Add audit events and calculation evidence.

### Slice 4: My Performance

- Add private daily widgets and seven-day and 28-day trends.
- Add drill-down to the worker's authorized labor and production.
- Add missing-record and pending-review prompts.
- Verify the complete flow on a phone-width field viewport.

### Slice 5: Workforce Performance

- Add the office list, filters, crew view, sample thresholds, and drill-down.
- Add Home exception widgets.
- Add CSV export only after export permissions and audit are tested.

### Slice 6: quality and financial extensions

- Add inspection, deficiency, rework, and documentation context as those
  authoritative records ship.
- After accounting decision 6, add earned-hour and cost variance to the
  restricted financial dashboard.
- Do not add wages to the operational model.

### Slice 7: controlled rollout

- Run in shadow mode with rankings hidden.
- Compare calculated shifts with supervisor-reviewed records.
- Correct attribution or target problems before workers see scores.
- Enable My Performance first, then office rankings after policy sign-off.
- Review metric gaming, quality regressions, and worker feedback.

## 12. Acceptance gates

- No quantity is counted twice across production, notes, and piece allocations.
- Crew output without individual allocation cannot produce individual scores.
- Results with missing targets, hours, verification, or sufficient samples are
  clearly ineligible.
- A target revision does not silently rewrite historical evidence.
- Workers cannot read another worker's individual view.
- Office rows drill into every contributing fact and exclusion.
- Quality unavailable is distinct from quality passed.
- No operational response contains a wage, piece rate, payroll amount, or
  inferred compensation.
- No automated employment action is triggered by a performance metric.
- Audit tests cover record, verify, correct, void, target approval, export, and
  feature-flag changes.
