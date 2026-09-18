import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  leads,
} from "@/db/schema";
import { signLeadId } from "@/lib/leads/hmac";
import {
  addDemoEstimateRequestComment,
  addDemoEstimateRequestTask,
  getDemoEstimateRequest,
  listDemoEstimateRequestComments,
  listDemoEstimateRequestEvents,
  listDemoEstimateRequestTasks,
  listDemoEstimateRequests,
  setDemoEstimateRequestTaskStatus,
  updateDemoEstimateRequest,
  useDemoOpsStore,
} from "@/lib/ops/demo-store";
import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  isWorkflowStatus,
  requireLostReason,
  type WorkflowStatus,
} from "@/lib/ops/workflow";

export type EstimateRequestRow = typeof leads.$inferSelect;

export type EstimateRequestEvent = typeof estimateRequestEvents.$inferSelect;
export type EstimateRequestTask = typeof estimateRequestTasks.$inferSelect;
export type EstimateRequestComment = typeof estimateRequestComments.$inferSelect;

export type EstimateRequestFilters = {
  q?: string;
  workflowStatus?: string;
  qualification?: string;
};

export type EstimateRequestUpdate = {
  workflowStatus: WorkflowStatus;
  assignedTo: string | null;
  nextAction: string | null;
  nextActionDueAt: Date | null;
  lostReason: string | null;
  note?: string;
};

function like(value: string): string {
  return `%${value.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export function parseEstimateRequestUpdate(input: {
  workflowStatus?: string;
  assignedTo?: string;
  nextAction?: string;
  nextActionDueAt?: string;
  lostReason?: string;
  note?: string;
}): { ok: true; value: EstimateRequestUpdate } | { ok: false; error: string } {
  const workflowStatus = input.workflowStatus ?? "";
  if (!isWorkflowStatus(workflowStatus)) {
    return { ok: false, error: "Choose a valid workflow status." };
  }

  const lostReason = input.lostReason?.trim() || null;
  const lostReasonError = requireLostReason(workflowStatus, lostReason);
  if (lostReasonError) return { ok: false, error: lostReasonError };

  const nextActionDueAt = input.nextActionDueAt
    ? new Date(input.nextActionDueAt)
    : null;
  if (nextActionDueAt && Number.isNaN(nextActionDueAt.getTime())) {
    return { ok: false, error: "Next-action due date is invalid." };
  }

  return {
    ok: true,
    value: {
      workflowStatus,
      assignedTo: input.assignedTo?.trim() || null,
      nextAction: input.nextAction?.trim() || null,
      nextActionDueAt,
      lostReason: workflowStatus === "lost" ? lostReason : null,
      note: input.note?.trim() || undefined,
    },
  };
}

export async function listEstimateRequests(
  filters: EstimateRequestFilters = {},
): Promise<EstimateRequestRow[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequests(filters);
  const db = getDb();
  const conditions = [];
  const query = filters.q?.trim();

  if (query) {
    conditions.push(
      or(
        ilike(leads.company, like(query)),
        ilike(leads.firstName, like(query)),
        ilike(leads.lastName, like(query)),
        ilike(leads.email, like(query)),
        ilike(leads.phone, like(query)),
        ilike(leads.city, like(query)),
        ilike(sql<string>`${leads.id}::text`, like(query)),
      ),
    );
  }
  if (filters.workflowStatus && isWorkflowStatus(filters.workflowStatus)) {
    conditions.push(eq(leads.workflowStatus, filters.workflowStatus));
  }
  if (
    filters.qualification === "qualified" ||
    filters.qualification === "secondary"
  ) {
    conditions.push(eq(leads.status, filters.qualification));
  }

  return db
    .select()
    .from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));
}

export async function getEstimateRequest(
  id: string,
): Promise<EstimateRequestRow | null> {
  if (useDemoOpsStore()) return getDemoEstimateRequest(id);
  const db = getDb();
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listEstimateRequestEvents(
  leadId: string,
): Promise<EstimateRequestEvent[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequestEvents(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestEvents)
    .where(eq(estimateRequestEvents.leadId, leadId))
    .orderBy(desc(estimateRequestEvents.createdAt));
}

export async function updateEstimateRequest(args: {
  id: string;
  actor: string;
  update: EstimateRequestUpdate;
}): Promise<EstimateRequestRow | null> {
  if (useDemoOpsStore()) {
    return updateDemoEstimateRequest(args);
  }

  const existing = await getEstimateRequest(args.id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(leads)
    .set({
      workflowStatus: args.update.workflowStatus,
      assignedTo: args.update.assignedTo,
      nextAction: args.update.nextAction,
      nextActionDueAt: args.update.nextActionDueAt,
      lostReason: args.update.lostReason,
      updatedAt: now,
    })
    .where(eq(leads.id, args.id))
    .returning();
  const updated = rows[0];
  if (!updated) return null;

  const changes: string[] = [];
  if (existing.workflowStatus !== updated.workflowStatus) {
    changes.push(
      `status ${existing.workflowStatus} → ${updated.workflowStatus}`,
    );
  }
  if (existing.assignedTo !== updated.assignedTo) {
    changes.push(
      `owner ${existing.assignedTo ?? "unassigned"} → ${updated.assignedTo ?? "unassigned"}`,
    );
  }
  if (existing.nextAction !== updated.nextAction) {
    changes.push("next action updated");
  }
  if (
    existing.nextActionDueAt?.toISOString() !==
    updated.nextActionDueAt?.toISOString()
  ) {
    changes.push("due date updated");
  }
  if (args.update.note) changes.push("internal note added");

  if (changes.length > 0) {
    await db.insert(estimateRequestEvents).values({
      leadId: args.id,
      actor: args.actor,
      kind: "review_update",
      summary: changes.join("; "),
      payload: {
        before: {
          workflowStatus: existing.workflowStatus,
          assignedTo: existing.assignedTo,
          nextAction: existing.nextAction,
          nextActionDueAt: existing.nextActionDueAt,
          lostReason: existing.lostReason,
        },
        after: {
          workflowStatus: updated.workflowStatus,
          assignedTo: updated.assignedTo,
          nextAction: updated.nextAction,
          nextActionDueAt: updated.nextActionDueAt,
          lostReason: updated.lostReason,
        },
        note: args.update.note ?? null,
      },
    });
  }

  return updated;
}

async function recordEvent(args: {
  leadId: string;
  actor: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(estimateRequestEvents).values(args);
}

export async function listEstimateRequestTasks(
  leadId: string,
): Promise<EstimateRequestTask[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequestTasks(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestTasks)
    .where(eq(estimateRequestTasks.leadId, leadId))
    .orderBy(desc(estimateRequestTasks.createdAt));
}

export async function listEstimateRequestComments(
  leadId: string,
): Promise<EstimateRequestComment[]> {
  if (useDemoOpsStore()) return listDemoEstimateRequestComments(leadId);
  const db = getDb();
  return db
    .select()
    .from(estimateRequestComments)
    .where(eq(estimateRequestComments.leadId, leadId))
    .orderBy(desc(estimateRequestComments.createdAt));
}

export async function addEstimateRequestTask(args: {
  leadId: string;
  actor: string;
  title: string;
  assignee: string | null;
  dueAt: Date | null;
}): Promise<EstimateRequestTask | null> {
  if (useDemoOpsStore()) return addDemoEstimateRequestTask(args);
  if (!(await getEstimateRequest(args.leadId))) return null;
  const db = getDb();
  const rows = await db
    .insert(estimateRequestTasks)
    .values({
      leadId: args.leadId,
      title: args.title,
      assignee: args.assignee,
      dueAt: args.dueAt,
      status: "open",
      createdBy: args.actor,
    })
    .returning();
  const task = rows[0];
  if (!task) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "task_created",
    summary: `task created: ${args.title}`,
    payload: { taskId: task.id, title: args.title },
  });
  return task;
}

export async function setEstimateRequestTaskStatus(args: {
  leadId: string;
  taskId: string;
  actor: string;
  status: TaskStatus;
}): Promise<EstimateRequestTask | null> {
  if (useDemoOpsStore()) return setDemoEstimateRequestTaskStatus(args);
  const db = getDb();
  const rows = await db
    .update(estimateRequestTasks)
    .set({ status: args.status, updatedAt: new Date() })
    .where(
      and(
        eq(estimateRequestTasks.id, args.taskId),
        eq(estimateRequestTasks.leadId, args.leadId),
      ),
    )
    .returning();
  const task = rows[0];
  if (!task) return null;
  await recordEvent({
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

export async function addEstimateRequestComment(args: {
  leadId: string;
  actor: string;
  body: string;
}): Promise<EstimateRequestComment | null> {
  if (useDemoOpsStore()) return addDemoEstimateRequestComment(args);
  if (!(await getEstimateRequest(args.leadId))) return null;
  const db = getDb();
  const rows = await db
    .insert(estimateRequestComments)
    .values({
      leadId: args.leadId,
      actor: args.actor,
      body: args.body,
    })
    .returning();
  const comment = rows[0];
  if (!comment) return null;
  await recordEvent({
    leadId: args.leadId,
    actor: args.actor,
    kind: "comment_added",
    summary: "internal comment added",
    payload: { commentId: comment.id, body: args.body },
  });
  return comment;
}

export function staffFileHref(
  leadId: string,
  fileIndex: number,
  secret = process.env.LEAD_THANKS_SECRET ?? "",
): string | null {
  if (!secret) return null;
  const token = signLeadId(`${leadId}:${fileIndex}`, secret);
  return `/api/files/${leadId}/${fileIndex}?token=${token}`;
}
