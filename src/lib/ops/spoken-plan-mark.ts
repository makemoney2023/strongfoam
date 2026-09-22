import type { PlanAnnotationStatus } from "@/lib/ops/plan-markup";

export type SpokenPlanProposal = {
  voiceNoteId: string;
  filename: string;
  documentId: string;
  pageNumber: number;
  x: number;
  y: number;
  kind: "pin";
  status: PlanAnnotationStatus;
  title: string;
  body: string;
  taskId: string | null;
  taskTitle: string | null;
  effect: string;
};

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 3) ?? [];
}

export function inferSpokenMarkStatus(transcript: string): PlanAnnotationStatus {
  const text = transcript.toLowerCase();
  if (/\b(deficien\w*|void|damage|damaged)\b/.test(text)) return "deficiency";
  if (/\b(hold|blocked|blocking|waiting)\b/.test(text)) return "blocked";
  if (/\b(done|complete|completed|finished)\b/.test(text)) return "completed";
  if (/\b(progress|started|install|installing)\b/.test(text)) return "in_progress";
  return "planned";
}

function markTitle(transcript: string): string {
  const sentence = transcript.trim().split(/[.!?]/)[0]?.trim() ?? "";
  const collapsed = sentence.replace(/\s+/g, " ");
  return collapsed.slice(0, 80) || "Spoken plan mark";
}

function matchingTask(
  transcript: string,
  tasks: Array<{ id: string; title: string; status: string }>,
): { id: string; title: string } | null {
  const transcriptWords = new Set(words(transcript));
  let best: { id: string; title: string; score: number } | null = null;
  for (const task of tasks) {
    if (task.status === "done") continue;
    const titleWords = words(task.title);
    if (!titleWords.length || !titleWords.every((word) => transcriptWords.has(word))) {
      continue;
    }
    if (!best || titleWords.length > best.score) {
      best = { id: task.id, title: task.title, score: titleWords.length };
    }
  }
  return best ? { id: best.id, title: best.title } : null;
}

export function proposeSpokenPlanMark(input: {
  voiceNoteId: string;
  filename: string;
  transcript: string;
  documentId: string;
  tasks: Array<{ id: string; title: string; status: string }>;
}): SpokenPlanProposal | null {
  const transcript = input.transcript.trim();
  if (!transcript) return null;
  const status = inferSpokenMarkStatus(transcript);
  const title = markTitle(transcript);
  const task = matchingTask(transcript, input.tasks);
  const taskText = task ? `linked to ${task.title}` : "with no task";
  return {
    voiceNoteId: input.voiceNoteId,
    filename: input.filename,
    documentId: input.documentId,
    pageNumber: 1,
    x: 0.5,
    y: 0.5,
    kind: "pin",
    status,
    title,
    body: transcript.slice(0, 2_000),
    taskId: task?.id ?? null,
    taskTitle: task?.title ?? null,
    effect: `Place a pin titled "${title}" with status ${status.replaceAll("_", " ")} at the center of page 1, ${taskText}, and attach ${input.filename}.`,
  };
}

export function spokenPlanMarkMatches(
  proposal: SpokenPlanProposal,
  approval: Pick<
    SpokenPlanProposal,
    | "documentId"
    | "pageNumber"
    | "x"
    | "y"
    | "kind"
    | "status"
    | "title"
    | "body"
    | "taskId"
    | "effect"
  >,
): boolean {
  return (
    proposal.documentId === approval.documentId &&
    proposal.pageNumber === approval.pageNumber &&
    proposal.x === approval.x &&
    proposal.y === approval.y &&
    proposal.kind === approval.kind &&
    proposal.status === approval.status &&
    proposal.title === approval.title &&
    proposal.body === approval.body &&
    proposal.taskId === approval.taskId &&
    proposal.effect === approval.effect
  );
}
