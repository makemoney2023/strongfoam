import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHatIcon, MapPinIcon } from "lucide-react";
import { ActionForm } from "@/components/ops/action-form";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { RealtimeRefresh } from "@/components/ops/realtime-refresh";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE, dispatchesVisibleToUser, dispatchableJobStatus } from "@/lib/ops/dispatch";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { formatLaborEntry } from "@/lib/ops/labor";
import { listLabor } from "@/lib/ops/labor-store";
import { getFieldSession } from "@/lib/ops/field-auth";
import { isFieldActiveJobStatus } from "@/lib/ops/field-workspace";
import { JOB_STATUS_LABELS, JOB_STATUSES, formatJobNumber } from "@/lib/ops/jobs";
import { getOpsNow } from "@/lib/ops/ops-now";
import { getCompany, getJob, getSite, listJobs, listJobTasks } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";
import { recordFieldLabor, removeFieldLabor } from "@/app/field/labor-actions";

export const dynamic = "force-dynamic";

export default async function FieldLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");

  const params = await searchParams;
  const workDate = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
  const ownDispatches = dispatchesVisibleToUser(
    await listDispatches(session.organizationId, workDate, session.userId),
    session.userId,
  );
  const dispatchedToday = (
    await Promise.all(
      ownDispatches.map(async (dispatch) => {
        const job = await getJob(dispatch.jobId);
        if (!job || job.organizationId !== session.organizationId) return null;
        return { dispatch, job };
      }),
    )
  ).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const labor = await listLabor(session.organizationId, workDate, session.userId);
  const jobs = await listJobs({
    status: params.status,
    from: params.from,
    to: params.to,
    fieldUserId: session.userId,
  });
  const activeJobs = params.status
    ? jobs
    : jobs.filter((job) => isFieldActiveJobStatus(job.status));
  const laborJobs = [...dispatchedToday.map((row) => row.job), ...jobs]
    .filter(
      (job) =>
        job.organizationId === session.organizationId &&
        dispatchableJobStatus(job.status),
    )
    .filter((job, index, list) => list.findIndex((item) => item.id === job.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
  const laborJobNames = new Map(laborJobs.map((job) => [job.id, job.name]));
  await Promise.all(
    labor
      .filter((entry) => !laborJobNames.has(entry.jobId))
      .map(async (entry) => {
        const job = await getJob(entry.jobId);
        if (job && job.organizationId === session.organizationId) {
          laborJobNames.set(job.id, job.name);
        }
      }),
  );
  const cards = await Promise.all(
    activeJobs.map(async (job) => {
      const [company, site, tasks] = await Promise.all([
        job.companyId ? getCompany(job.companyId) : null,
        job.siteId ? getSite(job.siteId) : null,
        listJobTasks(job.id),
      ]);
      const openTasks = tasks.filter((task) => task.status === "open").length;
      return { job, company, site, openTasks, totalTasks: tasks.length };
    }),
  );

  return (
    <div className="space-y-6">
      <RealtimeRefresh url="/api/field/events" />
      <PageHeader
        title="Field"
        description="Today's dispatch, piece work or hours, and the work still open on active jobs."
      />

      <section aria-labelledby="field-labor-heading" className="space-y-3">
        <div>
          <h2 id="field-labor-heading" className="text-lg font-semibold">Today&apos;s labor</h2>
          <p className="text-sm text-muted-foreground">
            Record bags or square feet for piece work, or hours when the day is paid by time.
          </p>
        </div>
        {labor.length === 0 ? (
          <p className="text-sm text-muted-foreground">No labor recorded today.</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {labor.map((entry) => {
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {laborJobNames.get(entry.jobId) ?? "Job"} · {formatLaborEntry(entry)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                  <ActionForm action={removeFieldLabor}>
                    <input type="hidden" name="laborId" value={entry.id} />
                    <SubmitButton variant="outline" pendingLabel="Removing…" className="min-h-11">
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}
        {laborJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open job is available for labor today.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Record labor</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={recordFieldLabor} className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldLaborJob">Job</Label>
                  <NativeSelect id="fieldLaborJob" name="jobId" required className="h-11">
                    <option value="">Choose a job</option>
                    {laborJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {formatJobNumber(job.id)} · {job.name}
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fieldLaborQuantity">Pieces</Label>
                    <Input id="fieldLaborQuantity" name="quantity" inputMode="numeric" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fieldLaborUnit">Unit</Label>
                    <NativeSelect id="fieldLaborUnit" name="unit" className="h-11">
                      <option value="">Choose a unit</option>
                      <option value="bags">Bags</option>
                      <option value="sq_ft">Square feet</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldLaborHours">Hours</Label>
                  <Input id="fieldLaborHours" name="hours" inputMode="decimal" placeholder="8 or 7.5" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldLaborNote">Note</Label>
                  <Input id="fieldLaborNote" name="note" maxLength={500} className="h-11" />
                </div>
                <SubmitButton pendingLabel="Saving…" className="min-h-11">
                  Save labor
                </SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="dispatched-today-heading" className="space-y-3">
        <h2 id="dispatched-today-heading" className="text-lg font-semibold">
          Dispatched today
        </h2>
        {dispatchedToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dispatch for today.</p>
        ) : (
          <ul className="space-y-3">
            {dispatchedToday.map(({ dispatch, job }) => (
              <li key={dispatch.id}>
                <Card>
                  <CardHeader className="gap-2">
                    <CardTitle>{job.name}</CardTitle>
                    <CardDescription>
                      {formatJobNumber(job.id)}
                      {dispatch.note ? ` · ${dispatch.note}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/field/jobs/${job.id}`} />}
                      className="min-h-11 w-full sm:w-auto"
                    >
                      Open field job
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="h-11 w-56"
          >
            <option value="">Active field jobs</option>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DateRangeFields
          from={params.from}
          to={params.to}
          fromLabel="Planned from"
          toLabel="Planned to"
        />
        <FilterSubmit />
      </ListFilters>

      {cards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No active field jobs</CardTitle>
            <CardDescription>
              Scheduled, in-progress, blocked, or inspection jobs will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-4">
          {cards.map(({ job, company, site, openTasks, totalTasks }) => (
            <li key={job.id}>
              <Card>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatJobNumber(job.id)}
                      </p>
                      <CardTitle className="mt-1">{job.name}</CardTitle>
                    </div>
                    <StatusBadge
                      status={job.status}
                      label={
                        JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                        job.status
                      }
                    />
                  </div>
                  <CardDescription>
                    {company?.name ?? "Unassigned company"}
                    {site ? ` · ${site.name}, ${site.city}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p className="flex items-start gap-2 text-sm">
                      <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        {site
                          ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}`
                          : "Site not assigned"}
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-sm">
                      <HardHatIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        {openTasks} open of {totalTasks} tasks
                        {job.foreman ? ` · ${job.foreman}` : ""}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {job.scope || formatServices(job.services)}
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href={`/field/jobs/${job.id}`} />}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    Open field job
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
