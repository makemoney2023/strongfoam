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
import { JOB_STATUS_LABELS, JOB_STATUSES, formatJobNumber } from "@/lib/ops/jobs";
import { listCompanies, listJobs, listProjects } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Field jobs created from won opportunities or added to an existing project."
        actions={
          <p className="text-sm text-muted-foreground">
            {jobs.length} job{jobs.length === 1 ? "" : "s"}
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
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No jobs yet. Mark an opportunity won and convert it.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
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
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
