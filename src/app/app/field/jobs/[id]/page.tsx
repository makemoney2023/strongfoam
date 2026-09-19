import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangleIcon,
  CameraIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  MapPinIcon,
  NotebookPenIcon,
  PencilIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionForm } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { TaskStatusButton } from "@/components/ops/task-status-button";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { FormDialog } from "@/components/ops/form-dialog";
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
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import {
  FIELD_NOTE_KINDS,
  FIELD_NOTE_LABELS,
  formatFieldQuantity,
} from "@/lib/ops/field-workspace";
import { JOB_STATUS_LABELS, formatJobNumber } from "@/lib/ops/jobs";
import {
  JOB_DOCUMENT_KINDS,
  JOB_DOCUMENT_LABELS,
  formatFileSize,
  jobDocumentHref,
} from "@/lib/ops/job-workspace";
import {
  getCompany,
  getContact,
  getJob,
  getOpportunity,
  getSite,
  listContacts,
  listJobDocuments,
  listJobFieldNotes,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";
import {
  addJobFieldEntry,
  removeJobDocument,
  removeJobFieldEntry,
  removeJobWorkspaceTask,
  saveJobDocumentMeta,
  saveJobFieldEntry,
  setJobWorkspaceTaskStatus,
} from "../../../jobs/actions";
import { DocumentMetaFields, FieldEntryFields } from "../../../jobs/workspace-fields";

export const dynamic = "force-dynamic";

export default async function FieldJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    taskStatus?: string;
    kind?: string;
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

  const [company, site, opportunity, areas, tasks, documents, notes] =
    await Promise.all([
      job.companyId ? getCompany(job.companyId) : null,
      job.siteId ? getSite(job.siteId) : null,
      job.opportunityId ? getOpportunity(job.opportunityId) : null,
      listWorkAreas(job.id),
      listJobTasks(job.id, { status: query.taskStatus, from: query.from, to: query.to }),
      listJobDocuments(job.id, { kind: query.docKind, from: query.from, to: query.to }),
      listJobFieldNotes(job.id, { kind: query.kind, from: query.from, to: query.to }),
    ]);
  const contacts = company
    ? await listContacts(company.id)
    : opportunity?.contactId
      ? [await getContact(opportunity.contactId)].filter(Boolean)
      : [];
  const latestPlan = documents.find((document) => document.kind === "plan") ?? documents[0];
  const documentStorageMode = isDemoOpsStore()
    ? "demo"
    : process.env.BLOB_READ_WRITE_TOKEN
      ? "blob"
      : "unavailable";
  const areaName = (workAreaId: string | null) =>
    areas.find((area) => area.id === workAreaId)?.name;
  const taskTitle = (taskId: string | null) =>
    tasks.find((task) => task.id === taskId)?.title;
  const returnTo = `/app/field/jobs/${job.id}`;
  const areaOptions = areas.map(({ id: areaId, name }) => ({ id: areaId, name }));
  const taskOptions = tasks.map(({ id: taskId, title }) => ({ id: taskId, title }));

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[
          { href: "/app/field", label: "Field" },
          { label: formatJobNumber(job.id) },
        ]}
        title={job.name}
        description={formatJobNumber(job.id)}
        actions={
          <StatusBadge
            status={job.status}
            label={JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
          />
        }
      />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="taskStatus">Tasks</Label>
          <NativeSelect
            id="taskStatus"
            name="taskStatus"
            defaultValue={query.taskStatus ?? ""}
            className="h-11"
          >
            <option value="">All tasks</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Field entries</Label>
          <NativeSelect id="kind" name="kind" defaultValue={query.kind ?? ""} className="h-11">
            <option value="">All entries</option>
            {FIELD_NOTE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {FIELD_NOTE_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="docKind">Files</Label>
          <NativeSelect id="docKind" name="docKind" defaultValue={query.docKind ?? ""} className="h-11">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <MapPinIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Today&apos;s assignment</CardTitle>
              <CardDescription>Site, contacts, scope, and current blockers.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Site</p>
            <p className="mt-1 font-medium">
              {site
                ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}`
                : "Not assigned"}
            </p>
            <p className="text-sm text-muted-foreground">{company?.name ?? "No company"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Scope</p>
            <p className="mt-1">{job.scope || "—"}</p>
            <p className="text-sm text-muted-foreground">{formatServices(job.services)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Crew</p>
            <p className="mt-1">PM: {job.projectManager ?? "Unassigned"}</p>
            <p>Foreman: {job.foreman ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Contacts</p>
            {contacts.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No site contacts on this job.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {contacts.map((contact) =>
                  contact ? (
                    <li key={contact.id} className="rounded-lg border bg-muted/20 p-3">
                      <p className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.role ?? "Contact"}</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
                      >
                        <PhoneIcon className="size-4" aria-hidden="true" />
                        {contact.phone}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </div>
          {job.status === "blocked" && job.blockerNote ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Blocked: {job.blockerNote}
            </p>
          ) : null}
          {latestPlan ? (
            <Button
              variant="outline"
              className="min-h-11 w-full"
              nativeButton={false}
              render={<a href={jobDocumentHref(job.id, latestPlan.id)} />}
            >
              <FileTextIcon aria-hidden="true" />
              Open latest plan · {latestPlan.filename}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No plan set has been uploaded yet.</p>
          )}
          <Button
            variant="ghost"
            className="min-h-11 w-full"
            nativeButton={false}
            render={<Link href={`/app/jobs/${job.id}`} />}
          >
            Open office job record
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <ClipboardCheckIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Tap complete when the work is done.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks have been assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div>
                    <p className={task.status === "done" ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.assignee ?? "Unassigned"}
                      {areaName(task.workAreaId) ? ` · ${areaName(task.workAreaId)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusButton
                      action={setJobWorkspaceTaskStatus}
                      jobId={job.id}
                      taskId={task.id}
                      status={task.status === "done" ? "done" : "open"}
                      returnTo={returnTo}
                      completeLabel="Complete task"
                      reopenLabel="Reopen task"
                      className="min-h-11 w-full"
                    />
                    <ConfirmForm
                      action={removeJobWorkspaceTask}
                      message={`Delete task “${task.title}”? This cannot be undone.`}
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <SubmitButton
                        variant="ghost"
                        className="min-h-11 text-muted-foreground hover:text-destructive"
                        pendingLabel="Deleting…"
                      >
                        <Trash2Icon aria-hidden="true" />
                        <span className="sr-only">Delete task</span>
                      </SubmitButton>
                    </ConfirmForm>
                  </div>
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
              <NotebookPenIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Log a field entry</CardTitle>
              <CardDescription>
                Notes, quantities, blockers, material requests, and daily reports.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ActionForm action={addJobFieldEntry} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <FieldEntryFields idPrefix="fieldEntry" areas={areaOptions} tasks={taskOptions} />
            <div className="space-y-3 sm:col-span-2">
              <SubmitButton variant="default" className="min-h-11 w-full" pendingLabel="Saving field entry…">
                Save field entry
              </SubmitButton>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Reporting a blocker also marks the job blocked for the office.
              </p>
            </div>
          </ActionForm>

          <div className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Recent entries</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No field entries yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <div className="flex items-center">
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
                              <SubmitButton variant="default" className="min-h-11 w-full">
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
                          <SubmitButton
                            variant="ghost"
                            className="min-h-11 text-muted-foreground hover:text-destructive"
                            pendingLabel="Deleting…"
                          >
                            <Trash2Icon aria-hidden="true" />
                            <span className="sr-only">Delete entry</span>
                          </SubmitButton>
                        </ConfirmForm>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.createdBy}
                      {areaName(note.workAreaId) ? ` · ${areaName(note.workAreaId)}` : ""}
                      {taskTitle(note.taskId) ? ` · ${taskTitle(note.taskId)}` : ""}
                      {` · ${note.createdAt.toLocaleString("en-CA")}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <CameraIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Photos and evidence</CardTitle>
              <CardDescription>Attach a photo or plan to this job or a work area.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <JobDocumentUploader
            jobId={job.id}
            areas={areaOptions}
            storageMode={documentStorageMode}
            defaultKind="photo"
          />
          <div className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Files on this job</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos or plans uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((document) => (
                  <li key={document.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <div>
                      <p className="break-all font-medium">{document.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {JOB_DOCUMENT_LABELS[document.kind as keyof typeof JOB_DOCUMENT_LABELS] ??
                          document.kind}
                        {areaName(document.workAreaId) ? ` · ${areaName(document.workAreaId)}` : ""}
                        {` · ${formatFileSize(document.sizeBytes)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        nativeButton={false}
                        render={<a href={jobDocumentHref(job.id, document.id)} />}
                      >
                        <FileTextIcon aria-hidden="true" />
                        Open file
                      </Button>
                      <FormDialog
                        triggerLabel="Edit"
                        triggerIcon={<PencilIcon aria-hidden="true" />}
                        triggerVariant="ghost"
                        triggerAriaLabel={`Edit ${document.filename}`}
                        title="Edit file"
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
                          />
                          <div className="sm:col-span-2">
                            <SubmitButton variant="default" className="min-h-11 w-full">
                              Save file
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
                        <SubmitButton
                          variant="ghost"
                          className="min-h-11 text-muted-foreground hover:text-destructive"
                          pendingLabel="Deleting…"
                        >
                          <Trash2Icon aria-hidden="true" />
                          <span className="sr-only">Delete file</span>
                        </SubmitButton>
                      </ConfirmForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
