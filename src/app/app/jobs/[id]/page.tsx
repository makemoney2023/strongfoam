import {
  ActivityIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MapPinnedIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { Flash } from "@/components/ops/flash";
import { JobDocumentUploader } from "@/components/ops/job-document-uploader";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { datetimeLocalValue } from "@/lib/ops/filters";
import {
  FIELD_NOTE_KINDS,
  FIELD_NOTE_LABELS,
  FIELD_QUANTITY_LABELS,
  FIELD_QUANTITY_UNITS,
} from "@/lib/ops/field-workspace";
import {
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  formatJobNumber,
} from "@/lib/ops/jobs";
import {
  JOB_DOCUMENT_KINDS,
  JOB_DOCUMENT_LABELS,
  WORK_AREA_KINDS,
  WORK_AREA_LABELS,
  formatFileSize,
  jobDocumentHref,
} from "@/lib/ops/job-workspace";
import {
  getCompany,
  getJob,
  getOpportunity,
  getProject,
  getSite,
  listJobDocuments,
  listJobEvents,
  listJobFieldNotes,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import {
  addJobWorkArea,
  addJobWorkspaceTask,
  removeJob,
  removeJobDocument,
  removeJobFieldEntry,
  removeJobWorkArea,
  removeJobWorkspaceTask,
  saveJobDetails,
  saveJobDocumentMeta,
  saveJobFieldEntry,
  saveJobStatus,
  saveJobWorkArea,
  saveJobWorkspaceTask,
  setJobWorkspaceTaskStatus,
} from "../actions";

export const dynamic = "force-dynamic";

function formatWhen(value: Date | null): string {
  return value ? value.toLocaleString("en-CA") : "—";
}

function taskTitleLookup(
  tasks: Array<{ id: string; title: string }>,
  taskId: string | null,
) {
  return tasks.find((task) => task.id === taskId)?.title;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    taskStatus?: string;
    noteKind?: string;
    docKind?: string;
    from?: string;
    to?: string;
  }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const [project, company, site, opportunity, events, areas, tasks, documents, notes] =
    await Promise.all([
      job.projectId ? getProject(job.projectId) : null,
      job.companyId ? getCompany(job.companyId) : null,
      job.siteId ? getSite(job.siteId) : null,
      job.opportunityId ? getOpportunity(job.opportunityId) : null,
      listJobEvents(job.id),
      listWorkAreas(job.id),
      listJobTasks(job.id, { status: query.taskStatus, from: query.from, to: query.to }),
      listJobDocuments(job.id, { kind: query.docKind, from: query.from, to: query.to }),
      listJobFieldNotes(job.id, { kind: query.noteKind, from: query.from, to: query.to }),
    ]);

  const areaName = (workAreaId: string | null) =>
    areas.find((area) => area.id === workAreaId)?.name;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const taskProgress =
    tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  const documentStorageMode = isDemoOpsStore()
    ? "demo"
    : process.env.BLOB_READ_WRITE_TOKEN
      ? "blob"
      : "unavailable";

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/jobs", label: "Jobs" },
          { label: formatJobNumber(job.id) },
        ]}
        title={formatJobNumber(job.id)}
        description={job.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={job.status}
              label={JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
            />
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              render={<Link href={`/app/field/jobs/${job.id}`} />}
            >
              Open field view
            </Button>
          </div>
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Job saved." />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="taskStatus">Tasks</Label>
          <NativeSelect
            id="taskStatus"
            name="taskStatus"
            defaultValue={query.taskStatus ?? ""}
            className="h-11 w-40"
          >
            <option value="">All tasks</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="noteKind">Field entries</Label>
          <NativeSelect
            id="noteKind"
            name="noteKind"
            defaultValue={query.noteKind ?? ""}
            className="h-11 w-48"
          >
            <option value="">All entries</option>
            {FIELD_NOTE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {FIELD_NOTE_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="docKind">Documents</Label>
          <NativeSelect
            id="docKind"
            name="docKind"
            defaultValue={query.docKind ?? ""}
            className="h-11 w-40"
          >
            <option value="">All files</option>
            {JOB_DOCUMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {JOB_DOCUMENT_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DateRangeFields from={query.from} to={query.to} />
        <FilterSubmit />
      </ListFilters>

      <section
        aria-label="Job workspace summary"
        className="grid grid-cols-3 gap-2 sm:gap-3"
      >
        <Card className="bg-muted/35 shadow-none">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border sm:flex">
              <MapPinnedIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-semibold tabular-nums sm:text-2xl">{areas.length}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Work areas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/35 shadow-none">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border sm:flex">
              <ClipboardCheckIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-semibold tabular-nums sm:text-2xl">
                {completedTasks}/{tasks.length}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">Tasks complete</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/35 shadow-none">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border sm:flex">
              <FileTextIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-semibold tabular-nums sm:text-2xl">
                {documents.length}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">Documents</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <CalendarDaysIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Job brief</CardTitle>
                  <CardDescription>
                    Scope, schedule, customer, and field leadership.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <p className="mt-1">
                  {project ? (
                    <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
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
                  {opportunity?.sourceLeadId ? (
                    <Link
                      href={`/app/requests/${opportunity.sourceLeadId}`}
                      className="font-medium hover:underline"
                    >
                      {formatRequestNumber(opportunity.sourceLeadId)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Scope</p>
                <p className="mt-1">{job.scope || "—"}</p>
                <p className="text-sm text-muted-foreground">{formatServices(job.services)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Planned</p>
                <p className="mt-1">
                  {formatWhen(job.plannedStartAt)} → {formatWhen(job.plannedEndAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Crew</p>
                <p className="mt-1">PM: {job.projectManager ?? "Unassigned"}</p>
                <p>Foreman: {job.foreman ?? "Unassigned"}</p>
              </div>
            </CardContent>
            {job.status === "blocked" && job.blockerNote ? (
              <CardContent>
                <p className="text-sm text-destructive">Blocked: {job.blockerNote}</p>
              </CardContent>
            ) : null}
            <CardContent className="space-y-4 border-t">
              <form action={saveJobDetails} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="jobName">Job name</Label>
                  <Input id="jobName" name="name" className="h-11" defaultValue={job.name} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="jobScope">Scope</Label>
                  <Textarea id="jobScope" name="scope" rows={3} defaultValue={job.scope ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobProjectManager">Project manager</Label>
                  <Input
                    id="jobProjectManager"
                    name="projectManager"
                    className="h-11"
                    defaultValue={job.projectManager ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobForeman">Foreman</Label>
                  <Input id="jobForeman" name="foreman" className="h-11" defaultValue={job.foreman ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobPlannedStartAt">Planned start</Label>
                  <Input
                    id="jobPlannedStartAt"
                    name="plannedStartAt"
                    type="datetime-local"
                    className="h-11"
                    defaultValue={datetimeLocalValue(job.plannedStartAt)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobPlannedEndAt">Planned end</Label>
                  <Input
                    id="jobPlannedEndAt"
                    name="plannedEndAt"
                    type="datetime-local"
                    className="h-11"
                    defaultValue={datetimeLocalValue(job.plannedEndAt)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton className="min-h-11">Save job details</SubmitButton>
                </div>
              </form>
              <form action={removeJob}>
                <input type="hidden" name="jobId" value={job.id} />
                <SubmitButton variant="destructive" className="min-h-11" pendingLabel="Deleting…">
                  Delete job
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <MapPinnedIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Work areas</CardTitle>
                  <CardDescription>
                    Rooms, floors, units, zones, or phases on this job.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No work areas yet. Add one before assigning tasks or plans to a
                  specific location.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {areas.map((area) => (
                    <li
                      key={area.id}
                      className="space-y-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <form action={saveJobWorkArea} className="space-y-3">
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="workAreaId" value={area.id} />
                        <Input name="name" className="h-11" defaultValue={area.name} required />
                        <NativeSelect name="kind" defaultValue={area.kind} className="h-11">
                          {WORK_AREA_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                              {WORK_AREA_LABELS[kind]}
                            </option>
                          ))}
                        </NativeSelect>
                        <Textarea name="notes" rows={2} defaultValue={area.notes ?? ""} />
                        <SubmitButton className="min-h-11">Save area</SubmitButton>
                      </form>
                      <form action={removeJobWorkArea}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="workAreaId" value={area.id} />
                        <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                          Delete area
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={addJobWorkArea}
                className="mt-5 space-y-4 rounded-lg border border-dashed p-4"
              >
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2">
                  <Label htmlFor="workAreaName">
                    New work area <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="workAreaName"
                    name="name"
                    className="h-11"
                    maxLength={160}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workAreaKind">Type</Label>
                    <NativeSelect
                      id="workAreaKind"
                      name="kind"
                      defaultValue="area"
                      className="h-11"
                    >
                      {WORK_AREA_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {WORK_AREA_LABELS[kind]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workAreaNotes">Notes</Label>
                    <Textarea
                      id="workAreaNotes"
                      name="notes"
                      rows={2}
                      maxLength={2000}
                    />
                  </div>
                </div>
                <SubmitButton className="min-h-11" pendingLabel="Adding area…">
                  Add work area
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <ClipboardCheckIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                      Checklists and assignments for the crew.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {completedTasks}/{tasks.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <Progress
                  value={taskProgress}
                  className="mb-5"
                  aria-label="Job task completion"
                >
                  <ProgressLabel>Task completion</ProgressLabel>
                  <ProgressValue />
                </Progress>
              ) : null}
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job tasks yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="space-y-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {task.status === "done" ? (
                          <CheckCircle2Icon
                            className="mt-0.5 size-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : (
                          <CircleIcon
                            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        <p
                          className={
                            task.status === "done"
                              ? "font-medium text-muted-foreground line-through"
                              : "font-medium"
                          }
                        >
                          {task.title}
                        </p>
                      </div>
                      <form action={saveJobWorkspaceTask} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`taskTitle-${task.id}`}>Title</Label>
                          <Input
                            id={`taskTitle-${task.id}`}
                            name="title"
                            className="h-11"
                            defaultValue={task.title}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`taskAssignee-${task.id}`}>Assignee</Label>
                          <Input
                            id={`taskAssignee-${task.id}`}
                            name="assignee"
                            className="h-11"
                            defaultValue={task.assignee ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`taskDue-${task.id}`}>Due</Label>
                          <Input
                            id={`taskDue-${task.id}`}
                            name="dueAt"
                            type="datetime-local"
                            className="h-11"
                            defaultValue={datetimeLocalValue(task.dueAt)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor={`taskArea-${task.id}`}>Work area</Label>
                          <NativeSelect
                            id={`taskArea-${task.id}`}
                            name="workAreaId"
                            defaultValue={task.workAreaId ?? ""}
                            className="h-11"
                          >
                            <option value="">Whole job</option>
                            {areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <SubmitButton className="min-h-11">Save task</SubmitButton>
                      </form>
                      <div className="flex flex-wrap gap-2">
                        <form action={setJobWorkspaceTaskStatus}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={task.status === "done" ? "open" : "done"}
                          />
                          <SubmitButton
                            className="min-h-11"
                            pendingLabel={task.status === "done" ? "Reopening…" : "Completing…"}
                          >
                            {task.status === "done" ? "Reopen" : "Complete"}
                          </SubmitButton>
                        </form>
                        <form action={removeJobWorkspaceTask}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={addJobWorkspaceTask}
                className="mt-5 space-y-4 rounded-lg border border-dashed p-4"
              >
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2">
                  <Label htmlFor="jobTaskTitle">
                    New task <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="jobTaskTitle"
                    name="title"
                    className="h-11"
                    maxLength={160}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobTaskAssignee">Assignee</Label>
                    <Input
                      id="jobTaskAssignee"
                      name="assignee"
                      className="h-11"
                      maxLength={160}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTaskDueAt">Due</Label>
                    <Input
                      id="jobTaskDueAt"
                      name="dueAt"
                      type="datetime-local"
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTaskWorkArea">Work area</Label>
                  <NativeSelect
                    id="jobTaskWorkArea"
                    name="workAreaId"
                    defaultValue=""
                    className="h-11"
                  >
                    <option value="">Whole job</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <SubmitButton className="min-h-11" pendingLabel="Adding task…">
                  Add task
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <FileTextIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Plans and documents</CardTitle>
                  <CardDescription>
                    Blueprints, diagrams, and field photos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans or photos have been uploaded to this job.
                </p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((document) => (
                    <li
                      key={document.id}
                      className="space-y-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <FileTextIcon
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="break-all font-medium">
                            {document.filename}
                          </p>
                          <p className="text-sm text-muted-foreground">
                          {` · ${formatFileSize(document.sizeBytes)}`}
                          {` · ${document.uploadedBy}`}
                          </p>
                        </div>
                      </div>
                      <form action={saveJobDocumentMeta} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="documentId" value={document.id} />
                        <div className="space-y-2">
                          <Label htmlFor={`docKind-${document.id}`}>Type</Label>
                          <NativeSelect
                            id={`docKind-${document.id}`}
                            name="kind"
                            defaultValue={document.kind}
                            className="h-11"
                          >
                            {JOB_DOCUMENT_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {JOB_DOCUMENT_LABELS[kind]}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`docArea-${document.id}`}>Work area</Label>
                          <NativeSelect
                            id={`docArea-${document.id}`}
                            name="workAreaId"
                            defaultValue={document.workAreaId ?? ""}
                            className="h-11"
                          >
                            <option value="">Whole job</option>
                            {areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <SubmitButton className="min-h-11">Save document</SubmitButton>
                      </form>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={jobDocumentHref(job.id, document.id)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          Open file
                          <ExternalLinkIcon className="size-4" aria-hidden="true" />
                        </a>
                        <form action={removeJobDocument}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="documentId" value={document.id} />
                          <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 rounded-lg border border-dashed p-4">
                <JobDocumentUploader
                  jobId={job.id}
                  areas={areas.map(({ id: areaId, name }) => ({
                    id: areaId,
                    name,
                  }))}
                  storageMode={documentStorageMode}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <ClipboardCheckIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Field log</CardTitle>
                  <CardDescription>
                    Notes, quantities, blockers, and daily reports from the crew.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No field entries match these filters.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((note) => (
                    <li key={note.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                      <p className="text-sm text-muted-foreground">
                        {note.createdBy}
                        {areaName(note.workAreaId) ? ` · ${areaName(note.workAreaId)}` : ""}
                        {taskTitleLookup(tasks, note.taskId)
                          ? ` · ${taskTitleLookup(tasks, note.taskId)}`
                          : ""}
                        {` · ${note.createdAt.toLocaleString("en-CA")}`}
                      </p>
                      <form action={saveJobFieldEntry} className="space-y-3">
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="returnTo" value={`/app/jobs/${job.id}`} />
                        <NativeSelect name="kind" defaultValue={note.kind} className="h-11">
                          {FIELD_NOTE_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                              {FIELD_NOTE_LABELS[kind]}
                            </option>
                          ))}
                        </NativeSelect>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            name="quantity"
                            className="h-11"
                            defaultValue={note.quantity?.toString() ?? ""}
                            placeholder="Quantity"
                          />
                          <NativeSelect name="unit" defaultValue={note.unit ?? "board_feet"} className="h-11">
                            {FIELD_QUANTITY_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {FIELD_QUANTITY_LABELS[unit]}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <NativeSelect name="workAreaId" defaultValue={note.workAreaId ?? ""} className="h-11">
                            <option value="">Whole job</option>
                            {areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.name}
                              </option>
                            ))}
                          </NativeSelect>
                          <NativeSelect name="taskId" defaultValue={note.taskId ?? ""} className="h-11">
                            <option value="">No task</option>
                            {tasks.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.title}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <Textarea name="body" rows={3} defaultValue={note.body} required />
                        <SubmitButton className="min-h-11">Save field entry</SubmitButton>
                      </form>
                      <form action={removeJobFieldEntry}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="returnTo" value={`/app/jobs/${job.id}`} />
                        <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                          Delete entry
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <ActivityIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Activity</CardTitle>
                  <CardDescription>
                    Attributable changes for this job.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job activity has been recorded yet.</p>
              ) : (
                <ol className="space-y-3">
                  {events.map((event) => (
                    <li key={event.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor} · {event.createdAt.toLocaleString("en-CA")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <UsersIcon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Field status</CardTitle>
                <CardDescription>
                  Keep the office and crew aligned.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form action={saveJobStatus} className="space-y-4">
              <input type="hidden" name="jobId" value={job.id} />
              <div className="space-y-2">
                <Label htmlFor="status">Job status</Label>
                <NativeSelect
                  id="status"
                  name="status"
                  defaultValue={job.status}
                  className="h-11"
                >
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {JOB_STATUS_LABELS[status]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockerNote">Blocker note</Label>
                <Textarea
                  id="blockerNote"
                  name="blockerNote"
                  rows={4}
                  defaultValue={job.blockerNote ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Required only when the job is blocked.
                </p>
              </div>
              <SubmitButton
                variant="default"
                className="min-h-11 w-full"
                pendingLabel="Saving status…"
              >
                Save status
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
