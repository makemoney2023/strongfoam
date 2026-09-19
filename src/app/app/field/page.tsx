import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHatIcon, MapPinIcon } from "lucide-react";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpsSession } from "@/lib/ops/auth";
import { isFieldActiveJobStatus } from "@/lib/ops/field-workspace";
import { JOB_STATUS_LABELS, formatJobNumber } from "@/lib/ops/jobs";
import { getCompany, getSite, listJobs, listJobTasks } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function FieldLandingPage() {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const jobs = await listJobs();
  const activeJobs = jobs.filter((job) => isFieldActiveJobStatus(job.status));
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
      <PageHeader
        title="Field"
        description="Today's assignments, site details, and the work still open on active jobs."
      />

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
                    render={<Link href={`/app/field/jobs/${job.id}`} />}
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
