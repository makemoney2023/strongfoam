import { HammerIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ops/empty-state";
import { Flash } from "@/components/ops/flash";
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
import { JOB_STATUS_LABELS, JOB_STATUSES, formatJobNumber } from "@/lib/ops/jobs";
import { listCompanies, listJobs, listProjects } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";
import { NewJobDialog } from "./new-job-dialog";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const [jobs, projects, companies] = await Promise.all([
    listJobs({
      status: params.status,
      q: params.q,
      from: params.from,
      to: params.to,
    }),
    listProjects(),
    listCompanies(),
  ]);
  const isFiltered = Boolean(params.q || params.status || params.from || params.to);
  const projectOptions = projects
    .filter((project) => project.status !== "closed")
    .map((project) => ({
      id: project.id,
      name: project.name,
      projectManager: project.projectManager,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Each job is one crew's scope of work on a project. Open a job to plan work areas, tasks, and documents."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {jobs.length} job{jobs.length === 1 ? "" : "s"}
            </p>
            <NewJobDialog projects={projectOptions} returnTo="/app/jobs" />
          </div>
        }
      />
      <Flash saved={params.saved} error={params.error} savedMessage="Job saved." />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Job, scope, crew"
            className="h-11 min-w-56"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="h-11 w-56"
          >
            <option value="">All statuses</option>
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

      <Card>
        {jobs.length === 0 ? (
          <EmptyState
            icon={<HammerIcon aria-hidden="true" />}
            title={isFiltered ? "No jobs match these filters" : "No jobs yet"}
            description={
              isFiltered
                ? "Widen the date range or clear the status filter."
                : projectOptions.length > 0
                  ? "Add a job to an existing project, or convert a won opportunity to start a new project."
                  : "Jobs are created when a won opportunity is converted into a project."
            }
            action={
              isFiltered ? (
                <Link href="/app/jobs" className="text-sm font-medium underline underline-offset-4">
                  Clear filters
                </Link>
              ) : (
                <NewJobDialog
                  projects={projectOptions}
                  returnTo="/app/jobs"
                  triggerLabel={projectOptions.length > 0 ? "Add your first job" : "How do I add a job?"}
                  triggerVariant={projectOptions.length > 0 ? "default" : "outline"}
                />
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const project = projects.find((item) => item.id === job.projectId);
                const company = companies.find((item) => item.id === job.companyId);
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link href={`/app/jobs/${job.id}`} className="font-medium hover:underline">
                        {formatJobNumber(job.id)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{job.name}</p>
                    </TableCell>
                    <TableCell>
                      {project ? (
                        <Link href={`/app/projects/${project.id}`} className="hover:underline">
                          {project.name}
                        </Link>
                      ) : (
                        "—"
                      )}
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
                        status={job.status}
                        label={
                          JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                          job.status
                        }
                      />
                    </TableCell>
                    <TableCell>{formatServices(job.services)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
