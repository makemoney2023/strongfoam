export const CLOSEOUT_STATUSES = ["preparing", "ready", "signed"] as const;

export type CloseoutStatus = (typeof CLOSEOUT_STATUSES)[number];

export const CLOSEOUT_NOTE_LIMIT = 500;

export type Closeout = {
  id: string;
  organizationId: string;
  jobId: string;
  status: CloseoutStatus;
  note: string;
  packetText: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CloseoutAttention = {
  id: string;
  jobId: string;
  jobName: string;
  status: Exclude<CloseoutStatus, "signed">;
};

const STATUS_LABELS: Record<CloseoutStatus, string> = {
  preparing: "Preparing",
  ready: "Ready",
  signed: "Signed",
};

export function closeoutStatusLabel(status: CloseoutStatus): string {
  return STATUS_LABELS[status];
}

export function parseCloseoutStatus(
  value: string | undefined,
): { ok: true; value: CloseoutStatus } | { ok: false; error: string } {
  if (value === "preparing" || value === "ready" || value === "signed") {
    return { ok: true, value };
  }
  return { ok: false, error: "Choose preparing, ready, or signed." };
}

export function parseCloseoutNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > CLOSEOUT_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${CLOSEOUT_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function closeoutCanBeSigned(
  inspections: { result: "open" | "passed" | "failed" }[],
): boolean {
  return inspections.every((inspection) => inspection.result === "passed");
}

export function formatCloseoutAttention(item: CloseoutAttention): string {
  return `${closeoutStatusLabel(item.status)} · ${item.jobName}`;
}

export function buildCloseoutAttention(input: {
  organizationId: string;
  jobs: { id: string; name: string; status: string; organizationId: string }[];
  closeouts: Closeout[];
}): CloseoutAttention[] {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const rows: CloseoutAttention[] = [];
  for (const closeout of input.closeouts) {
    if (closeout.organizationId !== input.organizationId) continue;
    if (closeout.status === "signed") continue;
    const job = jobs.get(closeout.jobId);
    if (!job || job.status === "closed") continue;
    rows.push({
      id: closeout.id,
      jobId: job.id,
      jobName: job.name,
      status: closeout.status,
    });
  }
  const rank = { ready: 0, preparing: 1 } as const;
  return rows.sort(
    (left, right) =>
      rank[left.status] - rank[right.status] || left.jobName.localeCompare(right.jobName),
  );
}
