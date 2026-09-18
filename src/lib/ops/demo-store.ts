import {
  demoEstimateComments,
  demoEstimateEvents,
  demoEstimateRequests,
  demoEstimateTasks,
  type EstimateRequestComment,
  type EstimateRequestEvent,
  type EstimateRequestRow,
  type EstimateRequestTask,
} from "@/lib/ops/demo-data";
import type {
  EstimateRequestFilters,
  EstimateRequestUpdate,
} from "@/lib/ops/store";
import { isWorkflowStatus } from "@/lib/ops/workflow";

const requests = demoEstimateRequests();
const events = demoEstimateEvents();
const tasks = demoEstimateTasks();
const comments = demoEstimateComments();

export function useDemoOpsStore(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.OPS_DEMO === "1" || !env.DATABASE_URL;
}

export function matchesEstimateRequestFilters(
  request: EstimateRequestRow,
  filters: EstimateRequestFilters,
): boolean {
  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const haystack = [
      request.id,
      request.company,
      request.firstName,
      request.lastName,
      request.email,
      request.phone,
      request.city,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.workflowStatus && isWorkflowStatus(filters.workflowStatus)) {
    if (request.workflowStatus !== filters.workflowStatus) return false;
  }
  if (
    filters.qualification === "qualified" ||
    filters.qualification === "secondary"
  ) {
    if (request.status !== filters.qualification) return false;
  }
  return true;
}

export function listDemoEstimateRequests(
  filters: EstimateRequestFilters = {},
): EstimateRequestRow[] {
  return requests
    .filter((request) => matchesEstimateRequestFilters(request, filters))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getDemoEstimateRequest(
  id: string,
): EstimateRequestRow | null {
  return requests.find((request) => request.id === id) ?? null;
}

export function listDemoEstimateRequestEvents(
  leadId: string,
): EstimateRequestEvent[] {
  return events
    .filter((event) => event.leadId === leadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateDemoEstimateRequest(args: {
  id: string;
  actor: string;
  update: EstimateRequestUpdate;
}): EstimateRequestRow | null {
  const existing = getDemoEstimateRequest(args.id);
  if (!existing) return null;

  const now = new Date();
  existing.workflowStatus = args.update.workflowStatus;
  existing.assignedTo = args.update.assignedTo;
  existing.nextAction = args.update.nextAction;
  existing.nextActionDueAt = args.update.nextActionDueAt;
  existing.lostReason = args.update.lostReason;
  existing.updatedAt = now;

  const changes: string[] = [];
  if (existing.workflowStatus) changes.push("review updated");
  if (args.update.note) changes.push("internal note added");
  events.unshift({
    id: crypto.randomUUID(),
    leadId: args.id,
    createdAt: now,
    actor: args.actor,
    kind: "review_update",
    summary: args.update.note
      ? `review updated; internal note added`
      : "review updated",
    payload: {
      after: {
        workflowStatus: existing.workflowStatus,
        assignedTo: existing.assignedTo,
        nextAction: existing.nextAction,
      },
      note: args.update.note ?? null,
    },
  });
  return existing;
}

function recordEvent(args: {
  leadId: string;
  actor: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}) {
  events.unshift({
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: new Date(),
    actor: args.actor,
    kind: args.kind,
    summary: args.summary,
    payload: args.payload,
  });
}

export function listDemoEstimateRequestTasks(
  leadId: string,
): EstimateRequestTask[] {
  return tasks
    .filter((task) => task.leadId === leadId)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

export function listDemoEstimateRequestComments(
  leadId: string,
): EstimateRequestComment[] {
  return comments
    .filter((comment) => comment.leadId === leadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function addDemoEstimateRequestTask(args: {
  leadId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): EstimateRequestTask | null {
  if (!getDemoEstimateRequest(args.leadId)) return null;
  const now = new Date();
  const task: EstimateRequestTask = {
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: now,
    updatedAt: now,
    title: args.title,
    assignee: args.assignee,
    dueAt: args.dueAt,
    status: "open",
    createdBy: args.actor,
  };
  tasks.unshift(task);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${args.title}`,
    payload: { taskId: task.id, title: args.title },
  });
  return task;
}

export function setDemoEstimateRequestTaskStatus(args: {
  leadId: string;
  taskId: string;
  actor: string;
  status: "open" | "done";
}): EstimateRequestTask | null {
  const task = tasks.find(
    (item) => item.id === args.taskId && item.leadId === args.leadId,
  );
  if (!task) return null;
  task.status = args.status;
  task.updatedAt = new Date();
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: args.status === "done" ? "task_completed" : "task_reopened",
    summary:
      args.status === "done"
        ? `task completed: ${task.title}`
        : `task reopened: ${task.title}`,
    payload: { taskId: task.id, status: args.status },
  });
  return task;
}

export function addDemoEstimateRequestComment(args: {
  leadId: string;
  actor: string;
  body: string;
}): EstimateRequestComment | null {
  if (!getDemoEstimateRequest(args.leadId)) return null;
  const comment: EstimateRequestComment = {
    id: crypto.randomUUID(),
    leadId: args.leadId,
    createdAt: new Date(),
    actor: args.actor,
    body: args.body,
  };
  comments.unshift(comment);
  recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_added",
    summary: "internal comment added",
    payload: { commentId: comment.id, body: args.body },
  });
  return comment;
}
