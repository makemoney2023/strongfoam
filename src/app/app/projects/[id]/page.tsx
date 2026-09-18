import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
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
    <main className="page-rail py-8">
      <Link
        href="/app/projects"
        className="text-sm font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
      >
        Back to projects
      </Link>
      <p className="section-kicker mt-6 mb-2">Project</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--sf-ink)]/65">
            {project.projectManager ?? "Unassigned"}
            {company ? ` · ${company.name}` : ""}
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold capitalize ring-1 ring-[color:var(--sf-ink)]/10">
          {project.status}
        </p>
      </div>

      {query.saved ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-[color:var(--sf-cyan)]/10 px-3 py-2 text-sm text-[color:var(--sf-ink)]"
        >
          Project saved.
        </p>
      ) : null}
      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-[color:var(--sf-red)]/10 px-3 py-2 text-sm text-[color:var(--sf-red)]"
        >
          {query.error}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-4 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Company
          </dt>
          <dd className="mt-1">
            {company ? (
              <Link
                href={`/app/companies/${company.id}`}
                className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
              >
                {company.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Site
          </dt>
          <dd className="mt-1">
            {site
              ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Opportunity
          </dt>
          <dd className="mt-1">
            {opportunity ? (
              <Link
                href={`/app/opportunities/${opportunity.id}`}
                className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
              >
                {opportunity.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Source request
          </dt>
          <dd className="mt-1">
            {project.sourceLeadId ? (
              <Link
                href={`/app/requests/${project.sourceLeadId}`}
                className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
              >
                {formatRequestNumber(project.sourceLeadId)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <section className="mt-6 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
        <h2 className="font-heading text-lg font-semibold">Jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
            No jobs are attached to this project yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/app/jobs/${job.id}`}
                  className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                >
                  {formatJobNumber(job.id)} · {job.name}
                </Link>
                <p className="text-sm text-[color:var(--sf-ink)]/65">
                  {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                    job.status}
                  {" · "}
                  {formatServices(job.services)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form action={addProjectJob} className="mt-6 space-y-4 border-t border-[color:var(--sf-ink)]/10 pt-5">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="projectName" value={project.name} />
          <h3 className="font-heading text-base font-semibold">Add a job</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="jobName">Job name</Label>
              <Input id="jobName" name="jobName" className="h-11" required />
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
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foreman">Foreman</Label>
              <Input id="foreman" name="foreman" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedStartAt">Planned start</Label>
              <Input
                id="plannedStartAt"
                name="plannedStartAt"
                type="datetime-local"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedEndAt">Planned end</Label>
              <Input
                id="plannedEndAt"
                name="plannedEndAt"
                type="datetime-local"
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" variant="outline" className="h-11">
            Add job
          </Button>
        </form>
      </section>
    </main>
  );
}
