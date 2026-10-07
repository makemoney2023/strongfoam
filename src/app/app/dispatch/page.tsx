import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { getOpsSession } from "@/lib/ops/auth";
import {
  buildDispatchDay,
  DISPATCH_TIME_ZONE,
  dispatchableJobStatus,
  parseWorkDate,
} from "@/lib/ops/dispatch";
import { resolveDispatchAccess } from "@/lib/ops/dispatch-authorization";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { formatJobNumber } from "@/lib/ops/jobs";
import { formatLaborEntry } from "@/lib/ops/labor";
import { resolveLaborAccess } from "@/lib/ops/labor-authorization";
import { listLabor } from "@/lib/ops/labor-store";
import { getOpsNow } from "@/lib/ops/ops-now";
import { listActiveFieldUsers, listJobs, listUsers } from "@/lib/ops/store";
import { saveCrewCapacity } from "./capacity-actions";
import { listCrewCapacities } from "@/lib/ops/crew-capacity-store";
import { cancelDayDispatch, scheduleDayDispatch } from "./actions";
import { recordDayLabor, removeDayLabor } from "./labor-actions";

export const dynamic = "force-dynamic";

function formatWorkDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveDispatchAccess(session, "dispatch.read");
  if (!access.ok) redirect("/app");
  const canEdit = resolveDispatchAccess(session, "dispatch.edit").ok;
  const canEditLabor = resolveLaborAccess(session, "labor.edit").ok;

  const params = await searchParams;
  const requested = parseWorkDate(params.date);
  const workDate = requested.ok
    ? requested.value
    : workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
  const [jobs, people, fieldUsers, dispatches, labor, capacities] = await Promise.all([
    listJobs(),
    listUsers(),
    listActiveFieldUsers(),
    listDispatches(access.organizationId, workDate),
    listLabor(access.organizationId, workDate),
    listCrewCapacities(access.organizationId),
  ]);
  const day = buildDispatchDay({
    organizationId: access.organizationId,
    jobs,
    people,
    dispatches,
  });
  const openJobs = jobs
    .filter(
      (job) =>
        job.organizationId === access.organizationId &&
        dispatchableJobStatus(job.status),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch"
        description={`${formatWorkDate(workDate)}. Schedule a field member on a job for this day. Job assignments stay in place.`}
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">Work date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={workDate}
            className="h-11 w-48"
          />
        </div>
        <Button type="submit" variant="outline" className="min-h-11">
          Show day
        </Button>
      </form>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Crew capacity</CardTitle>
            <CardDescription>
              How many jobs one field member can be scheduled on in a day. The default is 1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveCrewCapacity} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capacity-user">Field member</Label>
                <NativeSelect id="capacity-user" name="userId" className="h-11">
                  {fieldUsers.map((person) => (
                    <option key={person.userId} value={person.userId}>
                      {person.displayName} · {capacities.find((row) => row.userId === person.userId)?.jobsPerDay ?? 1} / day
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity-jobs">Jobs per day</Label>
                <NativeSelect id="capacity-jobs" name="jobsPerDay" defaultValue="1" className="h-11">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <SubmitButton pendingLabel="Saving…" className="min-h-11">
                  Save capacity
                </SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      {day.doubleBooked.length > 0 ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          role="status"
        >
          {day.doubleBooked
            .map(
              (person) =>
                `${person.displayName} is scheduled on ${person.jobNames.length} jobs: ${person.jobNames.join(" and ")}.`,
            )
            .join(" ")}
        </p>
      ) : null}

      <section aria-labelledby="scheduled-dispatch-heading" className="space-y-3">
        <h2 id="scheduled-dispatch-heading" className="text-lg font-semibold">
          Scheduled
        </h2>
        {day.scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one is dispatched this day.</p>
        ) : (
          <ul className="space-y-3">
            {day.scheduled.map((row) => (
              <li key={row.id}>
                <Card>
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{row.displayName}</CardTitle>
                        <CardDescription>
                          {formatJobNumber(row.jobId)} · {row.jobName}
                        </CardDescription>
                      </div>
                      <StatusBadge status="scheduled" label="Scheduled" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {row.note ? <p className="text-sm">{row.note}</p> : null}
                    {canEdit ? (
                      <ActionForm action={cancelDayDispatch}>
                        <input type="hidden" name="workDate" value={workDate} />
                        <input type="hidden" name="dispatchId" value={row.id} />
                        <SubmitButton variant="outline" pendingLabel="Cancelling…" className="min-h-11">
                          Cancel dispatch
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {day.cancelled.length > 0 ? (
        <section aria-labelledby="cancelled-dispatch-heading" className="space-y-3">
          <h2 id="cancelled-dispatch-heading" className="text-lg font-semibold">
            Cancelled
          </h2>
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {day.cancelled.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {row.displayName} · {row.jobName}
                  {row.note ? ` · ${row.note}` : ""}
                </span>
                <StatusBadge status="cancelled" label="Cancelled" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="labor-heading" className="space-y-3">
        <div>
          <h2 id="labor-heading" className="text-lg font-semibold">Labor</h2>
          <p className="text-sm text-muted-foreground">
            Piece work is bags or square feet. Hours are for time. A wage is not stored.
          </p>
        </div>
        {labor.length === 0 ? (
          <p className="text-sm text-muted-foreground">No labor recorded this day.</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {labor
              .map((entry) => ({
                entry,
                person: people.find((user) => user.userId === entry.userId)?.displayName ?? "Former member",
                jobName: jobs.find((job) => job.id === entry.jobId)?.name ?? "Unknown job",
              }))
              .sort((left, right) => left.person.localeCompare(right.person) || left.jobName.localeCompare(right.jobName))
              .map(({ entry, person, jobName }) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {person} · {jobName} · {formatLaborEntry(entry)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                  {canEditLabor ? (
                    <ActionForm action={removeDayLabor}>
                      <input type="hidden" name="workDate" value={workDate} />
                      <input type="hidden" name="laborId" value={entry.id} />
                      <SubmitButton variant="outline" pendingLabel="Removing…" className="min-h-11">
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
        {canEditLabor ? (
          <Card>
            <CardHeader>
              <CardTitle>Record labor</CardTitle>
              <CardDescription>
                Saving the same person, job, day, and measure updates that entry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={recordDayLabor} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="workDate" value={workDate} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="laborJobId">Job</Label>
                  <NativeSelect id="laborJobId" name="jobId" required className="h-11">
                    <option value="">Choose a job</option>
                    {openJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {formatJobNumber(job.id)} · {job.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laborUserId">Field member</Label>
                  <NativeSelect id="laborUserId" name="userId" required className="h-11">
                    <option value="">Choose a person</option>
                    {fieldUsers.map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.displayName}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Measure</legend>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="radio" name="kind" value="piece" required />
                    Piece work
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="radio" name="kind" value="hourly" />
                    Hours
                  </label>
                </fieldset>
                <div className="space-y-2">
                  <Label htmlFor="laborQuantity">Pieces</Label>
                  <Input id="laborQuantity" name="quantity" inputMode="numeric" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laborUnit">Unit</Label>
                  <NativeSelect id="laborUnit" name="unit" className="h-11">
                    <option value="">Choose a unit</option>
                    <option value="bags">Bags</option>
                    <option value="sq_ft">Square feet</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laborHours">Hours</Label>
                  <Input id="laborHours" name="hours" inputMode="decimal" placeholder="8 or 7.5" className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="laborNote">Note</Label>
                  <Input id="laborNote" name="note" maxLength={500} className="h-11" />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton pendingLabel="Saving…" className="min-h-11">
                    Save labor
                  </SubmitButton>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Add dispatch</CardTitle>
            <CardDescription>
              The same person can be sent to two jobs. That shows as a double booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={scheduleDayDispatch} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="workDate" value={workDate} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="jobId">Job</Label>
                <NativeSelect id="jobId" name="jobId" required className="h-11">
                  <option value="">Choose a job</option>
                  {openJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {formatJobNumber(job.id)} · {job.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">Field member</Label>
                <NativeSelect id="userId" name="userId" required className="h-11">
                  <option value="">Choose a person</option>
                  {fieldUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.displayName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" maxLength={500} className="h-11" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Saving…" className="min-h-11">
                  Schedule
                </SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
