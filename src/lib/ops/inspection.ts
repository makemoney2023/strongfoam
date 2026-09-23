export const INSPECTION_RESULTS = ["open", "passed", "failed"] as const;

export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const INSPECTION_NAME_LIMIT = 80;
export const INSPECTION_NOTE_LIMIT = 500;

export type Inspection = {
  id: string;
  organizationId: string;
  jobId: string;
  name: string;
  nameKey: string;
  result: InspectionResult;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InspectionAttention = {
  id: string;
  jobId: string;
  jobName: string;
  name: string;
  result: Exclude<InspectionResult, "passed">;
};

const RESULT_LABELS: Record<InspectionResult, string> = {
  open: "Open",
  passed: "Passed",
  failed: "Failed",
};

export function inspectionResultLabel(result: InspectionResult): string {
  return RESULT_LABELS[result];
}

export function parseInspectionName(
  value: string | undefined,
): { ok: true; name: string; nameKey: string } | { ok: false; error: string } {
  const name = (value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Enter the inspection name." };
  if (name.length > INSPECTION_NAME_LIMIT) {
    return {
      ok: false,
      error: `Keep the inspection name under ${INSPECTION_NAME_LIMIT} characters.`,
    };
  }
  return { ok: true, name, nameKey: name.toLowerCase() };
}

export function parseInspectionResult(
  value: string | undefined,
): { ok: true; value: InspectionResult } | { ok: false; error: string } {
  if (value === "open" || value === "passed" || value === "failed") {
    return { ok: true, value };
  }
  return { ok: false, error: "Choose open, passed, or failed." };
}

export function parseInspectionNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > INSPECTION_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${INSPECTION_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function formatInspectionAttention(item: InspectionAttention): string {
  return `${inspectionResultLabel(item.result)} · ${item.name} · ${item.jobName}`;
}

export function buildInspectionAttention(input: {
  organizationId: string;
  jobs: { id: string; name: string; status: string; organizationId: string }[];
  inspections: Inspection[];
}): InspectionAttention[] {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const rows: InspectionAttention[] = [];
  for (const inspection of input.inspections) {
    if (inspection.organizationId !== input.organizationId) continue;
    if (inspection.result === "passed") continue;
    const job = jobs.get(inspection.jobId);
    if (!job || job.status === "closed") continue;
    rows.push({
      id: inspection.id,
      jobId: job.id,
      jobName: job.name,
      name: inspection.name,
      result: inspection.result,
    });
  }
  const rank = { failed: 0, open: 1 } as const;
  return rows.sort(
    (left, right) =>
      rank[left.result] - rank[right.result] ||
      left.jobName.localeCompare(right.jobName) ||
      left.name.localeCompare(right.name),
  );
}
