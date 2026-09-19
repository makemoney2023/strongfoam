import Link from "next/link";
import { redirect } from "next/navigation";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOpsSession } from "@/lib/ops/auth";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/lib/ops/records";
import { listCompanies, listJobs, listProjects } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const [projects, companies, jobs] = await Promise.all([
    listProjects({
      q: params.q,
      status: params.status,
      from: params.from,
      to: params.to,
    }),
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

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Project or manager"
            className="h-11 min-w-56"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={params.status ?? ""} className="h-11 w-44">
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DateRangeFields from={params.from} to={params.to} />
        <FilterSubmit />
      </ListFilters>

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
                  No projects match these filters.
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
                      <StatusBadge
                        status={project.status}
                        label={
                          PROJECT_STATUS_LABELS[
                            project.status as keyof typeof PROJECT_STATUS_LABELS
                          ] ?? project.status
                        }
                      />
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
