import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { listCompanies, listJobs, listProjects } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const [projects, companies, jobs] = await Promise.all([
    listProjects(),
    listCompanies(),
    listJobs(),
  ]);

  return (
    <main className="page-rail py-8">
      <p className="section-kicker mb-2">Operations</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--sf-ink)]/70">
            One project is created from each won opportunity. Add more jobs from
            the project when the site needs extra crews or phases.
          </p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--sf-ink)]/60">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white">
        <table className="min-w-[48rem] w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--sf-mist,#e9edef)] text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Jobs</th>
              <th className="px-4 py-3 font-semibold">Manager</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[color:var(--sf-ink)]/60">
                  No projects yet. Mark an opportunity won and convert it.
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const company = companies.find((item) => item.id === project.companyId);
                const jobCount = jobs.filter((job) => job.projectId === project.id).length;
                return (
                  <tr
                    key={project.id}
                    className="border-t border-[color:var(--sf-ink)]/8 hover:bg-[color:var(--sf-cyan)]/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                      >
                        {project.name}
                      </Link>
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
                    <td className="px-4 py-3 align-top capitalize">{project.status}</td>
                    <td className="px-4 py-3 align-top">{jobCount}</td>
                    <td className="px-4 py-3 align-top">
                      {project.projectManager ?? "Unassigned"}
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
