import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHatIcon, MapPinIcon } from "lucide-react";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { RealtimeRefresh } from "@/components/ops/realtime-refresh";
import { StatusBadge } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getFieldSession } from "@/lib/ops/field-auth";
import { isFieldActiveJobStatus } from "@/lib/ops/field-workspace";
import { JOB_STATUS_LABELS, JOB_STATUSES, formatJobNumber } from "@/lib/ops/jobs";
import { getCompany, getSite, listJobs, listJobTasks } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function FieldLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");

  const params = await searchParams;
  const jobs = await listJobs({
    status: params.status,
    from: params.from,
    to: params.to,
    fieldUserId: session.userId,
  });
  const activeJobs = params.status
    ? jobs
    : jobs.filter((job) => isFieldActiveJobStatus(job.status));
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
        description="Today's assignments, site details, and the work still open on active jobs."
      />

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
