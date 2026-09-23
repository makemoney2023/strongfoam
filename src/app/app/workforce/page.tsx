import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { getOpsSession } from "@/lib/ops/auth";
import { DISPATCH_TIME_ZONE, dispatchableJobStatus, parseWorkDate } from "@/lib/ops/dispatch";
import { formatLaborHours } from "@/lib/ops/labor";
import { formatJobNumber } from "@/lib/ops/jobs";
import { getOpsNow } from "@/lib/ops/ops-now";
import { loadWorkforceBoard } from "@/lib/ops/production-store";
import { listActiveFieldUsers, listJobs } from "@/lib/ops/store";
import { resolveWorkforceAccess } from "@/lib/ops/workforce-authorization";
import {
  formatEfficiency,
  formatProductionQuantity,
  formatTargetRate,
  workforcePerformanceEnabled,
  type WindowSummary,
} from "@/lib/ops/workforce-performance";
import {
  approveWorkforceTarget,
  recordWorkforceProduction,
  verifyWorkforceProduction,
  voidWorkforceProduction,
} from "./actions";

export const dynamic = "force-dynamic";

function hoursLabel(hours: number): string {
  return formatLaborHours(Math.round(hours * 60)) || "0 hours";
}

function efficiencyLabel(summary: WindowSummary): string {
  if (summary.efficiency == null) return "Not calculable";
  const sample = summary.eligibleForRank ? "Eligible sample, not ranked" : "Insufficient data";
  return `${formatEfficiency(summary.efficiency)} · ${sample}`;
}

export default async function WorkforcePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!workforcePerformanceEnabled()) redirect("/app");
  const access = resolveWorkforceAccess(session, "workforce.read");
  if (!access.ok) redirect("/app");
  const canVerify = resolveWorkforceAccess(session, "workforce.verify").ok;
  const params = await searchParams;
  const requested = parseWorkDate(params.date);
  const workDate = requested.ok
    ? requested.value
    : workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
  const [jobs, fieldUsers, board] = await Promise.all([
    listJobs(),
    listActiveFieldUsers(),
    loadWorkforceBoard(access.organizationId, workDate),
  ]);
  const openJobs = jobs
    .filter((job) => job.organizationId === access.organizationId && dispatchableJobStatus(job.status))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce"
        description="Verified production, hours, and comparable efficiency. Rankings and wages stay off."
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="workforceDate">Date</Label>
          <Input id="workforceDate" name="date" type="date" defaultValue={workDate} className="h-11" />
        </div>
        <Button type="submit" variant="outline" className="min-h-11">
          Show day
        </Button>
      </form>

      <section aria-labelledby="workforce-workers-heading" className="space-y-3">
        <h2 id="workforce-workers-heading" className="text-lg font-semibold">Workers</h2>
        <p className="text-sm text-muted-foreground">
          Twenty-eight day individual results. A worker needs three verified shifts and twelve hours before the sample is eligible, and no rank is assigned.
        </p>
        <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {board.workers.map((worker) => (
            <li key={worker.userId} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{worker.displayName}</p>
              <p>
                {efficiencyLabel(worker.twentyEightDay)} · {hoursLabel(worker.twentyEightDay.actualHours)} · {worker.twentyEightDay.shifts} {worker.twentyEightDay.shifts === 1 ? "shift" : "shifts"}
              </p>
              <p className="text-muted-foreground">Quality: not available · {worker.nextAction}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="workforce-crews-heading" className="space-y-3">
        <h2 id="workforce-crews-heading" className="text-lg font-semibold">Crew production</h2>
        {board.crews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No crew production in the last 28 days.</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {board.crews.map((crew) => (
              <li key={crew.productionId} className="px-4 py-3 text-sm">
                {crew.workDate} · {crew.jobName} · {crew.participantNames.join(", ") || "No participants"} · {formatProductionQuantity(crew.quantity, crew.unit)} · {crew.efficiency == null ? crew.reason : formatEfficiency(crew.efficiency)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="workforce-review-heading" className="space-y-3">
        <h2 id="workforce-review-heading" className="text-lg font-semibold">Awaiting review</h2>
        {board.drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No production is awaiting review.</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {board.drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {draft.participantNames.join(", ")} · {draft.jobName} · {formatProductionQuantity(draft.quantity, draft.unit)} · {draft.trade} · {draft.workType}
                </span>
                {canVerify ? (
                  <div className="flex gap-2">
                    <ActionForm action={verifyWorkforceProduction}>
                      <input type="hidden" name="workDate" value={workDate} />
                      <input type="hidden" name="productionId" value={draft.id} />
                      <SubmitButton pendingLabel="Verifying…" className="min-h-11">Verify</SubmitButton>
                    </ActionForm>
                    <ActionForm action={voidWorkforceProduction}>
                      <input type="hidden" name="workDate" value={workDate} />
                      <input type="hidden" name="productionId" value={draft.id} />
                      <SubmitButton variant="outline" pendingLabel="Voiding…" className="min-h-11">Void</SubmitButton>
                    </ActionForm>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canVerify ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Record production</CardTitle>
              <CardDescription>Installed quantity is counted once. A wage is not stored.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={recordWorkforceProduction} className="grid gap-4">
                <input type="hidden" name="workDate" value={workDate} />
                <div className="space-y-2">
                  <Label htmlFor="productionJob">Job</Label>
                  <NativeSelect id="productionJob" name="jobId" required className="h-11">
                    <option value="">Choose a job</option>
                    {openJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {formatJobNumber(job.id)} · {job.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Field members</legend>
                  {fieldUsers.map((user) => (
                    <label key={user.userId} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" name="participantUserId" value={user.userId} />
                      {user.displayName}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Attribution</legend>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="radio" name="attributionMode" value="individual" required />
                    Individual
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="radio" name="attributionMode" value="crew" />
                    Crew
                  </label>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="productionTrade">Trade</Label>
                    <Input id="productionTrade" name="trade" defaultValue="spray foam" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productionWorkType">Work type</Label>
                    <Input id="productionWorkType" name="workType" defaultValue="wall" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productionQuantity">Quantity</Label>
                    <Input id="productionQuantity" name="quantity" inputMode="numeric" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productionUnit">Unit</Label>
                    <NativeSelect id="productionUnit" name="unit" required className="h-11">
                      <option value="bags">Bags</option>
                      <option value="sq_ft">Square feet</option>
                    </NativeSelect>
                  </div>
                </div>
                <SubmitButton pendingLabel="Saving…" className="min-h-11">Save production</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Production target</CardTitle>
              <CardDescription>
                An approved rate such as {formatTargetRate(5000)} bags per person-hour. This is not a wage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={approveWorkforceTarget} className="grid gap-4">
                <input type="hidden" name="workDate" value={workDate} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="targetTrade">Trade</Label>
                    <Input id="targetTrade" name="trade" defaultValue="spray foam" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetWorkType">Work type</Label>
                    <Input id="targetWorkType" name="workType" defaultValue="wall" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetRate">Rate per hour</Label>
                    <Input id="targetRate" name="rate" inputMode="decimal" placeholder="5 or 8.5" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetUnit">Unit</Label>
                    <NativeSelect id="targetUnit" name="unit" className="h-11">
                      <option value="bags">Bags</option>
                      <option value="sq_ft">Square feet</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetBasis">Basis</Label>
                    <NativeSelect id="targetBasis" name="basis" className="h-11">
                      <option value="person_hour">Per person-hour</option>
                      <option value="crew_hour">Per crew-hour</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetEffective">Effective date</Label>
                    <Input id="targetEffective" name="effectiveFrom" type="date" defaultValue={workDate} className="h-11" required />
                  </div>
                </div>
                <SubmitButton pendingLabel="Approving…" className="min-h-11">Approve target</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
