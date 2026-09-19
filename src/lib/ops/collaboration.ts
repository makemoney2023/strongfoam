export const TASK_STATUSES = ["open", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function parseTaskInput(input: {
  title?: string;
  assignee?: string;
  dueAt?: string;
}):
  | {
      ok: true;
      value: { title: string; assignee: string | null; dueAt: Date | null };
    }
  | { ok: false; error: string; field?: string } {
  const title = input.title?.trim() ?? "";
  if (!title) return { ok: false, error: "A task title is required.", field: "title" };

  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: "Task due date is invalid.", field: "dueAt" };
  }

  return {
    ok: true,
    value: {
      title,
      assignee: input.assignee?.trim() || null,
      dueAt,
    },
  };
}

export function parseCommentInput(input: {
  body?: string;
}): { ok: true; value: { body: string } } | { ok: false; error: string; field?: string } {
  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: "A comment is required.", field: "body" };
  return { ok: true, value: { body } };
}

export function extractMentions(body: string): string[] {
  return [...body.matchAll(/@([A-Za-z0-9._-]+)/g)]
    .map((match) => match[1].toLowerCase())
    .filter((value, index, values) => values.indexOf(value) === index);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}
