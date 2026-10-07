export const DEFAULT_JOBS_PER_DAY = 1;

export type DispatchRecommendation = {
  taskId: string;
  taskTitle: string;
  userId: string;
  displayName: string;
  jobsThatDay: number;
  capacity: number;
  workDate: string;
};

export function recommendDispatch(input: {
  task: { id: string; title: string; status: string; assigneeUserId: string | null };
  people: { userId: string; displayName: string; role: string; active: boolean }[];
  capacities: { userId: string; jobsPerDay: number }[];
  dispatches: { userId: string; status: string; workDate: string }[];
  workDate: string;
}): { ok: true; recommendation: DispatchRecommendation } | { ok: false; error: string } {
  if (input.task.status === "done" || input.task.assigneeUserId) {
    return { ok: false, error: "That task already has a person or is done." };
  }
  const capacityFor = new Map(input.capacities.map((row) => [row.userId, row.jobsPerDay]));
  const scheduled = input.dispatches.filter(
    (row) => row.workDate === input.workDate && row.status === "scheduled",
  );
  const candidates = input.people
    .filter(
      (person) =>
        person.active &&
        (person.role === "field_lead" || person.role === "field_worker"),
    )
    .map((person) => {
      const capacity = capacityFor.get(person.userId) ?? DEFAULT_JOBS_PER_DAY;
      const jobsThatDay = scheduled.filter((row) => row.userId === person.userId).length;
      return { person, capacity, jobsThatDay, remaining: capacity - jobsThatDay };
    })
    .filter((candidate) => candidate.remaining > 0)
    .sort(
      (left, right) =>
        right.remaining - left.remaining ||
        left.person.displayName.localeCompare(right.person.displayName),
    );
  const chosen = candidates[0];
  if (!chosen) {
    return { ok: false, error: "Every field member is at capacity that day." };
  }
  return {
    ok: true,
    recommendation: {
      taskId: input.task.id,
      taskTitle: input.task.title,
      userId: chosen.person.userId,
      displayName: chosen.person.displayName,
      jobsThatDay: chosen.jobsThatDay,
      capacity: chosen.capacity,
      workDate: input.workDate,
    },
  };
}

export function formatDispatchRecommendation(recommendation: DispatchRecommendation): string {
  return `Assign ${recommendation.displayName} to ${recommendation.taskTitle} on ${recommendation.workDate}. ${recommendation.jobsThatDay} of ${recommendation.capacity} jobs that day are already scheduled.`;
}
