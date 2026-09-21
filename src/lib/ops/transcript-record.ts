export type TranscriptRecordKind = "deficiency" | "blocker" | "material_request";

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
};

function sentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function classify(sentence: string): TranscriptRecordKind | null {
  const text = sentence.toLowerCase();
  if (/\b(deficien\w*|void|damage|damaged)\b/.test(text)) return "deficiency";
  if (/\b(hold|blocked|blocking|waiting)\b/.test(text)) return "blocker";
  if (/\b(material|bags?|closed-cell|request more)\b/.test(text)) return "material_request";
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
  return `Save a material request from ${filename}: "${selectedText}"`;
}

export function proposeTranscriptRecord(input: {
  voiceNoteId: string;
  filename: string;
  transcript: string;
  alreadyExtracted: boolean;
}): TranscriptRecordProposal | null {
  if (input.alreadyExtracted) return null;
  const transcript = input.transcript.trim();
  if (!transcript) return null;
  const matches = sentences(transcript).flatMap((sentence) => {
    const kind = classify(sentence);
    if (!kind) return [];
    return [{ sentence: sentence.slice(0, 4_000), kind }];
  });
  matches.sort((left, right) => KIND_RANK[left.kind] - KIND_RANK[right.kind]);
  const best = matches[0];
  if (!best) return null;
  return {
    voiceNoteId: input.voiceNoteId,
    filename: input.filename,
    kind: best.kind,
    selectedText: best.sentence,
    effect: effectFor(input.filename, best.kind, best.sentence),
  };
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

export function extractedVoiceNoteId(event: {
  kind: string;
  payload: unknown;
}): string | null {
  if (event.kind !== "voice_note_extracted") return null;
  if (!event.payload || typeof event.payload !== "object") return null;
  const voiceNoteId = (event.payload as { voiceNoteId?: unknown }).voiceNoteId;
  return typeof voiceNoteId === "string" ? voiceNoteId : null;
}
