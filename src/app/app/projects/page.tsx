import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="One project is created from each won opportunity. Add more jobs from the project when the site needs extra crews or phases."
        actions={
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Manager</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No projects yet. Mark an opportunity won and convert it.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const company = companies.find((item) => item.id === project.companyId);
                const jobCount = jobs.filter((job) => job.projectId === project.id).length;
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {company ? (
                        <Link href={`/app/companies/${company.id}`} className="hover:underline">
                          {company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} label={project.status} />
                    </TableCell>
                    <TableCell>{jobCount}</TableCell>
                    <TableCell>{project.projectManager ?? "Unassigned"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
