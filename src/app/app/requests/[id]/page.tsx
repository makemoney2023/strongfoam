import {
  CheckCircle2Icon,
  CircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import {
  CompanyLinkPicker,
  ContactLinkPicker,
} from "@/components/ops/link-record-picker";
import { TaskStatusButton } from "@/components/ops/task-status-button";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import { extractMentions } from "@/lib/ops/collaboration";
import { ConvertWonWorkForm } from "@/app/app/jobs/convert-form";
import {
  draftCrmFromRequest,
  findCompanyMatches,
  findContactMatches,
  OPPORTUNITY_LABELS,
  OPPORTUNITY_STAGES,
} from "@/lib/ops/crm";
import {
  canConvertWonWork,
  draftJobFromOpportunity,
  formatJobNumber,
  JOB_STATUS_LABELS,
} from "@/lib/ops/jobs";
import {
  getEstimateRequest,
  getProject,
  getRequestCrmRecords,
  listCompanies,
  listContacts,
  listEstimateRequestComments,
  listEstimateRequestEvents,
  listEstimateRequestTasks,
  listJobs,
  staffFileHref,
} from "@/lib/ops/store";
import {
  BOOKING_LABELS,
  PROJECT_TYPE_LABELS,
  QUALIFICATION_LABELS,
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  formatCompany,
  formatFullName,
  formatRequestNumber,
  formatServices,
} from "@/lib/ops/workflow";
import { datetimeLocalValue } from "@/lib/ops/filters";
import {
  addRequestComment,
  addRequestTask,
  convertRequestToCrmRecords,
  removeRequestComment,
  removeRequestTask,
  saveEstimateRequestReview,
  saveRequestTask,
  setRequestTaskStatus,
} from "./actions";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function field(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

export default async function EstimateRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const request = await getEstimateRequest(id);
  if (!request) notFound();

  const [events, tasks, comments, crm, allCompanies, allContacts] =
    await Promise.all([
      listEstimateRequestEvents(id),
      listEstimateRequestTasks(id),
      listEstimateRequestComments(id),
      getRequestCrmRecords(request),
      listCompanies(),
      listContacts(),
    ]);
  const project = crm.opportunity?.projectId
    ? await getProject(crm.opportunity.projectId)
    : null;
  const projectJobs = project ? await listJobs({ projectId: project.id }) : [];
  const canConvert =
    Boolean(crm.opportunity) &&
    !crm.opportunity?.projectId &&
    canConvertWonWork({
      workflowStatus: request.workflowStatus,
      opportunityStage: crm.opportunity?.stage,
    });
  const jobDraft = crm.opportunity
    ? draftJobFromOpportunity(crm.opportunity)
    : null;
  const draft = draftCrmFromRequest(request);
  const companyMatches = findCompanyMatches(draft.companyName, allCompanies);
  const contactMatches = findContactMatches(
    draft.email,
    draft.phone,
    allContacts,
  );
  const answers = asRecord(request.answers);
  const files = Array.isArray(request.files)
    ? (request.files as Array<{ pathname?: string }>)
    : [];
  const company = formatCompany(
    request.company,
    formatFullName(request.firstName, request.lastName),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/requests", label: "Requests" },
          { label: formatRequestNumber(request.id) },
        ]}
        title={company}
        description={`${formatRequestNumber(request.id)} · submitted ${request.createdAt.toLocaleString("en-CA")}`}
        actions={
          <StatusBadge
            status={request.workflowStatus}
            label={
              WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
              request.workflowStatus
            }
          />
        }
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Submission</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Contact
                </dt>
                <dd className="mt-1">
                  {formatFullName(request.firstName, request.lastName)}
                  <br />
                  <a
                    href={`mailto:${request.email}`}
                    className="hover:underline"
                  >
                    {request.email}
                  </a>
                  <br />
                  <a
                    href={`tel:${request.phone}`}
                    className="hover:underline"
                  >
                    {request.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Project
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>
                    {PROJECT_TYPE_LABELS[request.projectType as keyof typeof PROJECT_TYPE_LABELS] ??
                      request.projectType}
                  </p>
                  <p>
                    {request.city}
                    {request.province === "ON" ? ", ON" : " · Outside Ontario"}
                  </p>
                  <p>{formatServices(request.services)}</p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Qualification
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>
                    {QUALIFICATION_LABELS[request.status as keyof typeof QUALIFICATION_LABELS] ??
                      request.status}
                  </p>
                  <p>
                    Booking:{" "}
                    {BOOKING_LABELS[request.bookingStatus as keyof typeof BOOKING_LABELS] ??
                      request.bookingStatus}
                  </p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Role / timeline
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>{field(answers.role)}</p>
                  <p>{field(answers.timeline)}</p>
                </dd>
              </div>
            </dl>
            {typeof answers.notes === "string" && answers.notes.trim() ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                {answers.notes}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">CRM records</h2>
            {crm.opportunity ? (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Company
                  </dt>
                  <dd className="mt-1">
                    {crm.company ? (
                      <Link
                        href={`/app/companies/${crm.company.id}`}
                        className="font-medium hover:underline"
                      >
                        {crm.company.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Contact
                  </dt>
                  <dd className="mt-1">
                    {crm.contact
                      ? `${formatFullName(crm.contact.firstName, crm.contact.lastName)} · ${crm.contact.email}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Site
                  </dt>
                  <dd className="mt-1">
                    {crm.site
                      ? `${crm.site.name} · ${crm.site.city}${crm.site.province === "ON" ? ", ON" : ""}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Opportunity
                  </dt>
                  <dd className="mt-1">
                    {crm.opportunity ? (
                      <Link
                        href={`/app/opportunities/${crm.opportunity.id}`}
                        className="font-medium hover:underline"
                      >
                        {crm.opportunity.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {crm.opportunity ? (
                      <p className="text-xs text-muted-foreground">
                        {OPPORTUNITY_LABELS[
                          crm.opportunity.stage as keyof typeof OPPORTUNITY_LABELS
                        ] ?? crm.opportunity.stage}
                      </p>
                    ) : null}
                  </dd>
                </div>
              </dl>
            ) : (
              <ActionForm action={convertRequestToCrmRecords} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={request.id} />
                <p className="text-sm text-muted-foreground">
                  Create or link a company, contact, site, and opportunity from
                  this submission without retyping the captured details.
                </p>
                <CompanyLinkPicker
                  companies={allCompanies.map((company) => ({
                    id: company.id,
                    name: company.name,
                  }))}
                  matches={companyMatches}
                  defaultLinkedId={companyMatches[0]?.id ?? ""}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="companyName">
                      Company name <span aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      defaultValue={draft.companyName}
                      className="h-11"
                      required
                    />
                    <FieldError name="companyName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={draft.firstName}
                      className="h-11"
                      required
                    />
                    <FieldError name="firstName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={draft.lastName}
                      className="h-11"
                      required
                    />
                    <FieldError name="lastName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={draft.email}
                      className="h-11"
                      required
                    />
                    <FieldError name="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={draft.phone}
                      className="h-11"
                    />
                  </div>
                  <ContactLinkPicker
                    contacts={allContacts.map((contact) => ({
                      id: contact.id,
                      name: formatFullName(contact.firstName, contact.lastName),
                      email: contact.email,
                    }))}
                    matches={contactMatches}
                    defaultLinkedId={contactMatches[0]?.id ?? ""}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      name="role"
                      defaultValue={draft.role ?? ""}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site</Label>
                    <Input
                      id="siteName"
                      name="siteName"
                      defaultValue={draft.siteName}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      defaultValue={draft.city}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      name="province"
                      defaultValue={draft.province}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="opportunityName">Opportunity</Label>
                    <Input
                      id="opportunityName"
                      name="opportunityName"
                      defaultValue={draft.opportunityName}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <select
                      id="stage"
                      name="stage"
                      defaultValue={draft.stage}
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {OPPORTUNITY_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {OPPORTUNITY_LABELS[stage]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input
                      id="owner"
                      name="owner"
                      defaultValue={draft.owner ?? ""}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="min-h-11">
                  Create CRM records
                </Button>
              </ActionForm>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Project and jobs</h2>
            {project && crm.opportunity ? (
              <div className="mt-4 space-y-3">
                <p>
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                </p>
                <ul className="space-y-2">
                  {projectJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatJobNumber(job.id)} · {job.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {JOB_STATUS_LABELS[
                          job.status as keyof typeof JOB_STATUS_LABELS
                        ] ?? job.status}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : canConvert && crm.opportunity && jobDraft ? (
              <ConvertWonWorkForm
                opportunityId={crm.opportunity.id}
                returnTo={`/app/requests/${request.id}`}
                defaults={{
                  projectName: jobDraft.projectName,
                  jobName: jobDraft.jobName,
                  scope: jobDraft.scope,
                  projectManager: crm.opportunity.owner,
                }}
              />
            ) : crm.opportunity ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Mark this request won to create a project and the first field
                job.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Create CRM records first, then convert won work into a project.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Files</h2>
            {files.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No drawings were uploaded with this request.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {files.map((file, index) => {
                  const href = staffFileHref(request.id, index);
                  const label = file.pathname?.split("/").at(-1) ?? `File ${index + 1}`;
                  return (
                    <li key={`${file.pathname ?? "file"}-${index}`}>
                      {href ? (
                        <a
                          href={href}
                          className="font-medium hover:underline"
                        >
                          {label}
                        </a>
                      ) : (
                        <span>{label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  Follow-ups for this request before it becomes a job.
                </p>
              </div>
              <FormDialog
                triggerLabel="Add task"
                triggerIcon={<PlusIcon aria-hidden="true" />}
                triggerVariant="outline"
                title="Add a task"
                description={`Follow-up for ${formatRequestNumber(request.id)}.`}
              >
                <ActionForm action={addRequestTask} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={request.id} />
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="newReqTask-title">
                      Task <span aria-hidden="true">*</span>
                    </Label>
                    <Input id="newReqTask-title" name="title" className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newReqTask-assignee">Assignee</Label>
                    <Input id="newReqTask-assignee" name="assignee" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newReqTask-dueAt">Due</Label>
                    <Input id="newReqTask-dueAt" name="dueAt" type="datetime-local" className="h-11" />
                  </div>
                  <div className="sm:col-span-2">
                    <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                      Add task
                    </SubmitButton>
                  </div>
                </ActionForm>
              </FormDialog>
            </div>
            {tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No tasks yet. Add one for a site visit, a call back, or the estimate itself.
              </p>
            ) : (
              <ul className="mt-4 divide-y">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {task.status === "done" ? (
                        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <CircleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                        <p className="text-xs text-muted-foreground">
                          {task.assignee ?? "Unassigned"}
                          {task.dueAt ? ` · due ${task.dueAt.toLocaleString("en-CA")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <TaskStatusButton
                        action={setRequestTaskStatus}
                        requestId={request.id}
                        taskId={task.id}
                        status={task.status === "done" ? "done" : "open"}
                      />
                      <FormDialog
                        triggerLabel="Edit"
                        triggerIcon={<PencilIcon aria-hidden="true" />}
                        triggerVariant="ghost"
                        triggerAriaLabel={`Edit ${task.title}`}
                        title="Edit task"
                      >
                        <ActionForm action={saveRequestTask} className="grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="id" value={request.id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor={`reqTask-${task.id}-title`}>
                              Task <span aria-hidden="true">*</span>
                            </Label>
                            <Input
                              id={`reqTask-${task.id}-title`}
                              name="title"
                              className="h-11"
                              defaultValue={task.title}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reqTask-${task.id}-assignee`}>Assignee</Label>
                            <Input
                              id={`reqTask-${task.id}-assignee`}
                              name="assignee"
                              className="h-11"
                              defaultValue={task.assignee ?? ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reqTask-${task.id}-dueAt`}>Due</Label>
                            <Input
                              id={`reqTask-${task.id}-dueAt`}
                              name="dueAt"
                              type="datetime-local"
                              className="h-11"
                              defaultValue={datetimeLocalValue(task.dueAt)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                              Save task
                            </SubmitButton>
                          </div>
                        </ActionForm>
                      </FormDialog>
                      <ConfirmForm
                        action={removeRequestTask}
                        message={`Delete task “${task.title}”? This cannot be undone.`}
                      >
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <SubmitButton
                          variant="ghost"
                          className="min-h-11 text-muted-foreground hover:text-destructive md:min-h-8"
                          pendingLabel="Deleting…"
                        >
                          <Trash2Icon aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">Delete</span>
                        </SubmitButton>
                      </ConfirmForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Comments</h2>
            <p className="text-sm text-muted-foreground">
              Use @name to mention a teammate.
            </p>
            <ActionForm action={addRequestComment} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <div className="space-y-2">
                <Label htmlFor="commentBody">Add a comment</Label>
                <Textarea
                  id="commentBody"
                  name="body"
                  rows={3}
                  placeholder="Site visit booked for Thursday, @sam can you confirm access?"
                  required
                />
              </div>
              <SubmitButton variant="default" className="min-h-11 md:min-h-8" pendingLabel="Posting…">
                Post comment
              </SubmitButton>
            </ActionForm>
            {comments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ol className="mt-5 space-y-4 border-t pt-4">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex items-start justify-between gap-3 border-l-2 border-border pl-3">
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.actor} · {comment.createdAt.toLocaleString("en-CA")}
                        {extractMentions(comment.body).length > 0
                          ? ` · mentioned ${extractMentions(comment.body).join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <ConfirmForm
                      action={removeRequestComment}
                      message="Delete this comment? This cannot be undone."
                    >
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="commentId" value={comment.id} />
                      <SubmitButton
                        variant="ghost"
                        className="min-h-11 text-muted-foreground hover:text-destructive md:min-h-8"
                        pendingLabel="Deleting…"
                      >
                        <Trash2Icon aria-hidden="true" />
                        <span className="sr-only">Delete comment</span>
                      </SubmitButton>
                    </ConfirmForm>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Activity</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No review activity has been recorded yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
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
          </div>
        </section>

        <aside className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-base font-semibold">Review</h2>
          <ActionForm action={saveEstimateRequestReview} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={request.id} />
            <div className="space-y-2">
              <Label htmlFor="workflowStatus">Workflow status</Label>
              <select
                id="workflowStatus"
                name="workflowStatus"
                defaultValue={request.workflowStatus}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {WORKFLOW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WORKFLOW_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned estimator</Label>
              <Input
                id="assignedTo"
                name="assignedTo"
                defaultValue={request.assignedTo ?? ""}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextAction">Next action</Label>
              <Input
                id="nextAction"
                name="nextAction"
                defaultValue={request.nextAction ?? ""}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextActionDueAt">Due</Label>
              <Input
                id="nextActionDueAt"
                name="nextActionDueAt"
                type="datetime-local"
                defaultValue={datetimeLocalValue(request.nextActionDueAt)}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lostReason">Lost reason</Label>
              <Input
                id="lostReason"
                name="lostReason"
                defaultValue={request.lostReason ?? ""}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Internal note</Label>
              <Textarea id="note" name="note" rows={4} />
            </div>
            <Button type="submit" className="w-full">
              Save review
            </Button>
          </ActionForm>
        </aside>
      </div>
    </div>
  );
}
