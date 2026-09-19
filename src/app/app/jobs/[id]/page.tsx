import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
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
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import {
  addJobWorkArea,
  addJobWorkspaceTask,
  saveJobStatus,
  setJobWorkspaceTaskStatus,
  uploadJobDocument,
} from "../actions";

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

  const [project, company, site, opportunity, events, areas, tasks, documents] =
    await Promise.all([
      job.projectId ? getProject(job.projectId) : null,
      job.companyId ? getCompany(job.companyId) : null,
      job.siteId ? getSite(job.siteId) : null,
      job.opportunityId ? getOpportunity(job.opportunityId) : null,
      listJobEvents(job.id),
      listWorkAreas(job.id),
      listJobTasks(job.id),
      listJobDocuments(job.id),
    ]);

  const areaName = (workAreaId: string | null) =>
    areas.find((area) => area.id === workAreaId)?.name;

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
          <StatusBadge
            status={job.status}
            label={JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
          />
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Job saved." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work areas</CardTitle>
              <CardDescription>
                Rooms, floors, units, zones, or phases on this job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No work areas yet. Add one before assigning tasks or plans to a
                  specific location.
                </p>
              ) : (
                <ul className="space-y-3">
                  {areas.map((area) => (
                    <li
                      key={area.id}
                      className="border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <p className="font-medium">{area.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {WORK_AREA_LABELS[
                          area.kind as keyof typeof WORK_AREA_LABELS
                        ] ?? area.kind}
                        {area.notes ? ` · ${area.notes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addJobWorkArea} className="mt-5 space-y-3">
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2">
                  <Label htmlFor="workAreaName">New work area</Label>
                  <Input id="workAreaName" name="name" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workAreaKind">Type</Label>
                    <NativeSelect
                      id="workAreaKind"
                      name="kind"
                      defaultValue="area"
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
                    <Input id="workAreaNotes" name="notes" />
                  </div>
                </div>
                <Button type="submit" variant="outline">
                  Add work area
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                Checklists and assignments for the crew on this job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job tasks yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">
                          {task.status === "done" ? (
                            <span className="mr-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              Done
                            </span>
                          ) : (
                            <span className="mr-2 text-xs uppercase tracking-[0.12em] text-primary">
                              Open
                            </span>
                          )}{" "}
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.assignee ?? "Unassigned"}
                          {areaName(task.workAreaId)
                            ? ` · ${areaName(task.workAreaId)}`
                            : ""}
                          {task.dueAt
                            ? ` · due ${task.dueAt.toLocaleString("en-CA")}`
                            : ""}
                        </p>
                      </div>
                      <form action={setJobWorkspaceTaskStatus}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={task.status === "done" ? "open" : "done"}
                        />
                        <button
                          type="submit"
                          className="h-8 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                        >
                          {task.status === "done" ? "Reopen" : "Complete"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addJobWorkspaceTask} className="mt-5 space-y-3">
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2">
                  <Label htmlFor="jobTaskTitle">New task</Label>
                  <Input id="jobTaskTitle" name="title" required />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobTaskAssignee">Assignee</Label>
                    <Input id="jobTaskAssignee" name="assignee" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTaskDueAt">Due</Label>
                    <Input
                      id="jobTaskDueAt"
                      name="dueAt"
                      type="datetime-local"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTaskWorkArea">Work area</Label>
                  <NativeSelect
                    id="jobTaskWorkArea"
                    name="workAreaId"
                    defaultValue=""
                  >
                    <option value="">Whole job</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button type="submit" variant="outline">
                  Add task
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plans and documents</CardTitle>
              <CardDescription>
                Upload blueprints, diagrams, or photos. Markup and speech notes
                come next.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans or photos have been uploaded to this job.
                </p>
              ) : (
                <ul className="space-y-3">
                  {documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <a
                          href={jobDocumentHref(job.id, document.id)}
                          className="font-medium hover:underline"
                        >
                          {document.filename}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {JOB_DOCUMENT_LABELS[
                            document.kind as keyof typeof JOB_DOCUMENT_LABELS
                          ] ?? document.kind}
                          {areaName(document.workAreaId)
                            ? ` · ${areaName(document.workAreaId)}`
                            : ""}
                          {` · ${formatFileSize(document.sizeBytes)}`}
                          {` · ${document.uploadedBy}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={uploadJobDocument}
                className="mt-5 space-y-3"
              >
                <input type="hidden" name="jobId" value={job.id} />
                <div className="space-y-2">
                  <Label htmlFor="jobDocumentFile">Upload file</Label>
                  <Input
                    id="jobDocumentFile"
                    name="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobDocumentKind">Type</Label>
                    <NativeSelect
                      id="jobDocumentKind"
                      name="kind"
                      defaultValue="plan"
                    >
                      {JOB_DOCUMENT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {JOB_DOCUMENT_LABELS[kind]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobDocumentWorkArea">Work area</Label>
                    <NativeSelect
                      id="jobDocumentWorkArea"
                      name="workAreaId"
                      defaultValue=""
                    >
                      <option value="">Whole job</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <Button type="submit" variant="outline">
                  Upload document
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>A blocker note is required when the job is blocked.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveJobStatus} className="space-y-4">
              <input type="hidden" name="jobId" value={job.id} />
              <div className="space-y-2">
                <Label htmlFor="status">Job status</Label>
                <NativeSelect id="status" name="status" defaultValue={job.status}>
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
              </div>
              <Button type="submit" className="w-full">
                Save status
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
