import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { JOB_STATUS_LABELS, JOB_STATUSES, formatJobNumber } from "@/lib/ops/jobs";
import { listCompanies, listJobs, listProjects } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const [jobs, projects, companies] = await Promise.all([
    listJobs({ status: params.status }),
    listProjects(),
    listCompanies(),
  ]);

  return (
    <main className="page-rail py-8">
      <p className="section-kicker mb-2">Operations</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Jobs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--sf-ink)]/70">
            Field jobs created from won opportunities or added to an existing
            project.
          </p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--sf-ink)]/60">
          {jobs.length} job{jobs.length === 1 ? "" : "s"}
        </p>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-4">
        <label className="space-y-2 text-sm">
          <span className="block text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-11 rounded-lg border border-input bg-white px-2.5 text-sm"
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-[color:var(--sf-cyan)] px-4 text-sm font-semibold text-[color:var(--sf-ink)]"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white">
        <table className="min-w-[56rem] w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--sf-mist,#e9edef)] text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Scope</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[color:var(--sf-ink)]/60">
                  No jobs yet. Mark an opportunity won and convert it.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const project = projects.find((item) => item.id === job.projectId);
                const company = companies.find((item) => item.id === job.companyId);
                return (
                  <tr
                    key={job.id}
                    className="border-t border-[color:var(--sf-ink)]/8 hover:bg-[color:var(--sf-cyan)]/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                      >
                        {formatJobNumber(job.id)}
                      </Link>
                      <p className="text-xs text-[color:var(--sf-ink)]/55">{job.name}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {project ? (
                        <Link
                          href={`/app/projects/${project.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {company ? (
                        <Link
                          href={`/app/companies/${company.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                        job.status}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatServices(job.services)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
