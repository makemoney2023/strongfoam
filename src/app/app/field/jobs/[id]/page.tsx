import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangleIcon,
  CameraIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  MapPinIcon,
  NotebookPenIcon,
  PhoneIcon,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import {
  FIELD_NOTE_KINDS,
  FIELD_NOTE_LABELS,
  FIELD_QUANTITY_LABELS,
  FIELD_QUANTITY_UNITS,
  formatFieldQuantity,
} from "@/lib/ops/field-workspace";
import { JOB_STATUS_LABELS, formatJobNumber } from "@/lib/ops/jobs";
import {
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
  setJobWorkspaceTaskStatus,
} from "../../../jobs/actions";

export const dynamic = "force-dynamic";

export default async function FieldJobPage({
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

  const [company, site, opportunity, areas, tasks, documents, notes] =
    await Promise.all([
      job.companyId ? getCompany(job.companyId) : null,
      job.siteId ? getSite(job.siteId) : null,
      job.opportunityId ? getOpportunity(job.opportunityId) : null,
      listWorkAreas(job.id),
      listJobTasks(job.id),
      listJobDocuments(job.id),
      listJobFieldNotes(job.id),
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
      <Flash saved={query.saved} error={query.error} savedMessage="Field update saved." />

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
              <CardDescription>Start and complete assigned work.</CardDescription>
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
                  <form action={setJobWorkspaceTaskStatus}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input
                      type="hidden"
                      name="status"
                      value={task.status === "done" ? "open" : "done"}
                    />
                    <SubmitButton
                      className="min-h-11 w-full"
                      pendingLabel={task.status === "done" ? "Reopening…" : "Completing…"}
                    >
                      {task.status === "done" ? "Reopen task" : "Complete task"}
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
              <NotebookPenIcon className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Field log</CardTitle>
              <CardDescription>
                Notes, quantities, blockers, material requests, and daily reports.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border bg-muted/20 p-3">
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
                  <p className="mt-2 text-sm">{note.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.createdBy}
                    {areaName(note.workAreaId) ? ` · ${areaName(note.workAreaId)}` : ""}
                    {taskTitle(note.taskId) ? ` · ${taskTitle(note.taskId)}` : ""}
                    {` · ${note.createdAt.toLocaleString("en-CA")}`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form
            action={addJobFieldEntry}
            className="space-y-4 rounded-lg border border-dashed p-4"
          >
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="space-y-2">
              <Label htmlFor="fieldKind">
                Entry type <span aria-hidden="true">*</span>
              </Label>
              <NativeSelect id="fieldKind" name="kind" defaultValue="note" className="h-11">
                {FIELD_NOTE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {FIELD_NOTE_LABELS[kind]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fieldQuantity">Quantity</Label>
                <Input
                  id="fieldQuantity"
                  name="quantity"
                  inputMode="numeric"
                  className="h-11"
                  placeholder="Required for quantities"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldUnit">Unit</Label>
                <NativeSelect id="fieldUnit" name="unit" defaultValue="board_feet" className="h-11">
                  {FIELD_QUANTITY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {FIELD_QUANTITY_LABELS[unit]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fieldWorkArea">Work area</Label>
                <NativeSelect id="fieldWorkArea" name="workAreaId" defaultValue="" className="h-11">
                  <option value="">Whole job</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldTask">Task</Label>
                <NativeSelect id="fieldTask" name="taskId" defaultValue="" className="h-11">
                  <option value="">No task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldBody">
                Details <span aria-hidden="true">*</span>
              </Label>
              <Textarea
                id="fieldBody"
                name="body"
                rows={4}
                maxLength={4000}
                required
                placeholder="Note, quantity context, blocker, material request, or daily report"
              />
            </div>
            <SubmitButton className="min-h-11 w-full" pendingLabel="Saving field entry…">
              Save field entry
            </SubmitButton>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Reporting a blocker also marks the job blocked for the office.
            </p>
          </form>
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
        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos or plans uploaded yet.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((document) => (
                <li key={document.id} className="rounded-lg border bg-muted/20 p-3">
                  <p className="break-all font-medium">{document.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {JOB_DOCUMENT_LABELS[document.kind as keyof typeof JOB_DOCUMENT_LABELS] ??
                      document.kind}
                    {areaName(document.workAreaId) ? ` · ${areaName(document.workAreaId)}` : ""}
                    {` · ${formatFileSize(document.sizeBytes)}`}
                  </p>
                  <a
                    href={jobDocumentHref(job.id, document.id)}
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-medium"
                  >
                    Open file
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-lg border border-dashed p-4">
            <JobDocumentUploader
              jobId={job.id}
              areas={areas.map(({ id: areaId, name }) => ({ id: areaId, name }))}
              storageMode={documentStorageMode}
              defaultKind="photo"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
