import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import {
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  formatJobNumber,
} from "@/lib/ops/jobs";
import {
  getCompany,
  getJob,
  getOpportunity,
  getProject,
  getSite,
  listJobEvents,
} from "@/lib/ops/store";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import { saveJobStatus } from "../actions";

export const dynamic = "force-dynamic";

function formatWhen(value: Date | null): string {
  return value ? value.toLocaleString("en-CA") : "—";
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const [project, company, site, opportunity, events] = await Promise.all([
    job.projectId ? getProject(job.projectId) : null,
    job.companyId ? getCompany(job.companyId) : null,
    job.siteId ? getSite(job.siteId) : null,
    job.opportunityId ? getOpportunity(job.opportunityId) : null,
    listJobEvents(job.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/jobs", label: "Jobs" },
          { label: formatJobNumber(job.id) },
        ]}
        title={formatJobNumber(job.id)}
        description={job.name}
        actions={
          <StatusBadge
            status={job.status}
            label={JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
          />
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Job saved." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <p className="mt-1">
                  {project ? (
                    <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Company</p>
                <p className="mt-1">
                  {company ? (
                    <Link href={`/app/companies/${company.id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Site</p>
                <p className="mt-1">
                  {site
                    ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Opportunity</p>
                <p className="mt-1">
                  {opportunity ? (
                    <Link
                      href={`/app/opportunities/${opportunity.id}`}
                      className="font-medium hover:underline"
                    >
                      {opportunity.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Source request</p>
                <p className="mt-1">
                  {opportunity?.sourceLeadId ? (
                    <Link
                      href={`/app/requests/${opportunity.sourceLeadId}`}
                      className="font-medium hover:underline"
                    >
                      {formatRequestNumber(opportunity.sourceLeadId)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Scope</p>
                <p className="mt-1">{job.scope || "—"}</p>
                <p className="text-sm text-muted-foreground">{formatServices(job.services)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Planned</p>
                <p className="mt-1">
                  {formatWhen(job.plannedStartAt)} → {formatWhen(job.plannedEndAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Crew</p>
                <p className="mt-1">PM: {job.projectManager ?? "Unassigned"}</p>
                <p>Foreman: {job.foreman ?? "Unassigned"}</p>
              </div>
            </CardContent>
            {job.status === "blocked" && job.blockerNote ? (
              <CardContent>
                <p className="text-sm text-destructive">Blocked: {job.blockerNote}</p>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job activity has been recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {events.map((event) => (
                    <li key={event.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor} · {event.createdAt.toLocaleString("en-CA")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>A blocker note is required when the job is blocked.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveJobStatus} className="space-y-4">
              <input type="hidden" name="jobId" value={job.id} />
              <div className="space-y-2">
                <Label htmlFor="status">Job status</Label>
                <NativeSelect id="status" name="status" defaultValue={job.status}>
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {JOB_STATUS_LABELS[status]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockerNote">Blocker note</Label>
                <Textarea
                  id="blockerNote"
                  name="blockerNote"
                  rows={4}
                  defaultValue={job.blockerNote ?? ""}
                />
              </div>
              <Button type="submit" className="w-full">
                Save status
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
