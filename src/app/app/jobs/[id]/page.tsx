import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <main className="page-rail py-8">
      <Link
        href="/app/jobs"
        className="text-sm font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
      >
        Back to jobs
      </Link>
      <p className="section-kicker mt-6 mb-2">Job</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {formatJobNumber(job.id)}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--sf-ink)]/65">{job.name}</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold ring-1 ring-[color:var(--sf-ink)]/10">
          {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
            job.status}
        </p>
      </div>

      {query.saved ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-[color:var(--sf-cyan)]/10 px-3 py-2 text-sm text-[color:var(--sf-ink)]"
        >
          Job saved.
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Project
                </dt>
                <dd className="mt-1">
                  {project ? (
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                    >
                      {project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
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
                  {job.opportunityId && opportunity?.sourceLeadId ? (
                    <Link
                      href={`/app/requests/${opportunity.sourceLeadId}`}
                      className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                    >
                      {formatRequestNumber(opportunity.sourceLeadId)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Scope
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>{job.scope || "—"}</p>
                  <p>{formatServices(job.services)}</p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Planned
                </dt>
                <dd className="mt-1">
                  {formatWhen(job.plannedStartAt)} → {formatWhen(job.plannedEndAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Crew
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>PM: {job.projectManager ?? "Unassigned"}</p>
                  <p>Foreman: {job.foreman ?? "Unassigned"}</p>
                </dd>
              </div>
            </dl>
            {job.status === "blocked" && job.blockerNote ? (
              <p className="mt-4 rounded-md bg-[color:var(--sf-red)]/10 px-3 py-2 text-sm text-[color:var(--sf-red)]">
                Blocked: {job.blockerNote}
              </p>
            ) : null}
          </div>

          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Activity</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
                No job activity has been recorded yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-[color:var(--sf-cyan)] pl-3">
                    <p className="text-sm font-medium">{event.summary}</p>
                    <p className="text-xs text-[color:var(--sf-ink)]/55">
                      {event.actor} · {event.createdAt.toLocaleString("en-CA")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold">Status</h2>
          <form action={saveJobStatus} className="mt-4 space-y-4">
            <input type="hidden" name="jobId" value={job.id} />
            <div className="space-y-2">
              <Label htmlFor="status">Job status</Label>
              <select
                id="status"
                name="status"
                defaultValue={job.status}
                className="h-11 w-full rounded-lg border border-input bg-white px-2.5 text-sm"
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {JOB_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockerNote">Blocker note</Label>
              <Textarea
                id="blockerNote"
                name="blockerNote"
                rows={4}
                defaultValue={job.blockerNote ?? ""}
              />
              <p className="text-xs text-[color:var(--sf-ink)]/55">
                Required when the job is blocked.
              </p>
            </div>
            <Button type="submit" className="h-11 w-full">
              Save status
            </Button>
          </form>
        </aside>
      </div>
    </main>
  );
}
