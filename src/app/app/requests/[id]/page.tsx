import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
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
      <Flash saved={query.saved} error={query.error} savedMessage="Review saved." />

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
              <form action={convertRequestToCrmRecords} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={request.id} />
                <p className="text-sm text-muted-foreground">
                  Create or link a company, contact, site, and opportunity from
                  this submission without retyping the captured details.
                </p>
                {companyMatches.length > 0 || contactMatches.length > 0 ? (
                  <div className="rounded-md bg-muted px-3 py-3 text-sm">
                    <p className="font-semibold">Likely duplicates</p>
                    {companyMatches.map((match) => (
                      <p key={match.id} className="mt-1">
                        Company {match.name} matches by {match.reason}.
                      </p>
                    ))}
                    {contactMatches.map((match) => (
                      <p key={match.id} className="mt-1">
                        Contact {match.name} ({match.email}) matches by{" "}
                        {match.reason}.
                      </p>
                    ))}
                    <p className="mt-2 text-muted-foreground">
                      Link the existing records or confirm creating new ones.
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      defaultValue={draft.companyName}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkCompanyId">Link existing company</Label>
                    <select
                      id="linkCompanyId"
                      name="linkCompanyId"
                      defaultValue={companyMatches[0]?.id ?? ""}
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="">Create new company</option>
                      {allCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={draft.firstName}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={draft.lastName}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={draft.email}
                      className="h-8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={draft.phone}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      name="role"
                      defaultValue={draft.role ?? ""}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkContactId">Link existing contact</Label>
                    <select
                      id="linkContactId"
                      name="linkContactId"
                      defaultValue={contactMatches[0]?.id ?? ""}
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="">Create new contact</option>
                      {allContacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {formatFullName(contact.firstName, contact.lastName)} ·{" "}
                          {contact.email}
                        </option>
                      ))}
                    </select>
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
                {companyMatches.length > 0 || contactMatches.length > 0 ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="createNew" value="on" />
                    Create new records even if matches exist
                  </label>
                ) : null}
                <Button type="submit" variant="outline" className="h-8">
                  Create CRM records
                </Button>
              </form>
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
            <h2 className="text-base font-semibold">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No tasks have been created yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
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
                        {task.dueAt
                          ? ` · due ${task.dueAt.toLocaleString("en-CA")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={setRequestTaskStatus}>
                        <input type="hidden" name="id" value={request.id} />
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
                      <form action={removeRequestTask}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="h-8 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                    <form action={saveRequestTask} className="mt-3 grid w-full gap-2 sm:grid-cols-3">
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <Input name="title" className="h-8" defaultValue={task.title} required />
                      <Input name="assignee" className="h-8" defaultValue={task.assignee ?? ""} />
                      <Input
                        name="dueAt"
                        type="datetime-local"
                        className="h-8"
                        defaultValue={datetimeLocalValue(task.dueAt)}
                      />
                      <button
                        type="submit"
                        className="h-8 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                      >
                        Save task
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addRequestTask} className="mt-5 space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <div className="space-y-2">
                <Label htmlFor="taskTitle">New task</Label>
                <Input id="taskTitle" name="title" className="h-8" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taskAssignee">Assignee</Label>
                  <Input id="taskAssignee" name="assignee" className="h-8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskDueAt">Due</Label>
                  <Input
                    id="taskDueAt"
                    name="dueAt"
                    type="datetime-local"
                    className="h-8"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" className="h-8">
                Add task
              </Button>
            </form>
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="text-base font-semibold">Comments</h2>
            {comments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No comments yet. Use @name to mention a teammate.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {comments.map((comment) => (
                  <li key={comment.id} className="border-l-2 border-border pl-3">
                    <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {comment.actor} · {comment.createdAt.toLocaleString("en-CA")}
                      {extractMentions(comment.body).length > 0
                        ? ` · mentioned ${extractMentions(comment.body).join(", ")}`
                        : ""}
                    </p>
                    <form action={removeRequestComment} className="mt-2">
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="commentId" value={comment.id} />
                      <button
                        type="submit"
                        className="h-8 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                      >
                        Delete comment
                      </button>
                    </form>
                  </li>
                ))}
              </ol>
            )}
            <form action={addRequestComment} className="mt-5 space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <div className="space-y-2">
                <Label htmlFor="commentBody">Add a comment</Label>
                <Textarea id="commentBody" name="body" rows={3} required />
              </div>
              <Button type="submit" variant="outline" className="h-8">
                Post comment
              </Button>
            </form>
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
          <form action={saveEstimateRequestReview} className="mt-4 space-y-4">
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
          </form>
        </aside>
      </div>
    </div>
  );
}
