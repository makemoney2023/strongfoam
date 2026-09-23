import {
  statedQuantityUnitLabel,
  type StatedQuantityUnit,
} from "@/lib/ops/quantity-pace";

export const WORKFORCE_MIN_SHIFTS = 3;
export const WORKFORCE_MIN_HOURS = 12;
export const WORKFORCE_WINDOWS = { seven: 7, twentyEight: 28 } as const;

export const PRODUCTION_STATUSES = ["draft", "verified", "void"] as const;
export const ATTRIBUTION_MODES = ["crew", "individual"] as const;
export const TARGET_BASES = ["crew_hour", "person_hour"] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];
export type AttributionMode = (typeof ATTRIBUTION_MODES)[number];
export type TargetBasis = (typeof TARGET_BASES)[number];

export type ProductionEntry = {
  id: string;
  organizationId: string;
  jobId: string;
  workDate: string;
  taskId: string | null;
  workAreaId: string | null;
  trade: string;
  workType: string;
  unit: StatedQuantityUnit;
  quantity: number;
  attributionMode: AttributionMode;
  status: ProductionStatus;
  recordedBy: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  sourceType: string | null;
  sourceId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductionParticipant = {
  id: string;
  productionEntryId: string;
  userId: string;
  laborEntryId: string | null;
};

export type ProductionAllocation = {
  id: string;
  productionEntryId: string;
  userId: string;
  quantity: number;
};

export type ProductionTarget = {
  id: string;
  organizationId: string;
  trade: string;
  workType: string;
  unit: StatedQuantityUnit;
  basis: TargetBasis;
  rateMilli: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  approvedBy: string;
  approvedAt: Date;
};

export type WorkforceLabor = {
  id: string;
  jobId: string;
  userId: string;
  workDate: string;
  kind: string;
  minutes: number | null;
};

export type WorkforcePerson = {
  userId: string;
  displayName: string;
  role: string;
};

export type WorkforceJob = { id: string; name: string };

export type WorkforceDispatch = {
  userId: string;
  jobId: string;
  workDate: string;
  status: string;
};

export type PerformanceSegment = {
  productionId: string;
  jobId: string;
  workDate: string;
  trade: string;
  workType: string;
  unit: StatedQuantityUnit;
  quantity: number;
  minutes: number;
  earnedHours: number;
  efficiency: number;
  targetId: string;
};

export type ExcludedPerformance = {
  productionId: string;
  jobId: string;
  workDate: string;
  reason: string;
};

export type WindowSummary = {
  segments: PerformanceSegment[];
  excluded: ExcludedPerformance[];
  actualHours: number;
  earnedHours: number;
  efficiency: number | null;
  shifts: number;
  eligibleForRank: boolean;
};

export type WorkerPerformance = {
  userId: string;
  displayName: string;
  role: string;
  today: WindowSummary;
  sevenDay: WindowSummary;
  twentyEightDay: WindowSummary;
  personalBests: Array<{
    label: string;
    efficiency: number;
    workDate: string;
  }>;
  nextAction: string;
  quality: "not available";
  ranked: false;
};

export type CrewPerformance = {
  productionId: string;
  jobId: string;
  jobName: string;
  workDate: string;
  label: string;
  participantNames: string[];
  quantity: number;
  unit: StatedQuantityUnit;
  actualHours: number;
  efficiency: number | null;
  reason: string | null;
};

export type WorkforceException = {
  kind:
    | "awaiting_review"
    | "missing_labor"
    | "missing_production"
    | "below_target"
    | "over_allocated"
    | "overlapping_labor";
  label: string;
  href: string;
};

export type ProductionDraft = {
  id: string;
  jobId: string;
  jobName: string;
  workDate: string;
  trade: string;
  workType: string;
  quantity: number;
  unit: StatedQuantityUnit;
  attributionMode: AttributionMode;
  participantNames: string[];
};

export type WorkforceBoard = {
  workers: WorkerPerformance[];
  crews: CrewPerformance[];
  drafts: ProductionDraft[];
  exceptions: WorkforceException[];
  ranked: false;
};

export function workforcePerformanceEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const flag = env.OPS_WORKFORCE_PERFORMANCE?.trim();
  if (flag === "0") return false;
  if (flag === "1") return true;
  return env.OPS_DEMO === "1";
}

export function shiftWorkDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function parseWorkClassLabel(
  value: string | undefined,
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const text = (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (text.length < 2 || text.length > 80) {
    return { ok: false, error: `Enter a ${label} between 2 and 80 characters.` };
  }
  return { ok: true, value: text };
}

export function parseAttributionMode(
  value: string | undefined,
): { ok: true; value: AttributionMode } | { ok: false; error: string } {
  if (value === "crew" || value === "individual") return { ok: true, value };
  return { ok: false, error: "Choose crew or individual production." };
}

export function parseTargetBasis(
  value: string | undefined,
): { ok: true; value: TargetBasis } | { ok: false; error: string } {
  if (value === "crew_hour" || value === "person_hour") return { ok: true, value };
  return { ok: false, error: "Choose a target basis." };
}

export function parseTargetRate(
  value: string | undefined,
): { ok: true; rateMilli: number } | { ok: false; error: string } {
  const text = value?.trim() ?? "";
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(text)) {
    return { ok: false, error: "Enter a target rate such as 12 or 8.5." };
  }
  const rateMilli = Math.round(Number(text) * 1000);
  if (rateMilli <= 0) {
    return { ok: false, error: "Enter a target rate greater than zero." };
  }
  return { ok: true, rateMilli };
}

export function formatTargetRate(rateMilli: number): string {
  const whole = Math.floor(rateMilli / 1000);
  const fraction = String(rateMilli % 1000).padStart(3, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function formatEfficiency(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatProductionQuantity(quantity: number, unit: StatedQuantityUnit): string {
  if (unit === "sq_ft") return `${quantity} sq ft`;
  return `${quantity} ${quantity === 1 ? "bag" : statedQuantityUnitLabel(unit)}`;
}

function dateInWindow(workDate: string, asOf: string, days: number): boolean {
  return workDate >= shiftWorkDate(asOf, -(days - 1)) && workDate <= asOf;
}

function workClassLabel(segment: Pick<PerformanceSegment, "trade" | "workType" | "unit">): string {
  return `${segment.trade} · ${segment.workType} · ${segment.unit === "sq_ft" ? "sq ft" : "bags"}`;
}

function summarize(segments: PerformanceSegment[], excluded: ExcludedPerformance[]): WindowSummary {
  const actualHours = segments.reduce((sum, segment) => sum + segment.minutes / 60, 0);
  const earnedHours = segments.reduce((sum, segment) => sum + segment.earnedHours, 0);
  return {
    segments,
    excluded,
    actualHours,
    earnedHours,
    efficiency: actualHours > 0 ? (earnedHours / actualHours) * 100 : null,
    shifts: segments.length,
    eligibleForRank: segments.length >= WORKFORCE_MIN_SHIFTS && actualHours >= WORKFORCE_MIN_HOURS,
  };
}

function targetFor(
  targets: ProductionTarget[],
  entry: ProductionEntry,
  basis: TargetBasis,
): ProductionTarget | null {
  const matches = targets
    .filter(
      (target) =>
        target.organizationId === entry.organizationId &&
        target.trade === entry.trade &&
        target.workType === entry.workType &&
        target.unit === entry.unit &&
        target.basis === basis &&
        target.effectiveFrom <= entry.workDate &&
        (target.effectiveTo == null || entry.workDate < target.effectiveTo),
    )
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom));
  return matches[0] ?? null;
}

function claimHours(
  entry: ProductionEntry,
  userIds: string[],
  labor: WorkforceLabor[],
  used: Set<string>,
): { ok: true; claims: Array<{ userId: string; laborId: string; minutes: number }> } | { ok: false; reason: string } {
  const claims: Array<{ userId: string; laborId: string; minutes: number }> = [];
  const localUsed = new Set(used);
  for (const userId of userIds) {
    const candidates = labor.filter(
      (row) =>
        row.kind === "hourly" &&
        row.userId === userId &&
        row.jobId === entry.jobId &&
        row.workDate === entry.workDate &&
        row.minutes != null &&
        row.minutes > 0,
    );
    const available = candidates.find((row) => !localUsed.has(row.id));
    if (!available?.minutes) {
      const reason = candidates.length
        ? "Those hours are already linked to other production."
        : "Hours are missing.";
      return { ok: false, reason };
    }
    localUsed.add(available.id);
    claims.push({ userId, laborId: available.id, minutes: available.minutes });
  }
  for (const claim of claims) used.add(claim.laborId);
  return { ok: true, claims };
}

function measure(
  entry: ProductionEntry,
  quantity: number,
  minutes: number,
  basis: TargetBasis,
  targets: ProductionTarget[],
): { ok: true; segment: PerformanceSegment } | { ok: false; reason: string } {
  if (minutes <= 0) return { ok: false, reason: "Hours are missing." };
  const target = targetFor(targets, entry, basis);
  if (!target) return { ok: false, reason: "No approved target applies." };
  const actualHours = minutes / 60;
  const earnedHours = quantity / (target.rateMilli / 1000);
  return {
    ok: true,
    segment: {
      productionId: entry.id,
      jobId: entry.jobId,
      workDate: entry.workDate,
      trade: entry.trade,
      workType: entry.workType,
      unit: entry.unit,
      quantity,
      minutes,
      earnedHours,
      efficiency: (earnedHours / actualHours) * 100,
      targetId: target.id,
    },
  };
}

function nextAction(input: {
  drafts: ProductionEntry[];
  today: WindowSummary;
  asOf: string;
  userId: string;
  participants: ProductionParticipant[];
}): string {
  const involved = input.drafts.some((entry) =>
    input.participants.some(
      (participant) => participant.productionEntryId === entry.id && participant.userId === input.userId,
    ),
  );
  if (involved) return "Production awaiting review.";
  if (input.today.excluded.some((row) => row.reason === "Hours are missing.")) {
    return "Record hours for today's production.";
  }
  const short = input.today.segments.find((segment) => segment.efficiency < 100);
  if (short) {
    const expected = short.quantity / (short.efficiency / 100);
    const gap = Math.max(1, Math.ceil(expected - short.quantity));
    const unit = short.unit === "sq_ft" ? "sq ft" : gap === 1 ? "bag" : "bags";
    return `${gap} ${unit} from today's target.`;
  }
  if (input.today.segments.length > 0) return "Today's verified production is on the target.";
  return "Record today's installed quantity.";
}

export function buildWorkforcePerformance(input: {
  asOf: string;
  entries: ProductionEntry[];
  participants: ProductionParticipant[];
  allocations: ProductionAllocation[];
  targets: ProductionTarget[];
  labor: WorkforceLabor[];
  people: WorkforcePerson[];
  jobs: WorkforceJob[];
  dispatches: WorkforceDispatch[];
}): WorkforceBoard {
  const used = new Set<string>();
  const individual = new Map<string, { segments: PerformanceSegment[]; excluded: ExcludedPerformance[] }>();
  const crews: CrewPerformance[] = [];
  const ordered = [...input.entries].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id),
  );
  const jobName = new Map(input.jobs.map((job) => [job.id, job.name]));
  const personName = new Map(input.people.map((person) => [person.userId, person.displayName]));

  for (const entry of ordered) {
    if (entry.status !== "verified") continue;
    const participants = input.participants.filter((row) => row.productionEntryId === entry.id);
    if (entry.attributionMode === "crew") {
      if (participants.length === 0) {
        crews.push({
          productionId: entry.id,
          jobId: entry.jobId,
          jobName: jobName.get(entry.jobId) ?? "Job",
          workDate: entry.workDate,
          label: `${entry.trade} · ${entry.workType}`,
          participantNames: [],
          quantity: entry.quantity,
          unit: entry.unit,
          actualHours: 0,
          efficiency: null,
          reason: "Hours are missing.",
        });
        continue;
      }
      const claimed = claimHours(entry, participants.map((row) => row.userId), input.labor, used);
      const measured = claimed.ok
        ? measure(
            entry,
            entry.quantity,
            claimed.claims.reduce((sum, claim) => sum + claim.minutes, 0),
            "crew_hour",
            input.targets,
          )
        : claimed;
      crews.push({
        productionId: entry.id,
        jobId: entry.jobId,
        jobName: jobName.get(entry.jobId) ?? "Job",
        workDate: entry.workDate,
        label: `${entry.trade} · ${entry.workType}`,
        participantNames: participants.map((row) => personName.get(row.userId) ?? "Field member"),
        quantity: entry.quantity,
        unit: entry.unit,
        actualHours: measured.ok ? measured.segment.minutes / 60 : 0,
        efficiency: measured.ok ? measured.segment.efficiency : null,
        reason: measured.ok ? null : measured.reason,
      });
      continue;
    }
    const allocations = input.allocations.filter((row) => row.productionEntryId === entry.id);
    const allocated = allocations.reduce((sum, row) => sum + row.quantity, 0);
    if (allocated > entry.quantity) {
      for (const allocation of allocations) {
        const bucket = individual.get(allocation.userId) ?? { segments: [], excluded: [] };
        bucket.excluded.push({
          productionId: entry.id,
          jobId: entry.jobId,
          workDate: entry.workDate,
          reason: "Allocations exceed installed production.",
        });
        individual.set(allocation.userId, bucket);
      }
      continue;
    }
    const claimed = claimHours(entry, allocations.map((row) => row.userId), input.labor, used);
    for (const allocation of allocations) {
      const bucket = individual.get(allocation.userId) ?? { segments: [], excluded: [] };
      if (!claimed.ok) {
        bucket.excluded.push({
          productionId: entry.id,
          jobId: entry.jobId,
          workDate: entry.workDate,
          reason: claimed.reason,
        });
      } else {
        const minutes = claimed.claims.find((claim) => claim.userId === allocation.userId)?.minutes ?? 0;
        const measured = measure(entry, allocation.quantity, minutes, "person_hour", input.targets);
        if (measured.ok) bucket.segments.push(measured.segment);
        else {
          bucket.excluded.push({
            productionId: entry.id,
            jobId: entry.jobId,
            workDate: entry.workDate,
            reason: measured.reason,
          });
        }
      }
      individual.set(allocation.userId, bucket);
    }
  }

  const drafts = input.entries.filter((entry) => entry.status === "draft");
  const workers = input.people
    .filter((person) => person.role === "field_lead" || person.role === "field_worker")
    .map((person) => {
      const bucket = individual.get(person.userId) ?? { segments: [], excluded: [] };
      const windowFor = (days: number) =>
        summarize(
          bucket.segments.filter((segment) => dateInWindow(segment.workDate, input.asOf, days)),
          bucket.excluded.filter((row) => dateInWindow(row.workDate, input.asOf, days)),
        );
      const twentyEightDay = windowFor(WORKFORCE_WINDOWS.twentyEight);
      const bestByClass = new Map<string, PerformanceSegment>();
      for (const segment of twentyEightDay.segments) {
        const key = workClassLabel(segment);
        const current = bestByClass.get(key);
        if (!current || segment.efficiency > current.efficiency) bestByClass.set(key, segment);
      }
      return {
        userId: person.userId,
        displayName: person.displayName,
        role: person.role,
        today: windowFor(1),
        sevenDay: windowFor(WORKFORCE_WINDOWS.seven),
        twentyEightDay,
        personalBests: [...bestByClass.entries()].map(([label, segment]) => ({
          label,
          efficiency: segment.efficiency,
          workDate: segment.workDate,
        })),
        nextAction: nextAction({
          drafts: drafts.filter((entry) => dateInWindow(entry.workDate, input.asOf, 1)),
          today: windowFor(1),
          asOf: input.asOf,
          userId: person.userId,
          participants: input.participants,
        }),
        quality: "not available" as const,
        ranked: false as const,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  const exceptions: WorkforceException[] = [];
  const href = `/app/workforce?date=${encodeURIComponent(input.asOf)}`;
  for (const entry of drafts) {
    if (entry.workDate !== input.asOf) continue;
    exceptions.push({
      kind: "awaiting_review",
      label: `Production awaiting review: ${jobName.get(entry.jobId) ?? "Job"}`,
      href,
    });
  }
  for (const entry of ordered) {
    if (entry.status !== "verified" || entry.workDate !== input.asOf) continue;
    const participants = input.participants.filter((row) => row.productionEntryId === entry.id);
    const missing = participants.some(
      (participant) =>
        !input.labor.some(
          (row) =>
            row.kind === "hourly" &&
            row.userId === participant.userId &&
            row.jobId === entry.jobId &&
            row.workDate === entry.workDate &&
            row.minutes != null &&
            row.minutes > 0,
        ),
    );
    if (missing) {
      exceptions.push({
        kind: "missing_labor",
        label: `Missing labor for verified production: ${jobName.get(entry.jobId) ?? "Job"}`,
        href,
      });
    }
    const allocated = input.allocations
      .filter((row) => row.productionEntryId === entry.id)
      .reduce((sum, row) => sum + row.quantity, 0);
    if (allocated > entry.quantity) {
      exceptions.push({
        kind: "over_allocated",
        label: `Production is over-allocated: ${jobName.get(entry.jobId) ?? "Job"}`,
        href,
      });
    }
  }
  for (const dispatch of input.dispatches) {
    if (dispatch.workDate !== input.asOf || dispatch.status !== "scheduled") continue;
    const covered = input.entries.some(
      (entry) =>
        entry.status !== "void" &&
        entry.jobId === dispatch.jobId &&
        entry.workDate === dispatch.workDate &&
        input.participants.some(
          (participant) =>
            participant.productionEntryId === entry.id && participant.userId === dispatch.userId,
        ),
    );
    if (!covered) {
      exceptions.push({
        kind: "missing_production",
        label: `Missing production for a dispatched shift: ${personName.get(dispatch.userId) ?? "Field member"} · ${jobName.get(dispatch.jobId) ?? "Job"}`,
        href,
      });
    }
  }
  for (const worker of workers) {
    const counts = new Map<string, number>();
    for (const segment of worker.twentyEightDay.segments) {
      if (segment.efficiency >= 100) continue;
      const key = workClassLabel(segment);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [label, count] of counts) {
      if (count < WORKFORCE_MIN_SHIFTS) continue;
      exceptions.push({
        kind: "below_target",
        label: `${worker.displayName} is below target on ${count} ${label} shifts`,
        href,
      });
    }
  }
  const laborUse = new Map<string, number>();
  for (const entry of ordered) {
    if (entry.status === "void") continue;
    for (const participant of input.participants.filter((row) => row.productionEntryId === entry.id)) {
      const matches = input.labor.filter(
        (row) =>
          row.kind === "hourly" &&
          row.userId === participant.userId &&
          row.jobId === entry.jobId &&
          row.workDate === entry.workDate,
      );
      for (const match of matches) laborUse.set(match.id, (laborUse.get(match.id) ?? 0) + 1);
    }
  }
  if ([...laborUse.values()].some((count) => count > 1)) {
    exceptions.push({
      kind: "overlapping_labor",
      label: "Labor hours are linked to more than one production entry.",
      href,
    });
  }

  return {
    workers,
    crews: crews.filter((crew) => dateInWindow(crew.workDate, input.asOf, WORKFORCE_WINDOWS.twentyEight)),
    drafts: drafts
      .filter((entry) => entry.workDate === input.asOf)
      .map((entry) => ({
        id: entry.id,
        jobId: entry.jobId,
        jobName: jobName.get(entry.jobId) ?? "Job",
        workDate: entry.workDate,
        trade: entry.trade,
        workType: entry.workType,
        quantity: entry.quantity,
        unit: entry.unit,
        attributionMode: entry.attributionMode,
        participantNames: input.participants
          .filter((participant) => participant.productionEntryId === entry.id)
          .map((participant) => personName.get(participant.userId) ?? "Field member"),
      })),
    exceptions,
    ranked: false,
  };
}
