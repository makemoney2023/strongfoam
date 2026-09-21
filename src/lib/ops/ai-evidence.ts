export const CITATION_KINDS = [
  "task",
  "field_note",
  "voice_note",
  "plan_mark",
  "job_event",
] as const;

export type CitationKind = (typeof CITATION_KINDS)[number];

export type Citation = {
  kind: CitationKind;
  id: string;
};

export type EvidenceTask = {
  id: string;
  title: string;
  status: string;
  dueAt: Date | null;
  plannedEndAt: Date | null;
  createdAt: Date;
};

export type EvidenceFieldNote = {
  id: string;
  kind: string;
  body: string;
  quantity: number | null;
  unit: string | null;
  taskId: string | null;
  workAreaId: string | null;
  createdAt: Date;
};

export type EvidenceVoiceNote = {
  id: string;
  status: string;
  transcript: string | null;
  source: string;
  taskId: string | null;
  filename: string;
  createdAt: Date;
};

export type EvidencePlanMark = {
  id: string;
  title: string;
  status: string;
  pageNumber: number;
  documentId: string;
  taskId: string | null;
  voidedAt: Date | null;
  createdAt: Date;
};

export type EvidenceEvent = {
  id: string;
  kind: string;
  summary: string;
  createdAt: Date;
};

export type JobEvidencePack = {
  job: { id: string; name: string; status: string };
  timeZone: string;
  workingDay: string;
  tasks: EvidenceTask[];
  fieldNotes: EvidenceFieldNote[];
  voiceNotes: EvidenceVoiceNote[];
  planMarks: EvidencePlanMark[];
  events: EvidenceEvent[];
};

const FIELD_NOTE_CAP = 40;
const VOICE_NOTE_CAP = 20;
const EVENT_CAP = 20;

export function workingDayLabel(now: Date, timeZone = "America/Toronto"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function newest<T extends { createdAt: Date }>(items: T[], cap: number): T[] {
  return [...items]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, cap);
}

export function isCitationKind(value: string): value is CitationKind {
  return CITATION_KINDS.includes(value as CitationKind);
}

export function buildJobEvidencePack(input: {
  job: { id: string; name: string; status: string };
  tasks: EvidenceTask[];
  fieldNotes: EvidenceFieldNote[];
  voiceNotes: EvidenceVoiceNote[];
  planMarks: EvidencePlanMark[];
  events: EvidenceEvent[];
  now?: Date;
  timeZone?: string;
}): JobEvidencePack {
  const timeZone = input.timeZone?.trim() || "America/Toronto";
  const now = input.now ?? new Date();
  return {
    job: input.job,
    timeZone,
    workingDay: workingDayLabel(now, timeZone),
    tasks: input.tasks.filter((task) => task.status !== "done"),
    fieldNotes: newest(input.fieldNotes, FIELD_NOTE_CAP),
    voiceNotes: newest(input.voiceNotes, VOICE_NOTE_CAP),
    planMarks: input.planMarks.filter((mark) => !mark.voidedAt),
    events: newest(input.events, EVENT_CAP),
  };
}

export function filterCitations(
  citations: Citation[],
  pack: JobEvidencePack,
): Citation[] {
  const ids = new Set<string>();
  for (const task of pack.tasks) ids.add(`task:${task.id}`);
  for (const note of pack.fieldNotes) ids.add(`field_note:${note.id}`);
  for (const note of pack.voiceNotes) ids.add(`voice_note:${note.id}`);
  for (const mark of pack.planMarks) ids.add(`plan_mark:${mark.id}`);
  for (const event of pack.events) ids.add(`job_event:${event.id}`);
  return citations.filter(
    (citation) =>
      isCitationKind(citation.kind) && ids.has(`${citation.kind}:${citation.id}`),
  );
}

export function citationHref(jobId: string, kind: CitationKind): string {
  const anchor =
    kind === "task"
      ? "tasks"
      : kind === "field_note"
        ? "field-log"
        : kind === "voice_note"
          ? "voice-notes"
          : kind === "plan_mark"
            ? "plan"
            : "activity";
  return `/app/jobs/${jobId}#${anchor}`;
}

export type DailyReportSections = {
  completed: string;
  held: string;
  material: string;
  next: string;
};

export function assembleDailyReportBody(sections: DailyReportSections): string {
  const body = [
    "Completed",
    sections.completed.trim() || "None.",
    "",
    "Held",
    sections.held.trim() || "None.",
    "",
    "Material",
    sections.material.trim() || "None.",
    "",
    "Next",
    sections.next.trim() || "None.",
  ].join("\n");
  return body.slice(0, 4_000);
}
