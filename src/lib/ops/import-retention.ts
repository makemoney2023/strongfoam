const DAY_MS = 24 * 60 * 60 * 1000;

export type ImportRetentionSubject = {
  id: string;
  status: string;
  updatedAt: Date;
  hasSource: boolean;
  hasNormalized: boolean;
};

export type ImportRetentionPlan = {
  deleteSource: boolean;
  deleteNormalized: boolean;
};

export function planImportRetention(
  subject: ImportRetentionSubject,
  now: Date,
): ImportRetentionPlan {
  const age = now.getTime() - subject.updatedAt.getTime();
  const finished =
    subject.status === "cancelled" ||
    subject.status === "failed" ||
    subject.status === "completed";
  const deleteSource =
    subject.hasSource &&
    (subject.status === "cancelled" ||
      (subject.status === "failed" && age >= 7 * DAY_MS) ||
      (subject.status === "completed" && age >= 30 * DAY_MS));
  const deleteNormalized = finished && subject.hasNormalized && age >= 90 * DAY_MS;
  return { deleteSource, deleteNormalized };
}

export async function applyImportRetention<T extends ImportRetentionSubject>(
  subjects: readonly T[],
  now: Date,
  persist: (subject: T, plan: ImportRetentionPlan) => Promise<void>,
): Promise<number> {
  let applied = 0;
  for (const subject of subjects) {
    const plan = planImportRetention(subject, now);
    if (!plan.deleteSource && !plan.deleteNormalized) continue;
    await persist(subject, plan);
    applied += 1;
  }
  return applied;
}
