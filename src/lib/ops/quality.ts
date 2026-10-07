export const QUALITY_KINDS = ["deficiency", "rework"] as const;

export type QualityKind = (typeof QUALITY_KINDS)[number];

export const QUALITY_STATUSES = ["open", "corrected", "reopened"] as const;

export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const QUALITY_NAME_LIMIT = 80;
export const QUALITY_NOTE_LIMIT = 500;

export type QualityRecord = {
  id: string;
  organizationId: string;
  jobId: string;
  kind: QualityKind;
  name: string;
  nameKey: string;
  status: QualityStatus;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type QualityAttention = {
  id: string;
  jobId: string;
  jobName: string;
  kind: QualityKind;
  name: string;
  status: Exclude<QualityStatus, "corrected">;
};

const KIND_LABELS: Record<QualityKind, string> = {
  deficiency: "Deficiency",
  rework: "Rework",
};

const STATUS_LABELS: Record<QualityStatus, string> = {
  open: "Open",
  corrected: "Corrected",
  reopened: "Reopened",
};

export function qualityKindLabel(kind: QualityKind): string {
  return KIND_LABELS[kind];
}

export function qualityStatusLabel(status: QualityStatus): string {
  return STATUS_LABELS[status];
}

export function parseQualityKind(
  value: string | undefined,
): { ok: true; value: QualityKind } | { ok: false; error: string } {
  if (value === "deficiency" || value === "rework") return { ok: true, value };
  return { ok: false, error: "Choose a deficiency or rework." };
}

export function parseQualityName(
  value: string | undefined,
): { ok: true; name: string; nameKey: string } | { ok: false; error: string } {
  const name = (value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Enter the record name." };
  if (name.length > QUALITY_NAME_LIMIT) {
    return {
      ok: false,
      error: `Keep the name under ${QUALITY_NAME_LIMIT} characters.`,
    };
  }
  return { ok: true, name, nameKey: name.toLowerCase() };
}

export function parseQualityStatus(
  value: string | undefined,
): { ok: true; value: QualityStatus } | { ok: false; error: string } {
  if (value === "open" || value === "corrected" || value === "reopened") {
    return { ok: true, value };
  }
  return { ok: false, error: "Choose open, corrected, or reopened." };
}

export function parseQualityNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > QUALITY_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${QUALITY_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function formatQualityAttention(item: QualityAttention): string {
  return `${qualityStatusLabel(item.status)} · ${qualityKindLabel(item.kind)} · ${item.name} · ${item.jobName}`;
}

export function buildQualityAttention(input: {
  organizationId: string;
  jobs: { id: string; name: string; status: string; organizationId: string }[];
  records: QualityRecord[];
}): QualityAttention[] {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const rows: QualityAttention[] = [];
  for (const record of input.records) {
    if (record.organizationId !== input.organizationId) continue;
    if (record.status === "corrected") continue;
    const job = jobs.get(record.jobId);
    if (!job || job.status === "closed") continue;
    rows.push({
      id: record.id,
      jobId: job.id,
      jobName: job.name,
      kind: record.kind,
      name: record.name,
      status: record.status,
    });
  }
  const statusRank = { reopened: 0, open: 1 } as const;
  const kindRank = { deficiency: 0, rework: 1 } as const;
  return rows.sort(
    (left, right) =>
      statusRank[left.status] - statusRank[right.status] ||
      kindRank[left.kind] - kindRank[right.kind] ||
      left.jobName.localeCompare(right.jobName) ||
      left.name.localeCompare(right.name),
  );
}

export function qualityContextLabel(input: {
  jobIds: Iterable<string>;
  records: Pick<QualityRecord, "jobId" | "kind" | "name" | "status">[];
}): string {
  const jobIds = new Set(input.jobIds);
  const relevant = input.records.filter((record) => jobIds.has(record.jobId));
  if (relevant.length === 0) return "not available";
  const open = relevant.filter((record) => record.status !== "corrected");
  if (open.length === 0) return "clear";
  const statusRank = { reopened: 0, open: 1 } as const;
  const kindRank = { deficiency: 0, rework: 1 } as const;
  open.sort(
    (left, right) =>
      statusRank[left.status as "open" | "reopened"] -
        statusRank[right.status as "open" | "reopened"] ||
      kindRank[left.kind] - kindRank[right.kind] ||
      left.name.localeCompare(right.name),
  );
  const first = open[0]!;
  const label = `${qualityStatusLabel(first.status)} ${qualityKindLabel(first.kind).toLowerCase()} · ${first.name}`;
  return open.length > 1 ? `${label} · ${open.length} open` : label;
}
