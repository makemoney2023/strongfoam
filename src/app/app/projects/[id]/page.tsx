import { HammerIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { ActionForm } from "@/components/ops/action-form";
import { DetailList } from "@/components/ops/detail-list";
import { EmptyState } from "@/components/ops/empty-state";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { ProjectSchedule } from "@/components/ops/project-schedule";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";
import {
  JOB_STATUS_LABELS,
  formatJobNumber,
  type JobStatus,
} from "@/lib/ops/jobs";
import {
  getCompany,
  getOpportunity,
  getProject,
  getProjectScheduleBaseline,
  getSite,
  listJobs,
  listProjectJobTasks,
  listProjectScheduleBaselines,
  listProjectTaskDependencies,
  resolveProjectScheduleCalendar,
} from "@/lib/ops/store";
import { getOpsNow } from "@/lib/ops/ops-now";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/lib/ops/records";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import { removeProject, saveProject } from "../actions";
import { NewJobDialog } from "../../jobs/new-job-dialog";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scheduleBaseline?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);
  if (!project) notFound();

  const [
    company,
    site,
    opportunity,
    jobs,
    projectTaskResult,
    dependencyResult,
    baselines,
    selectedBaseline,
    scheduleCalendar,
  ] =
    await Promise.all([
      project.companyId ? getCompany(project.companyId) : null,
      project.siteId ? getSite(project.siteId) : null,
      project.opportunityId ? getOpportunity(project.opportunityId) : null,
      listJobs({ projectId: project.id }),
      listProjectJobTasks(project.id),
      listProjectTaskDependencies(project.id),
      listProjectScheduleBaselines(project.id),
      query.scheduleBaseline
        ? getProjectScheduleBaseline(project.id, query.scheduleBaseline)
        : null,
      resolveProjectScheduleCalendar(project.id),
    ]);

  const tasksByJob = new Map<string, typeof projectTaskResult.tasks>();
  for (const task of projectTaskResult.tasks) {
    const bucket = tasksByJob.get(task.jobId) ?? [];
    bucket.push(task);
    tasksByJob.set(task.jobId, bucket);
  }
  const scheduleJobs = jobs.map((job) => ({
    id: job.id,
    updatedAt: job.updatedAt.toISOString(),
    number: formatJobNumber(job.id),
    name: job.name,
    status: job.status as JobStatus,
    projectManager: job.projectManager,
    foreman: job.foreman,
    plannedStartAt: job.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: job.plannedEndAt?.toISOString() ?? null,
    tasks: (tasksByJob.get(job.id) ?? []).map((task) => ({
      id: task.id,
      jobId: task.jobId,
      updatedAt: task.updatedAt.toISOString(),
      title: task.title,
      assignee: task.assignee,
      status: task.status === "done" ? ("done" as const) : ("open" as const),
      dueAt: task.dueAt?.toISOString() ?? null,
      plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
    })),
  }));
  const scheduleDependencies = dependencyResult.edges.map((edge) => ({
    id: edge.id,
    projectId: edge.projectId,
    predecessorTaskId: edge.predecessorTaskId,
    successorTaskId: edge.successorTaskId,
    lagDays: edge.lagDays,
  }));
  const scheduleBaselines = baselines.map((baseline) => ({
    id: baseline.id,
    name: baseline.name,
    capturedAt: baseline.capturedAt.toISOString(),
    capturedBy: baseline.capturedBy,
  }));
  const selectedBaselineItems = (selectedBaseline?.items ?? []).map((item) => ({
    id: item.id,
    baselineId: item.baselineId,
    entityType: item.entityType === "job" ? ("job" as const) : ("task" as const),
    entityId: item.entityId,
    plannedStartAt: item.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: item.plannedEndAt?.toISOString() ?? null,
    dueAt: item.dueAt?.toISOString() ?? null,
  }));

  const projectOption = {
    id: project.id,
    name: project.name,
    projectManager: project.projectManager,
  };
  const returnTo = `/app/projects/${project.id}`;
  const scheduleNow = getOpsNow().toISOString();

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
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={project.status}
              label={
                PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] ??
                project.status
              }
            />
            <FormDialog
              triggerLabel="Edit project"
              triggerIcon={<PencilIcon aria-hidden="true" />}
              triggerVariant="outline"
              title="Edit project"
            >
              <ActionForm action={saveProject} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={project.id} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editProject-name">
                    Name <span aria-hidden="true">*</span>
                  </Label>
                  <Input id="editProject-name" name="name" className="h-11" defaultValue={project.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editProject-status">Status</Label>
                  <NativeSelect id="editProject-status" name="status" defaultValue={project.status} className="h-11">
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {PROJECT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editProject-pm">Project manager</Label>
                  <Input
                    id="editProject-pm"
                    name="projectManager"
                    className="h-11"
                    defaultValue={project.projectManager ?? ""}
                  />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                    Save project
                  </SubmitButton>
                </div>
              </ActionForm>
            </FormDialog>
            <NewJobDialog project={projectOption} returnTo={returnTo} triggerLabel="Add job" />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>Where this project came from and who it is for.</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              {
                label: "Company",
                value: company ? (
                  <Link href={`/app/companies/${company.id}`} className="font-medium hover:underline">
                    {company.name}
                  </Link>
                ) : null,
              },
              {
                label: "Site",
                value: site ? `${site.name} · ${site.city}, ${site.province}` : null,
              },
              {
                label: "Opportunity",
                value: opportunity ? (
                  <Link
                    href={`/app/opportunities/${opportunity.id}`}
                    className="font-medium hover:underline"
                  >
                    {opportunity.name}
                  </Link>
                ) : null,
              },
              {
                label: "Source request",
                value: project.sourceLeadId ? (
                  <Link
                    href={`/app/requests/${project.sourceLeadId}`}
                    className="font-medium hover:underline"
                  >
                    {formatRequestNumber(project.sourceLeadId)}
                  </Link>
                ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>

      <section id="schedule" aria-labelledby="schedule-heading" className="scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle id="schedule-heading">Schedule</CardTitle>
            <CardDescription>
              Jobs, task progress, due dates, blockers, and unscheduled work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                icon={<HammerIcon aria-hidden="true" />}
                title="Add the first job to build this project schedule"
                description="Jobs and their tasks roll up here once work is attached to the project."
                action={
                  <NewJobDialog
                    project={projectOption}
                    returnTo={returnTo}
                    triggerLabel="Add job"
                  />
                }
                className="py-6"
              />
            ) : (
              <ProjectSchedule
                projectId={project.id}
                jobs={scheduleJobs}
                dependencies={scheduleDependencies}
                baselines={scheduleBaselines}
                selectedBaselineId={selectedBaseline?.baseline.id ?? null}
                selectedBaselineItems={selectedBaselineItems}
                calendar={scheduleCalendar}
                now={scheduleNow}
                truncated={projectTaskResult.truncated}
                dependenciesTruncated={dependencyResult.truncated}
                returnTo={returnTo}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>
            {jobs.length === 0
              ? "No jobs are attached to this project yet."
              : `${jobs.length} job${jobs.length === 1 ? "" : "s"} on this project.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              icon={<HammerIcon aria-hidden="true" />}
              title="Add the first job"
              description="Each job is one crew's scope of work. Add one per phase, floor, or crew so the field can track progress separately."
              action={<NewJobDialog project={projectOption} returnTo={returnTo} triggerLabel="Add job" />}
              className="py-6"
            />
          ) : (
            <ul className="divide-y">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link href={`/app/jobs/${job.id}`} className="font-medium hover:underline">
                      {formatJobNumber(job.id)} · {job.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatServices(job.services)}
                      {job.foreman ? ` · ${job.foreman}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={job.status}
                    label={JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle>Remove project</CardTitle>
          <CardDescription>Only possible once every job has been removed.</CardDescription>
          <CardAction>
            <ConfirmForm
              action={removeProject}
              message={`Delete ${project.name}? This cannot be undone.`}
            >
              <input type="hidden" name="id" value={project.id} />
              <SubmitButton variant="destructive" className="min-h-11 md:min-h-8" pendingLabel="Deleting…">
                <Trash2Icon aria-hidden="true" />
                Delete project
              </SubmitButton>
            </ConfirmForm>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
