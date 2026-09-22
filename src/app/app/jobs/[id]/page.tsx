import {
  ActivityIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MapPinnedIcon,
  NotebookPenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyDraftButton } from "@/components/ops/copy-draft-button";
import { JobAiPanel } from "@/components/ops/job-ai-panel";
import { ScheduleDiffPanel } from "@/components/ops/schedule-diff-panel";
import { TranscriptRecordPanel } from "@/components/ops/transcript-record-panel";
import { TaskCommandPanel } from "@/components/ops/task-command-panel";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { TaskStatusButton } from "@/components/ops/task-status-button";
import { ActionForm } from "@/components/ops/action-form";
import { DetailList } from "@/components/ops/detail-list";
import { EmptyState } from "@/components/ops/empty-state";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { FormDialog } from "@/components/ops/form-dialog";
import { JobDocumentUploader } from "@/components/ops/job-document-uploader";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { RealtimeRefresh } from "@/components/ops/realtime-refresh";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  formatFieldQuantity,
} from "@/lib/ops/field-workspace";
import { buildMaterialPickList } from "@/lib/ops/material-pick-list";
import {
  formatStatedQuantity,
  listQuantityPaceWarnings,
  quantityPaceLabel,
} from "@/lib/ops/quantity-pace";
import {
  acceptedScheduleDiffNoteId,
  proposeScheduleDiff,
} from "@/lib/ops/schedule-diff";
import { newestTaskCommand } from "@/lib/ops/task-command";
import {
  listTranscriptRecords,
  savedTranscriptSelections,
} from "@/lib/ops/transcript-record";
import {
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  formatJobNumber,
} from "@/lib/ops/jobs";
import {
  JOB_DOCUMENT_KINDS,
  JOB_DOCUMENT_LABELS,
  WORK_AREA_LABELS,
  formatFileSize,
  jobDocumentHref,
} from "@/lib/ops/job-workspace";
import { officePlanHref } from "@/lib/ops/plan-markup";
import {
  JOB_ASSIGNMENT_ROLES,
  JOB_ASSIGNMENT_ROLE_LABELS,
  type JobAssignmentRole,
} from "@/lib/ops/identity";
import {
  getCompany,
  getJob,
  getOpportunity,
  getProject,
  getSite,
  listJobDocuments,
  listJobEvents,
  listJobFieldNotes,
  listJobVoiceNotes,
  listJobAssignments,
  listJobTasks,
  listActiveFieldUsers,
  listProjectJobTasks,
  listProjectTaskDependencies,
  listWorkAreas,
  resolveProjectScheduleCalendar,
} from "@/lib/ops/store";
import { formatRequestNumber, formatServices } from "@/lib/ops/workflow";
import {
  addJobFieldEntry,
  addJobVoiceEntry,
  assignFieldUserToJob,
  addJobWorkArea,
  addJobWorkspaceTask,
  removeJob,
  removeJobDocument,
  extractJobVoiceEntry,
  removeJobFieldEntry,
  removeJobVoiceEntry,
  removeJobWorkArea,
  removeJobWorkspaceTask,
  saveJobDetails,
  saveJobDocumentMeta,
  saveJobFieldEntry,
  saveJobVoiceTranscript,
  saveJobStatus,
  saveJobWorkArea,
  saveJobWorkspaceTask,
  setJobWorkspaceTaskStatus,
  unassignFieldUserFromJob,
} from "../actions";
import { VoiceNotesPanel } from "@/components/ops/voice-notes-panel";
import { voiceConsentCopy } from "@/lib/ops/voice-notes";
import { JobFormFields } from "../job-form-fields";
import {
  DocumentMetaFields,
  FieldEntryFields,
  TaskFields,
  WorkAreaFields,
} from "../workspace-fields";

export const dynamic = "force-dynamic";

function formatWhen(value: Date | null): string {
  return value ? value.toLocaleString("en-CA") : "—";
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
      {children}
    </span>
  );
}

function RowDeleteButton({ label = "Delete" }: { label?: string }) {
  return (
    <SubmitButton
      variant="ghost"
      className="min-h-11 text-muted-foreground hover:text-destructive md:min-h-8"
      pendingLabel="Deleting…"
    >
      <Trash2Icon aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </SubmitButton>
  );
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    taskStatus?: string;
    noteKind?: string;
    docKind?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await getOpsSession();
  if (!session) {
    redirect("/app/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const [
    project,
    company,
    site,
    opportunity,
    events,
    areas,
    tasks,
    documents,
    notes,
    voiceNotes,
    assignments,
    fieldUsers,
    materialNotes,
    quantityNotes,
    scheduleNotes,
    projectTasks,
    projectDependencies,
    scheduleCalendar,
    commandTasks,
  ] =
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
      listJobVoiceNotes(job.id),
      listJobAssignments(job.id),
      listActiveFieldUsers(),
      listJobFieldNotes(job.id, { kind: "material_request" }),
      listJobFieldNotes(job.id, { kind: "quantity" }),
      job.projectId ? listJobFieldNotes(job.id) : Promise.resolve([]),
      job.projectId ? listProjectJobTasks(job.projectId) : Promise.resolve(null),
      job.projectId
        ? listProjectTaskDependencies(job.projectId)
        : Promise.resolve(null),
      job.projectId
        ? resolveProjectScheduleCalendar(job.projectId)
        : Promise.resolve(null),
      listJobTasks(job.id),
    ]);

  const paceWarnings = listQuantityPaceWarnings({
    jobs: [{ id: job.id, name: job.name }],
    tasks: commandTasks,
    quantities: quantityNotes,
  });
  const returnTo = `/app/jobs/${job.id}`;
  const areaOptions = areas.map(({ id: areaId, name }) => ({ id: areaId, name }));
  const taskOptions = tasks.map(({ id: taskId, title }) => ({ id: taskId, title }));
  const fieldUserOptions = fieldUsers.map((user) => ({
    id: user.userId,
    name: user.displayName,
  }));
  const areaName = (workAreaId: string | null) =>
    areas.find((area) => area.id === workAreaId)?.name;
  const taskTitle = (taskId: string | null) =>
    tasks.find((task) => task.id === taskId)?.title;
  const materialPickList = buildMaterialPickList(materialNotes);
  const taskUndos = commandTasks.flatMap((task) => {
    const command = newestTaskCommand(events, task.id);
    if (!command || command.afterUpdatedAt !== task.updatedAt.toISOString()) {
      return [];
    }
    return [{ taskId: task.id, title: task.title, effect: command.effect }];
  });
  const acceptedScheduleNotes = new Set(
    events.flatMap((event) => {
      const noteId = acceptedScheduleDiffNoteId(event);
      return noteId ? [noteId] : [];
    }),
  );
  const scheduleProposals =
    projectTasks &&
    projectDependencies &&
    scheduleCalendar &&
    !projectTasks.truncated &&
    !projectDependencies.truncated
      ? scheduleNotes.flatMap((note) => {
          if (acceptedScheduleNotes.has(note.id)) return [];
          const proposal = proposeScheduleDiff({
            note,
            tasks: projectTasks.tasks,
            edges: projectDependencies.edges,
            calendar: scheduleCalendar,
          });
          return proposal ? [proposal] : [];
        })
      : [];
  const transcriptProposals = voiceNotes.flatMap((note) => {
    if (note.status !== "completed" || !note.transcript?.trim()) return [];
    const saved = savedTranscriptSelections(events, note.id);
    return listTranscriptRecords({
      voiceNoteId: note.id,
      filename: note.filename,
      transcript: note.transcript,
      savedTexts: saved.texts,
      legacyExtracted: saved.legacy,
      tasks: commandTasks,
    });
  });
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const taskProgress =
    tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  const documentStorageMode = isDemoOpsStore()
    ? "demo"
    : process.env.BLOB_READ_WRITE_TOKEN
      ? "blob"
      : "unavailable";
  const isFiltered = Boolean(
    query.taskStatus || query.noteKind || query.docKind || query.from || query.to,
  );

  return (
    <div className="space-y-6">
      <RealtimeRefresh url={`/api/ops/events?jobId=${job.id}`} />
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
            <FormDialog
              triggerLabel="Edit job"
              triggerIcon={<PencilIcon aria-hidden="true" />}
              triggerVariant="outline"
              title="Edit job"
              description="Name, scope, crew, and planned dates."
            >
              <ActionForm action={saveJobDetails} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <JobFormFields
                  idPrefix="editJob"
                  defaults={{
                    jobName: job.name,
                    scope: job.scope ?? "",
                    projectManager: job.projectManager,
                    foreman: job.foreman,
                    plannedStartAt: datetimeLocalValue(job.plannedStartAt),
                    plannedEndAt: datetimeLocalValue(job.plannedEndAt),
                  }}
                />
                <div className="sm:col-span-2">
                  <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                    Save job
                  </SubmitButton>
                </div>
              </ActionForm>
            </FormDialog>
            <Button
              variant="outline"
              className="min-h-11 md:min-h-8"
              nativeButton={false}
              render={<Link href={`/field/jobs/${job.id}`} />}
            >
              Open field view
            </Button>
          </div>
        }
      />

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
        {isFiltered ? (
          <Link
            href={returnTo}
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear
          </Link>
        ) : null}
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
                <SectionIcon>
                  <CalendarDaysIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle>Job brief</CardTitle>
                  <CardDescription>
                    Scope, schedule, customer, and field leadership.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  {
                    label: "Project",
                    value: project ? (
                      <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                    ) : null,
                  },
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
                    value: opportunity?.sourceLeadId ? (
                      <Link
                        href={`/app/requests/${opportunity.sourceLeadId}`}
                        className="font-medium hover:underline"
                      >
                        {formatRequestNumber(opportunity.sourceLeadId)}
                      </Link>
                    ) : null,
                  },
                  {
                    label: "Services",
                    value: formatServices(job.services),
                  },
                  {
                    label: "Scope",
                    value: job.scope ? <span className="whitespace-pre-wrap">{job.scope}</span> : null,
                  },
                  {
                    label: "Planned",
                    value: `${formatWhen(job.plannedStartAt)} → ${formatWhen(job.plannedEndAt)}`,
                  },
                  {
                    label: "Crew",
                    value: (
                      <>
                        <span>PM: {job.projectManager ?? "Unassigned"}</span>
                        <br />
                        <span>Foreman: {job.foreman ?? "Unassigned"}</span>
                      </>
                    ),
                  },
                ]}
              />
              {job.status === "blocked" && job.blockerNote ? (
                <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Blocked: {job.blockerNote}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <UsersIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle>Field assignments</CardTitle>
                  <CardDescription>
                    Only assigned field workers can open this job in Field.
                    Planned dates are shared with their assignment immediately.
                  </CardDescription>
                </div>
              </div>
              {fieldUserOptions.length > 0 ? (
                <CardAction>
                  <FormDialog
                    triggerLabel="Assign worker"
                    triggerIcon={<PlusIcon aria-hidden="true" />}
                    triggerVariant="outline"
                    title="Assign a field worker"
                    description="The worker will see this job and its current schedule in Field."
                  >
                    <ActionForm
                      action={assignFieldUserToJob}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <div className="space-y-2">
                        <Label htmlFor="assignment-user">Field worker</Label>
                        <NativeSelect
                          id="assignment-user"
                          name="userId"
                          className="h-11"
                          required
                        >
                          <option value="">Choose a worker</option>
                          {fieldUserOptions.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assignment-role">Role</Label>
                        <NativeSelect
                          id="assignment-role"
                          name="assignmentRole"
                          className="h-11"
                          defaultValue="technician"
                        >
                          {JOB_ASSIGNMENT_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {JOB_ASSIGNMENT_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="sm:col-span-2">
                        <SubmitButton
                          className="min-h-11 w-full sm:w-auto"
                          pendingLabel="Assigning…"
                        >
                          Assign worker
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  </FormDialog>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon aria-hidden="true" />}
                  title="No field workers assigned"
                  description={
                    fieldUserOptions.length > 0
                      ? "Assign a worker before moving this job to Scheduled."
                      : "Create a Field user first, then return here to assign them."
                  }
                  action={
                    fieldUserOptions.length === 0 ? (
                      <Link
                        href="/app/users"
                        className="text-sm font-medium underline underline-offset-4"
                      >
                        Manage users
                      </Link>
                    ) : null
                  }
                />
              ) : (
                <ul className="divide-y">
                  {assignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex min-h-14 items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-medium">{assignment.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {
                            JOB_ASSIGNMENT_ROLE_LABELS[
                              assignment.role as JobAssignmentRole
                            ]
                          }{" "}
                          · {assignment.email}
                          {!assignment.active ? " · Inactive" : ""}
                        </p>
                      </div>
                      <ConfirmForm
                        action={unassignFieldUserFromJob}
                        message={`Remove ${assignment.displayName} from this job?`}
                      >
                        <input type="hidden" name="jobId" value={job.id} />
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={assignment.id}
                        />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <RowDeleteButton label="Unassign" />
                      </ConfirmForm>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <MapPinnedIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle>Work areas</CardTitle>
                  <CardDescription>
                    Rooms, floors, units, zones, or phases on this job.
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <FormDialog
                  triggerLabel="Add work area"
                  triggerIcon={<PlusIcon aria-hidden="true" />}
                  triggerVariant="outline"
                  title="Add a work area"
                  description="Tasks, plans, and field entries can be pinned to a work area."
                >
                  <ActionForm action={addJobWorkArea} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <WorkAreaFields idPrefix="newArea" />
                    <div className="sm:col-span-2">
                      <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto" pendingLabel="Adding area…">
                        Add work area
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </FormDialog>
              </CardAction>
            </CardHeader>
            <CardContent>
              {areas.length === 0 ? (
                <EmptyState
                  icon={<MapPinnedIcon aria-hidden="true" />}
                  title="No work areas yet"
                  description="Add one before assigning tasks or plans to a specific location."
                  className="py-6"
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {areas.map((area) => (
                    <li
                      key={area.id}
                      className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{area.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {WORK_AREA_LABELS[area.kind as keyof typeof WORK_AREA_LABELS] ?? area.kind}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <FormDialog
                            triggerLabel="Edit"
                            triggerIcon={<PencilIcon aria-hidden="true" />}
                            triggerVariant="ghost"
                            triggerAriaLabel={`Edit ${area.name}`}
                            title="Edit work area"
                          >
                            <ActionForm action={saveJobWorkArea} className="grid gap-3 sm:grid-cols-2">
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="workAreaId" value={area.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <WorkAreaFields idPrefix={`area-${area.id}`} defaults={area} />
                              <div className="sm:col-span-2">
                                <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                                  Save area
                                </SubmitButton>
                              </div>
                            </ActionForm>
                          </FormDialog>
                          <ConfirmForm
                            action={removeJobWorkArea}
                            message={`Delete ${area.name}? Tasks, files, and entries pinned to it will move to the whole job.`}
                          >
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="workAreaId" value={area.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <RowDeleteButton />
                          </ConfirmForm>
                        </div>
                      </div>
                      {area.notes ? (
                        <p className="text-sm text-muted-foreground">{area.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card id="tasks">
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <ClipboardCheckIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>
                    Checklists and assignments for the crew.
                  </CardDescription>
                </div>
              </div>
              <CardAction className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  {completedTasks}/{tasks.length}
                </Badge>
                <FormDialog
                  triggerLabel="Add task"
                  triggerIcon={<PlusIcon aria-hidden="true" />}
                  triggerVariant="outline"
                  title="Add a task"
                  description="Crews can complete tasks from the field view."
                >
                  <ActionForm action={addJobWorkspaceTask} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <TaskFields
                      idPrefix="newTask"
                      areas={areaOptions}
                      fieldUsers={fieldUserOptions}
                    />
                    <div className="sm:col-span-2">
                      <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto" pendingLabel="Adding task…">
                        Add task
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </FormDialog>
              </CardAction>
            </CardHeader>
            <CardContent>
              {paceWarnings.map((warning) => (
                <p key={warning.unit} className="mb-4 text-sm" role="status">
                  {quantityPaceLabel(warning, { includeJob: false })}
                </p>
              ))}
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
                <EmptyState
                  icon={<ClipboardCheckIcon aria-hidden="true" />}
                  title={isFiltered ? "No tasks match these filters" : "No tasks yet"}
                  description={
                    isFiltered
                      ? "Clear the filters to see every task."
                      : "Break the scope into steps the crew can check off on site."
                  }
                  className="py-6"
                />
              ) : (
                <ul className="divide-y">
                  {tasks.map((task) => (
                    <li
                      id={`task-${task.id}`}
                      key={task.id}
                      className="scroll-mt-24 flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
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
                        <div className="min-w-0">
                          <p
                            className={
                              task.status === "done"
                                ? "font-medium text-muted-foreground line-through"
                                : "font-medium"
                            }
                          >
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {task.assignee ?? "Unassigned"}
                            {areaName(task.workAreaId) ? ` · ${areaName(task.workAreaId)}` : ""}
                            {task.status !== "done" &&
                            formatStatedQuantity(task.statedQuantity, task.statedUnit)
                              ? ` · ${formatStatedQuantity(task.statedQuantity, task.statedUnit)}`
                              : ""}
                            {task.dueAt ? ` · due ${task.dueAt.toLocaleString("en-CA")}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <TaskStatusButton
                          action={setJobWorkspaceTaskStatus}
                          jobId={job.id}
                          taskId={task.id}
                          status={task.status === "done" ? "done" : "open"}
                          returnTo={returnTo}
                        />
                        <FormDialog
                          triggerLabel="Edit"
                          triggerIcon={<PencilIcon aria-hidden="true" />}
                          triggerVariant="ghost"
                          triggerAriaLabel={`Edit ${task.title}`}
                          title="Edit task"
                        >
                          <ActionForm action={saveJobWorkspaceTask} className="grid gap-3 sm:grid-cols-2">
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <TaskFields
                              idPrefix={`task-${task.id}`}
                              areas={areaOptions}
                              fieldUsers={fieldUserOptions}
                              defaults={{
                                title: task.title,
                                assignee: task.assignee,
                                assigneeUserId: task.assigneeUserId,
                                dueAt: datetimeLocalValue(task.dueAt),
                                plannedStartAt: datetimeLocalValue(
                                  task.plannedStartAt,
                                ),
                                plannedEndAt: datetimeLocalValue(
                                  task.plannedEndAt,
                                ),
                                workAreaId: task.workAreaId,
                                statedQuantity: task.statedQuantity,
                                statedUnit: task.statedUnit,
                              }}
                            />
                            <div className="sm:col-span-2">
                              <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                                Save task
                              </SubmitButton>
                            </div>
                          </ActionForm>
                        </FormDialog>
                        <ConfirmForm
                          action={removeJobWorkspaceTask}
                          message={`Delete task “${task.title}”? This cannot be undone.`}
                        >
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <RowDeleteButton />
                        </ConfirmForm>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <TaskCommandPanel
            jobId={job.id}
            tasks={commandTasks.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status,
            }))}
            undos={taskUndos}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <FileTextIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle id="plan">Plans and documents</CardTitle>
                  <CardDescription>
                    Blueprints, diagrams, and field photos. Place pins on the
                    plan so the crew can tap completed work.
                  </CardDescription>
                </div>
              </div>
              <CardAction className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 md:min-h-8"
                  nativeButton={false}
                  render={<Link href={officePlanHref(job.id)} />}
                >
                  Mark on plan
                </Button>
                <FormDialog
                  triggerLabel="Upload file"
                  triggerIcon={<UploadCloudIcon aria-hidden="true" />}
                  triggerVariant="outline"
                  title="Upload plans or photos"
                  description="Select many files at once. PDF, JPEG, PNG, or WebP up to 25 MB each."
                >
                  <JobDocumentUploader
                    jobId={job.id}
                    areas={areaOptions}
                    storageMode={documentStorageMode}
                    returnTo={`/app/jobs/${job.id}`}
                  />
                </FormDialog>
              </CardAction>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <EmptyState
                  icon={<FileTextIcon aria-hidden="true" />}
                  title={isFiltered ? "No files match these filters" : "No plans or photos yet"}
                  description={
                    isFiltered
                      ? "Clear the filters to see every file."
                      : "Upload the plan set so the crew can open it from the field view."
                  }
                  className="py-6"
                />
              ) : (
                <ul className="divide-y">
                  {documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <FileTextIcon
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="break-all font-medium">{document.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {JOB_DOCUMENT_LABELS[document.kind as keyof typeof JOB_DOCUMENT_LABELS] ??
                              document.kind}
                            {areaName(document.workAreaId) ? ` · ${areaName(document.workAreaId)}` : ""}
                            {` · ${formatFileSize(document.sizeBytes)}`}
                            {` · ${document.uploadedBy}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {document.kind === "plan" ? (
                          <Button
                            variant="outline"
                            className="min-h-11 md:min-h-8"
                            nativeButton={false}
                            render={
                              <Link href={officePlanHref(job.id, document.id)} />
                            }
                          >
                            Marks
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="min-h-11 md:min-h-8"
                          nativeButton={false}
                          render={<a href={jobDocumentHref(job.id, document.id)} />}
                        >
                          Open
                          <ExternalLinkIcon aria-hidden="true" />
                        </Button>
                        {document.kind === "plan" ? (
                          <Badge variant="outline">Revision retained</Badge>
                        ) : (
                          <>
                            <FormDialog
                              triggerLabel="Edit"
                              triggerIcon={<PencilIcon aria-hidden="true" />}
                              triggerVariant="ghost"
                              triggerAriaLabel={`Edit ${document.filename}`}
                              title="Edit document"
                              description={document.filename}
                            >
                              <ActionForm action={saveJobDocumentMeta} className="grid gap-3 sm:grid-cols-2">
                                <input type="hidden" name="jobId" value={job.id} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <DocumentMetaFields
                                  idPrefix={`doc-${document.id}`}
                                  areas={areaOptions}
                                  defaults={document}
                                  allowPlan={false}
                                />
                                <div className="sm:col-span-2">
                                  <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                                    Save document
                                  </SubmitButton>
                                </div>
                              </ActionForm>
                            </FormDialog>
                            <ConfirmForm
                              action={removeJobDocument}
                              message={`Delete ${document.filename}? The file is removed permanently.`}
                            >
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="documentId" value={document.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <RowDeleteButton />
                            </ConfirmForm>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card id="field-log">
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <NotebookPenIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle>Field log</CardTitle>
                  <CardDescription>
                    Notes, quantities, blockers, and daily reports from the crew.
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <FormDialog
                  triggerLabel="Add entry"
                  triggerIcon={<PlusIcon aria-hidden="true" />}
                  triggerVariant="outline"
                  title="Add a field entry"
                  description="Reporting a blocker also marks the job blocked."
                >
                  <ActionForm action={addJobFieldEntry} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <FieldEntryFields idPrefix="newEntry" areas={areaOptions} tasks={taskOptions} />
                    <div className="sm:col-span-2">
                      <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto" pendingLabel="Saving entry…">
                        Save entry
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </FormDialog>
              </CardAction>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <EmptyState
                  icon={<NotebookPenIcon aria-hidden="true" />}
                  title={isFiltered ? "No entries match these filters" : "No field entries yet"}
                  description={
                    isFiltered
                      ? "Clear the filters to see every entry."
                      : "Entries logged from the field view show up here for the office."
                  }
                  className="py-6"
                />
              ) : (
                <ul className="divide-y">
                  {notes.map((note) => (
                    <li key={note.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={note.kind === "blocker" ? "destructive" : "outline"}>
                              {FIELD_NOTE_LABELS[note.kind as keyof typeof FIELD_NOTE_LABELS] ?? note.kind}
                            </Badge>
                            {formatFieldQuantity(note.quantity, note.unit) ? (
                              <span className="text-sm font-medium tabular-nums">
                                {formatFieldQuantity(note.quantity, note.unit)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {note.createdBy}
                            {areaName(note.workAreaId) ? ` · ${areaName(note.workAreaId)}` : ""}
                            {taskTitle(note.taskId) ? ` · ${taskTitle(note.taskId)}` : ""}
                            {` · ${note.createdAt.toLocaleString("en-CA")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <FormDialog
                            triggerLabel="Edit"
                            triggerIcon={<PencilIcon aria-hidden="true" />}
                            triggerVariant="ghost"
                            triggerAriaLabel="Edit field entry"
                            title="Edit field entry"
                          >
                            <ActionForm action={saveJobFieldEntry} className="grid gap-3 sm:grid-cols-2">
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="noteId" value={note.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <FieldEntryFields
                                idPrefix={`note-${note.id}`}
                                areas={areaOptions}
                                tasks={taskOptions}
                                defaults={{
                                  kind: note.kind,
                                  quantity: note.quantity?.toString() ?? "",
                                  unit: note.unit,
                                  workAreaId: note.workAreaId,
                                  taskId: note.taskId,
                                  body: note.body,
                                }}
                              />
                              <div className="sm:col-span-2">
                                <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                                  Save entry
                                </SubmitButton>
                              </div>
                            </ActionForm>
                          </FormDialog>
                          <ConfirmForm
                            action={removeJobFieldEntry}
                            message="Delete this field entry? This cannot be undone."
                          >
                            <input type="hidden" name="jobId" value={job.id} />
                            <input type="hidden" name="noteId" value={note.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <RowDeleteButton />
                          </ConfirmForm>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <ScheduleDiffPanel jobId={job.id} proposals={scheduleProposals} />

          <Card>
            <CardHeader>
              <CardTitle>Material pick list</CardTitle>
              <CardDescription>
                Open material requests on this job. Copy the list. It does not create a purchase order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {materialPickList.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open material requests.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {materialPickList.lines.map((line) => (
                    <li key={line.ids[0]}>
                      {line.text}
                      {line.count > 1 ? ` (×${line.count})` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <CopyDraftButton text={materialPickList.draft} />
            </CardContent>
          </Card>

          <TranscriptRecordPanel jobId={job.id} proposals={transcriptProposals} />

          <JobAiPanel jobId={job.id} />

          <VoiceNotesPanel
            jobId={job.id}
            notes={voiceNotes}
            scope="office"
            returnTo={returnTo}
            sessionEmail={session.email}
            canDeleteAll
            consentCopy={voiceConsentCopy()}
            recordAction={addJobVoiceEntry}
            updateAction={saveJobVoiceTranscript}
            extractAction={extractJobVoiceEntry}
            deleteAction={removeJobVoiceEntry}
            areas={areaOptions}
            tasks={taskOptions.map(({ id: taskId, title }) => ({
              id: taskId,
              name: title,
            }))}
            documents={documents.map((document) => ({
              id: document.id,
              name: document.filename,
            }))}
            areaName={areaName}
            taskTitle={taskTitle}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionIcon>
                  <ActivityIcon aria-hidden="true" />
                </SectionIcon>
                <div>
                  <CardTitle id="activity">Activity</CardTitle>
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

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle>Remove job</CardTitle>
              <CardDescription>
                Deletes this job with its work areas, tasks, files, and field log.
              </CardDescription>
              <CardAction>
                <ConfirmForm
                  action={removeJob}
                  message={`Delete ${formatJobNumber(job.id)} and everything attached to it? This cannot be undone.`}
                >
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton variant="destructive" className="min-h-11 md:min-h-8" pendingLabel="Deleting…">
                    <Trash2Icon aria-hidden="true" />
                    Delete job
                  </SubmitButton>
                </ConfirmForm>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon>
                <UsersIcon aria-hidden="true" />
              </SectionIcon>
              <div>
                <CardTitle>Field status</CardTitle>
                <CardDescription>
                  Keep the office and crew aligned.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveJobStatus} className="space-y-4">
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
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
