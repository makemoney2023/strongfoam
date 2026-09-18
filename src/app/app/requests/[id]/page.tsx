import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getOpsSession } from "@/lib/ops/auth";
import { extractMentions } from "@/lib/ops/collaboration";
import {
  getEstimateRequest,
  listEstimateRequestComments,
  listEstimateRequestEvents,
  listEstimateRequestTasks,
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
import {
  addRequestComment,
  addRequestTask,
  saveEstimateRequestReview,
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

function datetimeLocalValue(value: Date | null): string {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
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

  const [events, tasks, comments] = await Promise.all([
    listEstimateRequestEvents(id),
    listEstimateRequestTasks(id),
    listEstimateRequestComments(id),
  ]);
  const answers = asRecord(request.answers);
  const files = Array.isArray(request.files)
    ? (request.files as Array<{ pathname?: string }>)
    : [];
  const company = formatCompany(
    request.company,
    formatFullName(request.firstName, request.lastName),
  );

  return (
    <main className="page-rail py-8">
      <Link
        href="/app/requests"
        className="text-sm font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
      >
        Back to requests
      </Link>
      <p className="section-kicker mt-6 mb-2">Estimate request</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {company}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--sf-ink)]/65">
            {formatRequestNumber(request.id)} · submitted{" "}
            {request.createdAt.toLocaleString("en-CA")}
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold ring-1 ring-[color:var(--sf-ink)]/10">
          {WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
            request.workflowStatus}
        </p>
      </div>

      {query.saved ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-[color:var(--sf-cyan)]/10 px-3 py-2 text-sm text-[color:var(--sf-ink)]"
        >
          Review saved.
        </p>
      ) : null}
      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-[color:var(--sf-red)]/10 px-3 py-2 text-sm text-[color:var(--sf-red)]"
        >
          {query.error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Submission</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Contact
                </dt>
                <dd className="mt-1">
                  {formatFullName(request.firstName, request.lastName)}
                  <br />
                  <a
                    href={`mailto:${request.email}`}
                    className="text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                  >
                    {request.email}
                  </a>
                  <br />
                  <a
                    href={`tel:${request.phone}`}
                    className="text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                  >
                    {request.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
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
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
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
                <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
                  Role / timeline
                </dt>
                <dd className="mt-1 space-y-1">
                  <p>{field(answers.role)}</p>
                  <p>{field(answers.timeline)}</p>
                </dd>
              </div>
            </dl>
            {typeof answers.notes === "string" && answers.notes.trim() ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-[color:var(--sf-ink)]/80">
                {answers.notes}
              </p>
            ) : null}
          </div>

          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Files</h2>
            {files.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
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
                          className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
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

          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
                No tasks have been created yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--sf-ink)]/8 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        {task.status === "done" ? (
                          <span className="mr-2 text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/45">
                            Done
                          </span>
                        ) : (
                          <span className="mr-2 text-xs uppercase tracking-[0.12em] text-[color:var(--sf-cyan)]">
                            Open
                          </span>
                        )}
                        {task.title}
                      </p>
                      <p className="text-xs text-[color:var(--sf-ink)]/55">
                        {task.assignee ?? "Unassigned"}
                        {task.dueAt
                          ? ` · due ${task.dueAt.toLocaleString("en-CA")}`
                          : ""}
                      </p>
                    </div>
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
                        className="h-8 rounded-md border border-[color:var(--sf-ink)]/15 px-3 text-sm font-medium hover:bg-[color:var(--sf-mist,#e9edef)]"
                      >
                        {task.status === "done" ? "Reopen" : "Complete"}
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
                <Input id="taskTitle" name="title" className="h-11" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taskAssignee">Assignee</Label>
                  <Input id="taskAssignee" name="assignee" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskDueAt">Due</Label>
                  <Input
                    id="taskDueAt"
                    name="dueAt"
                    type="datetime-local"
                    className="h-11"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" className="h-11">
                Add task
              </Button>
            </form>
          </div>

          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Comments</h2>
            {comments.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
                No comments yet. Use @name to mention a teammate.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {comments.map((comment) => (
                  <li key={comment.id} className="border-l-2 border-[color:var(--sf-ink)]/20 pl-3">
                    <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                    <p className="text-xs text-[color:var(--sf-ink)]/55">
                      {comment.actor} · {comment.createdAt.toLocaleString("en-CA")}
                      {extractMentions(comment.body).length > 0
                        ? ` · mentioned ${extractMentions(comment.body).join(", ")}`
                        : ""}
                    </p>
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
              <Button type="submit" variant="outline" className="h-11">
                Post comment
              </Button>
            </form>
          </div>

          <div className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
            <h2 className="font-heading text-lg font-semibold">Activity</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
                No review activity has been recorded yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-[color:var(--sf-cyan)] pl-3">
                    <p className="text-sm font-medium">{event.summary}</p>
                    <p className="text-xs text-[color:var(--sf-ink)]/55">
                      {event.actor} · {event.createdAt.toLocaleString("en-CA")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold">Review</h2>
          <form action={saveEstimateRequestReview} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={request.id} />
            <div className="space-y-2">
              <Label htmlFor="workflowStatus">Workflow status</Label>
              <select
                id="workflowStatus"
                name="workflowStatus"
                defaultValue={request.workflowStatus}
                className="h-11 w-full rounded-lg border border-input bg-white px-2.5 text-sm"
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
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextAction">Next action</Label>
              <Input
                id="nextAction"
                name="nextAction"
                defaultValue={request.nextAction ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextActionDueAt">Due</Label>
              <Input
                id="nextActionDueAt"
                name="nextActionDueAt"
                type="datetime-local"
                defaultValue={datetimeLocalValue(request.nextActionDueAt)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lostReason">Lost reason</Label>
              <Input
                id="lostReason"
                name="lostReason"
                defaultValue={request.lostReason ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Internal note</Label>
              <Textarea id="note" name="note" rows={4} />
            </div>
            <Button type="submit" className="h-11 w-full">
              Save review
            </Button>
          </form>
        </aside>
      </div>
    </main>
  );
}
