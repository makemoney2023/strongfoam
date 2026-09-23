export const EQUIPMENT_STATUSES = ["assigned", "released"] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_NAME_LIMIT = 80;
export const EQUIPMENT_NOTE_LIMIT = 500;

export type EquipmentAssignment = {
  id: string;
  organizationId: string;
  jobId: string;
  name: string;
  nameKey: string;
  note: string;
  status: EquipmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EquipmentConflict = {
  nameKey: string;
  name: string;
  jobs: { id: string; name: string }[];
};

export function equipmentStatusLabel(status: EquipmentStatus): string {
  return status === "assigned" ? "Assigned" : "Released";
}

export function parseEquipmentName(
  value: string | undefined,
): { ok: true; name: string; nameKey: string } | { ok: false; error: string } {
  const name = (value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Enter the equipment name." };
  if (name.length > EQUIPMENT_NAME_LIMIT) {
    return {
      ok: false,
      error: `Keep the equipment name under ${EQUIPMENT_NAME_LIMIT} characters.`,
    };
  }
  return { ok: true, name, nameKey: name.toLowerCase() };
}

export function parseEquipmentNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > EQUIPMENT_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${EQUIPMENT_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function formatEquipmentConflict(conflict: EquipmentConflict): string {
  const names = conflict.jobs.map((job) => job.name);
  if (names.length === 2) {
    return `${conflict.name} is on ${names[0]} and ${names[1]}`;
  }
  return `${conflict.name} is on ${names.length} open jobs`;
}

export function buildEquipmentAttention(input: {
  organizationId: string;
  jobs: { id: string; name: string; status: string; organizationId: string }[];
  assignments: EquipmentAssignment[];
}): EquipmentConflict[] {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const groups = new Map<string, EquipmentConflict>();
  const ordered = [...input.assignments].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
  for (const row of ordered) {
    if (row.organizationId !== input.organizationId || row.status !== "assigned") continue;
    const job = jobs.get(row.jobId);
    if (!job || job.status === "closed") continue;
    const group = groups.get(row.nameKey) ?? {
      nameKey: row.nameKey,
      name: row.name,
      jobs: [],
    };
    if (!group.jobs.some((item) => item.id === job.id)) {
      group.jobs.push({ id: job.id, name: job.name });
    }
    groups.set(row.nameKey, group);
  }
  return [...groups.values()]
    .filter((group) => group.jobs.length > 1)
    .map((group) => ({
      ...group,
      jobs: [...group.jobs].sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
