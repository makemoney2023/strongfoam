import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import { JOB_STATUS_LABELS, formatJobNumber } from "@/lib/ops/jobs";
import {
  getCompany,
  getOpportunity,
  getProject,
  getSite,
  listJobs,
} from "@/lib/ops/store";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/lib/ops/records";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import { removeProject, saveProject } from "../actions";
import { addProjectJob } from "../../jobs/actions";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
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
  const project = await getProject(id);
  if (!project) notFound();

  const [company, site, opportunity, jobs] = await Promise.all([
    project.companyId ? getCompany(project.companyId) : null,
    project.siteId ? getSite(project.siteId) : null,
    project.opportunityId ? getOpportunity(project.opportunityId) : null,
    listJobs({ projectId: project.id }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/projects", label: "Projects" },
          { label: project.name },
        ]}
        title={project.name}
        description={`${project.projectManager ?? "Unassigned"}${company ? ` · ${company.name}` : ""}`}
        actions={
          <StatusBadge
            status={project.status}
            label={
              PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] ??
              project.status
            }
          />
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Project saved." />

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveProject} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={project.id} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" className="h-11" defaultValue={project.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={project.status} className="h-11">
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectManagerEdit">Project manager</Label>
              <Input
                id="projectManagerEdit"
                name="projectManager"
                className="h-11"
                defaultValue={project.projectManager ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="min-h-11">Save project</SubmitButton>
            </div>
          </form>
          <form action={removeProject}>
            <input type="hidden" name="id" value={project.id} />
            <SubmitButton variant="destructive" className="min-h-11" pendingLabel="Deleting…">
              Delete project
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
              {project.sourceLeadId ? (
                <Link
                  href={`/app/requests/${project.sourceLeadId}`}
                  className="font-medium hover:underline"
                >
                  {formatRequestNumber(project.sourceLeadId)}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs are attached to this project yet.</p>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/app/jobs/${job.id}`} className="font-medium hover:underline">
                    {formatJobNumber(job.id)} · {job.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
                    {" · "}
                    {formatServices(job.services)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form action={addProjectJob} className="space-y-4 border-t pt-5">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="projectName" value={project.name} />
            <h3 className="text-sm font-semibold">Add a job</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="jobName">Job name</Label>
                <Input id="jobName" name="jobName" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="scope">Scope</Label>
                <Textarea id="scope" name="scope" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectManager">Project manager</Label>
                <Input
                  id="projectManager"
                  name="projectManager"
                  defaultValue={project.projectManager ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foreman">Foreman</Label>
                <Input id="foreman" name="foreman" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedStartAt">Planned start</Label>
                <Input id="plannedStartAt" name="plannedStartAt" type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedEndAt">Planned end</Label>
                <Input id="plannedEndAt" name="plannedEndAt" type="datetime-local" />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Add job
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
