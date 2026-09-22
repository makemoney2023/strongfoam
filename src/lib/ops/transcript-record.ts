export type TranscriptRecordKind =
  | "deficiency"
  | "blocker"
  | "material_request"
  | "task";

export type TranscriptRecordProposal = {
  voiceNoteId: string;
  filename: string;
  kind: TranscriptRecordKind;
  selectedText: string;
  effect: string;
};

const KIND_RANK: Record<TranscriptRecordKind, number> = {
  deficiency: 0,
  blocker: 1,
  material_request: 2,
  task: 3,
};

function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 3) ?? [];
}

function sentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function narratesOpenTask(
  sentence: string,
  tasks: Array<{ title: string; status: string }>,
): boolean {
  const sentenceWords = new Set(words(sentence));
  return tasks.some((task) => {
    if (task.status === "done") return false;
    const titleWords = words(task.title);
    return titleWords.length > 0 && titleWords.every((word) => sentenceWords.has(word));
  });
}

function classify(
  sentence: string,
  tasks: Array<{ title: string; status: string }>,
): TranscriptRecordKind | null {
  const text = sentence.toLowerCase();
  if (/\b(deficien\w*|void|damage|damaged)\b/.test(text)) return "deficiency";
  if (/\b(hold|blocked|blocking|waiting)\b/.test(text)) return "blocker";
  if (/\b(material|bags?)\b/.test(text) || /\b(request|need) more\b/.test(text)) {
    return "material_request";
  }
  if (/\b(in progress|is done|was done|completed|finished)\b/.test(text)) return null;
  if (
    /^(please\s+)?(install|prepare|tape|spray|cover|inspect|clean|mask|seal|cut|hang|protect)\b/.test(
      text,
    ) &&
    !narratesOpenTask(sentence, tasks)
  ) {
    return "task";
  }
  return null;
}

function effectFor(
  filename: string,
  kind: TranscriptRecordKind,
  selectedText: string,
): string {
  if (kind === "blocker") {
    return `Save a blocker from ${filename}: "${selectedText}" The job is marked blocked.`;
  }
  if (kind === "deficiency") {
    return `Save a deficiency from ${filename}: "${selectedText}"`;
  }
  if (kind === "material_request") {
    return `Save a material request from ${filename}: "${selectedText}"`;
  }
  return `Create a task from ${filename}: "${selectedText}"`;
}

export function listTranscriptRecords(input: {
  voiceNoteId: string;
  filename: string;
  transcript: string;
  savedTexts?: string[];
  legacyExtracted?: boolean;
  tasks?: Array<{ title: string; status: string }>;
}): TranscriptRecordProposal[] {
  if (input.legacyExtracted) return [];
  const transcript = input.transcript.trim();
  if (!transcript) return [];
  const saved = new Set(input.savedTexts ?? []);
  const tasks = input.tasks ?? [];
  const matches = sentences(transcript).flatMap((sentence) => {
    if (saved.has(sentence)) return [];
    const clipped = sentence.slice(0, 4_000);
    const kind = classify(clipped, tasks);
    if (!kind) return [];
    return [{ sentence: clipped, kind }];
  });
  matches.sort((left, right) => KIND_RANK[left.kind] - KIND_RANK[right.kind]);
  return matches.map((match) => ({
    voiceNoteId: input.voiceNoteId,
    filename: input.filename,
    kind: match.kind,
    selectedText: match.sentence,
    effect: effectFor(input.filename, match.kind, match.sentence),
  }));
}

export function proposeTranscriptRecord(input: {
  voiceNoteId: string;
  filename: string;
  transcript: string;
  savedTexts?: string[];
  legacyExtracted?: boolean;
  tasks?: Array<{ title: string; status: string }>;
}): TranscriptRecordProposal | null {
  return listTranscriptRecords(input)[0] ?? null;
}

export function transcriptRecordMatches(
  proposal: TranscriptRecordProposal,
  approval: TranscriptRecordProposal,
): boolean {
  return (
    proposal.voiceNoteId === approval.voiceNoteId &&
    proposal.filename === approval.filename &&
    proposal.kind === approval.kind &&
    proposal.selectedText === approval.selectedText &&
    proposal.effect === approval.effect
  );
}

export function savedTranscriptSelections(
  events: Array<{ kind: string; payload: unknown }>,
  voiceNoteId: string,
): { legacy: boolean; texts: string[] } {
  let legacy = false;
  const texts: string[] = [];
  for (const event of events) {
    if (event.kind !== "voice_note_extracted") continue;
    if (!event.payload || typeof event.payload !== "object") continue;
    const payload = event.payload as {
      voiceNoteId?: unknown;
      selectedText?: unknown;
    };
    if (payload.voiceNoteId !== voiceNoteId) continue;
    if (typeof payload.selectedText === "string" && payload.selectedText.trim()) {
      texts.push(payload.selectedText);
    } else {
      legacy = true;
    }
  }
  return { legacy, texts };
}
