import { isUuid } from "@/lib/ops/job-workspace";

export const VOICE_NOTE_SOURCES = [
  "job",
  "task",
  "annotation",
  "document",
  "daily_report",
] as const;
export type VoiceNoteSource = (typeof VOICE_NOTE_SOURCES)[number];

export const VOICE_NOTE_SOURCE_LABELS: Record<VoiceNoteSource, string> = {
  job: "Job",
  task: "Task",
  annotation: "Plan mark",
  document: "Document",
  daily_report: "Daily report",
};

export const VOICE_TRANSCRIPT_STATUSES = [
  "uploading",
  "queued",
  "processing",
  "completed",
  "failed",
] as const;
export type VoiceTranscriptStatus = (typeof VOICE_TRANSCRIPT_STATUSES)[number];

export const VOICE_TRANSCRIPT_STATUS_LABELS: Record<
  VoiceTranscriptStatus,
  string
> = {
  uploading: "Uploading",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const VOICE_EXTRACT_KINDS = [
  "task",
  "blocker",
  "deficiency",
  "material_request",
  "daily_report",
] as const;
export type VoiceExtractKind = (typeof VOICE_EXTRACT_KINDS)[number];

export const VOICE_EXTRACT_LABELS: Record<VoiceExtractKind, string> = {
  task: "Task",
  blocker: "Blocker",
  deficiency: "Deficiency",
  material_request: "Material request",
  daily_report: "Daily-log entry",
};

export const VOICE_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/x-wav",
] as const;

export const MAX_VOICE_UPLOAD_BYTES = 15 * 1024 * 1024;
export const DEFAULT_VOICE_RETENTION_DAYS = 365;
export const DEFAULT_VOICE_LANGUAGE = "en";

export type VoiceNoteInput = {
  source: VoiceNoteSource;
  workAreaId: string | null;
  taskId: string | null;
  annotationId: string | null;
  documentId: string | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  language: string;
  consentAt: Date;
};

export function isVoiceNoteSource(value: string): value is VoiceNoteSource {
  return VOICE_NOTE_SOURCES.includes(value as VoiceNoteSource);
}

export function isVoiceTranscriptStatus(
  value: string,
): value is VoiceTranscriptStatus {
  return VOICE_TRANSCRIPT_STATUSES.includes(value as VoiceTranscriptStatus);
}

export function isVoiceExtractKind(value: string): value is VoiceExtractKind {
  return VOICE_EXTRACT_KINDS.includes(value as VoiceExtractKind);
}

export function isVoiceAudioContentType(value: string): boolean {
  return (VOICE_AUDIO_TYPES as readonly string[]).includes(value);
}

export function inferVoiceContentType(file: {
  name: string;
  type: string;
}): string {
  if (isVoiceAudioContentType(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".webm")) return "audio/webm";
  if (name.endsWith(".m4a") || name.endsWith(".mp4")) return "audio/mp4";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".ogg")) return "audio/ogg";
  return file.type;
}

export function voiceRetentionDays(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number(env.VOICE_RETENTION_DAYS ?? DEFAULT_VOICE_RETENTION_DAYS);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_VOICE_RETENTION_DAYS;
  return parsed;
}

export function voiceConsentCopy(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.VOICE_CONSENT_NOTICE?.trim() ||
    `I have permission to record on this jobsite. Authorized Office and Field users on this job can play the audio and read the transcript. Recordings are kept for ${voiceRetentionDays(env)} days unless an authorized user deletes them sooner.`
  );
}

export function parseVoiceNoteInput(input: {
  source?: string;
  workAreaId?: string | null;
  taskId?: string | null;
  annotationId?: string | null;
  documentId?: string | null;
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  durationSeconds?: string | number | null;
  language?: string;
  consent?: string | boolean;
}):
  | { ok: true; value: VoiceNoteInput }
  | { ok: false; error: string; field?: string } {
  const source = input.source?.trim() || "job";
  if (!isVoiceNoteSource(source)) {
    return { ok: false, error: "Choose where this recording belongs.", field: "source" };
  }
  if (input.consent !== true && input.consent !== "on" && input.consent !== "true") {
    return {
      ok: false,
      error: "Confirm recording consent before saving a voice note.",
      field: "consent",
    };
  }

  const filename = input.filename?.trim() || "voice-note.webm";
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return { ok: false, error: "The recording filename is invalid.", field: "filename" };
  }
  const contentType = input.contentType?.trim() || "";
  if (!isVoiceAudioContentType(contentType)) {
    return {
      ok: false,
      error: "Record or upload a WebM, MP4, MP3, WAV, or OGG audio file.",
      field: "file",
    };
  }
  const sizeBytes = input.sizeBytes ?? 0;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "The recording is empty.", field: "file" };
  }
  if (sizeBytes > MAX_VOICE_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Voice notes must be 15 MB or smaller.",
      field: "file",
    };
  }

  const workAreaId = input.workAreaId?.trim() || null;
  if (workAreaId && !isUuid(workAreaId)) {
    return { ok: false, error: "Choose a valid work area.", field: "workAreaId" };
  }
  const taskId = input.taskId?.trim() || null;
  if (taskId && !isUuid(taskId)) {
    return { ok: false, error: "Choose a valid task.", field: "taskId" };
  }
  const annotationId = input.annotationId?.trim() || null;
  if (annotationId && !isUuid(annotationId)) {
    return { ok: false, error: "Choose a valid plan mark.", field: "annotationId" };
  }
  const documentId = input.documentId?.trim() || null;
  if (documentId && !isUuid(documentId)) {
    return { ok: false, error: "Choose a valid document.", field: "documentId" };
  }
  if (source === "task" && !taskId) {
    return { ok: false, error: "Choose the task this recording is about.", field: "taskId" };
  }
  if (source === "annotation" && !annotationId) {
    return { ok: false, error: "Choose the plan mark this recording is about.", field: "annotationId" };
  }
  if (source === "document" && !documentId) {
    return { ok: false, error: "Choose the document this recording is about.", field: "documentId" };
  }

  const durationRaw =
    typeof input.durationSeconds === "number"
      ? input.durationSeconds
      : Number(String(input.durationSeconds ?? "").trim());
  const durationSeconds =
    Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.round(durationRaw)
      : null;
  const language = input.language?.trim() || DEFAULT_VOICE_LANGUAGE;
  if (language.length > 16) {
    return { ok: false, error: "Choose a valid language.", field: "language" };
  }

  return {
    ok: true,
    value: {
      source,
      workAreaId,
      taskId,
      annotationId,
      documentId,
      filename,
      contentType,
      sizeBytes,
      durationSeconds,
      language,
      consentAt: new Date(),
    },
  };
}

export function parseVoiceTranscriptEdit(input: { transcript?: string }):
  | { ok: true; value: { transcript: string } }
  | { ok: false; error: string; field?: string } {
  const transcript = input.transcript?.trim() ?? "";
  if (!transcript) {
    return { ok: false, error: "Enter the corrected transcript.", field: "transcript" };
  }
  if (transcript.length > 8_000) {
    return {
      ok: false,
      error: "Transcripts must be 8,000 characters or fewer.",
      field: "transcript",
    };
  }
  return { ok: true, value: { transcript } };
}

export function parseVoiceExtractInput(input: {
  kind?: string;
  selectedText?: string;
}):
  | { ok: true; value: { kind: VoiceExtractKind; selectedText: string } }
  | { ok: false; error: string; field?: string } {
  const kind = input.kind?.trim() ?? "";
  if (!isVoiceExtractKind(kind)) {
    return { ok: false, error: "Choose what to create from this transcript.", field: "kind" };
  }
  const selectedText = input.selectedText?.trim() ?? "";
  if (!selectedText) {
    return {
      ok: false,
      error: "Select the transcript text to turn into a record.",
      field: "selectedText",
    };
  }
  if (selectedText.length > 4_000) {
    return {
      ok: false,
      error: "Selected transcript text must be 4,000 characters or fewer.",
      field: "selectedText",
    };
  }
  return { ok: true, value: { kind, selectedText } };
}

export function demoVoiceTranscript(input: {
  jobName: string;
  source: VoiceNoteSource;
  taskTitle?: string | null;
  annotationTitle?: string | null;
  documentName?: string | null;
}): { transcript: string; provider: string; model: string; confidence: number } {
  const about =
    input.annotationTitle ??
    input.taskTitle ??
    input.documentName ??
    input.jobName;
  const transcript =
    input.source === "daily_report"
      ? `Daily report for ${input.jobName}. Safety talk is complete. Closed-cell at ${about} is ready after lunch. Need more guns for the north elevation.`
      : `Voice note on ${input.jobName}. ${about} is in progress. Hold the south elevation for inspection and request more closed-cell if the next lift starts today.`;
  return {
    transcript,
    provider: "demo",
    model: "strongfoam-demo-stt",
    confidence: 0.86,
  };
}

export function officeVoiceHref(jobId: string, voiceId?: string): string {
  return `/api/ops/jobs/${jobId}/voice/${voiceId ?? ""}`.replace(/\/$/, "");
}

export function fieldVoiceHref(jobId: string, voiceId: string): string {
  return `/api/field/jobs/${jobId}/voice/${voiceId}`;
}

export function officeVoicePageHref(jobId: string): string {
  return `/app/jobs/${jobId}#voice-notes`;
}

export function fieldVoicePageHref(jobId: string): string {
  return `/field/jobs/${jobId}#voice-notes`;
}
