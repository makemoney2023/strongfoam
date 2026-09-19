export type ScheduleGraphTask = {
  id: string;
  title?: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
};

export type ScheduleDependency = {
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
};

export type CriticalPathMetric = {
  earliestStartDay: number;
  earliestFinishDay: number;
  latestStartDay: number;
  latestFinishDay: number;
  totalFloatDays: number;
};

function topologicalOrder(
  taskIds: readonly string[],
  edges: readonly ScheduleDependency[],
): string[] | null {
  const idSet = new Set(taskIds);
  const indegree = new Map(taskIds.map((id) => [id, 0]));
  const outgoing = new Map(taskIds.map((id) => [id, [] as string[]]));

  for (const edge of edges) {
    if (
      !idSet.has(edge.predecessorTaskId) ||
      !idSet.has(edge.successorTaskId)
    ) {
      continue;
    }
    indegree.set(
      edge.successorTaskId,
      (indegree.get(edge.successorTaskId) ?? 0) + 1,
    );
    outgoing.get(edge.predecessorTaskId)?.push(edge.successorTaskId);
  }

  const ready = taskIds.filter((id) => indegree.get(id) === 0);
  const order: string[] = [];
  for (let index = 0; index < ready.length; index += 1) {
    const id = ready[index]!;
    order.push(id);
    for (const successorId of outgoing.get(id) ?? []) {
      const next = (indegree.get(successorId) ?? 0) - 1;
      indegree.set(successorId, next);
      if (next === 0) ready.push(successorId);
    }
  }
  return order.length === taskIds.length ? order : null;
}

export function validateDependencyAddition(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
  candidate: ScheduleDependency,
):
  | { ok: true }
  | {
      ok: false;
      error: string;
      field?: "predecessorTaskId" | "lagDays";
    } {
  const taskIds = new Set(tasks.map((task) => task.id));
  if (!taskIds.has(candidate.predecessorTaskId)) {
    return {
      ok: false,
      error: "Choose a predecessor from this project.",
      field: "predecessorTaskId",
    };
  }
  if (!taskIds.has(candidate.successorTaskId)) {
    return { ok: false, error: "The successor task is not in this project." };
  }
  if (candidate.predecessorTaskId === candidate.successorTaskId) {
    return {
      ok: false,
      error: "A task cannot depend on itself.",
      field: "predecessorTaskId",
    };
  }
  if (!Number.isInteger(candidate.lagDays) || candidate.lagDays < 0) {
    return {
      ok: false,
      error: "Lag must be a non-negative whole number.",
      field: "lagDays",
    };
  }
  if (
    edges.some(
      (edge) =>
        edge.predecessorTaskId === candidate.predecessorTaskId &&
        edge.successorTaskId === candidate.successorTaskId,
    )
  ) {
    return {
      ok: false,
      error: "That dependency already exists.",
      field: "predecessorTaskId",
    };
  }
  if (
    !topologicalOrder(
      [...taskIds],
      [...edges, candidate],
    )
  ) {
    return {
      ok: false,
      error: "That dependency would create a cycle.",
      field: "predecessorTaskId",
    };
  }
  return { ok: true };
}

function dayOrdinal(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

export function calculateCriticalPath(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
):
  | {
      ok: true;
      criticalTaskIds: Set<string>;
      metrics: Map<string, CriticalPathMetric>;
    }
  | { ok: false; error: string } {
  const scheduled = tasks.filter(
    (
      task,
    ): task is ScheduleGraphTask & {
      plannedStartAt: string;
      plannedEndAt: string;
    } => Boolean(task.plannedStartAt && task.plannedEndAt),
  );
  const taskIds = scheduled.map((task) => task.id);
  const idSet = new Set(taskIds);
  const validEdges = edges.filter(
    (edge) =>
      idSet.has(edge.predecessorTaskId) &&
      idSet.has(edge.successorTaskId),
  );
  const order = topologicalOrder(taskIds, validEdges);
  if (!order) {
    return {
      ok: false,
      error: "The dependency graph contains a cycle.",
    };
  }

  const durations = new Map<string, number>();
  for (const task of scheduled) {
    const start = dayOrdinal(task.plannedStartAt);
    const end = dayOrdinal(task.plannedEndAt);
    if (start === null || end === null) continue;
    durations.set(task.id, Math.max(1, end - start + 1));
  }

  const incoming = new Map(taskIds.map((id) => [id, [] as ScheduleDependency[]]));
  const outgoing = new Map(taskIds.map((id) => [id, [] as ScheduleDependency[]]));
  for (const edge of validEdges) {
    incoming.get(edge.successorTaskId)?.push(edge);
    outgoing.get(edge.predecessorTaskId)?.push(edge);
  }

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  for (const id of order) {
    const start = Math.max(
      0,
      ...(incoming.get(id) ?? []).map(
        (edge) =>
          (earliestFinish.get(edge.predecessorTaskId) ?? 0) + edge.lagDays,
      ),
    );
    earliestStart.set(id, start);
    earliestFinish.set(id, start + (durations.get(id) ?? 1));
  }
  const projectFinish = Math.max(0, ...earliestFinish.values());

  const latestStart = new Map<string, number>();
  const latestFinish = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const successors = outgoing.get(id) ?? [];
    const finish =
      successors.length === 0
        ? projectFinish
        : Math.min(
            ...successors.map(
              (edge) =>
                (latestStart.get(edge.successorTaskId) ?? projectFinish) -
                edge.lagDays,
            ),
          );
    latestFinish.set(id, finish);
    latestStart.set(id, finish - (durations.get(id) ?? 1));
  }

  const metrics = new Map<string, CriticalPathMetric>();
  const criticalTaskIds = new Set<string>();
  for (const id of order) {
    const metric = {
      earliestStartDay: earliestStart.get(id) ?? 0,
      earliestFinishDay: earliestFinish.get(id) ?? 0,
      latestStartDay: latestStart.get(id) ?? 0,
      latestFinishDay: latestFinish.get(id) ?? 0,
      totalFloatDays:
        (latestStart.get(id) ?? 0) - (earliestStart.get(id) ?? 0),
    };
    metrics.set(id, metric);
    if (metric.totalFloatDays === 0) criticalTaskIds.add(id);
  }
  return { ok: true, criticalTaskIds, metrics };
}

export function validateDependencyDates(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
):
  | { ok: true }
  | {
      ok: false;
      error: string;
      predecessorTaskId: string;
      successorTaskId: string;
    } {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  for (const edge of edges) {
    const predecessor = tasksById.get(edge.predecessorTaskId);
    const successor = tasksById.get(edge.successorTaskId);
    if (!predecessor?.plannedEndAt || !successor?.plannedStartAt) continue;
    const predecessorFinish = dayOrdinal(predecessor.plannedEndAt);
    const successorStart = dayOrdinal(successor.plannedStartAt);
    if (
      predecessorFinish !== null &&
      successorStart !== null &&
      successorStart < predecessorFinish + edge.lagDays
    ) {
      return {
        ok: false,
        error: `${successor.title ?? "The successor task"} must start after ${predecessor.title ?? "its predecessor"} and the ${edge.lagDays}-day lag.`,
        predecessorTaskId: edge.predecessorTaskId,
        successorTaskId: edge.successorTaskId,
      };
    }
  }
  return { ok: true };
}
