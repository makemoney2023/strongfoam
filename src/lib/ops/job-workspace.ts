import {
  MAX_UPLOAD_BYTES,
  isAllowedUploadContentType,
} from "@/lib/leads/uploads";
import { parseTaskInput } from "@/lib/ops/collaboration";

export const WORK_AREA_KINDS = [
  "area",
  "room",
  "floor",
  "unit",
  "zone",
  "phase",
] as const;

export type WorkAreaKind = (typeof WORK_AREA_KINDS)[number];

export const WORK_AREA_LABELS: Record<WorkAreaKind, string> = {
  area: "Area",
  room: "Room",
  floor: "Floor",
  unit: "Unit",
  zone: "Zone",
  phase: "Phase",
};

export const JOB_DOCUMENT_KINDS = ["plan", "photo", "other"] as const;
export type JobDocumentKind = (typeof JOB_DOCUMENT_KINDS)[number];

export const JOB_DOCUMENT_LABELS: Record<JobDocumentKind, string> = {
  plan: "Plan / blueprint",
  photo: "Photo",
  other: "Other",
};

export type WorkAreaInput = {
  name: string;
  kind: WorkAreaKind;
  notes: string | null;
};

export type JobTaskInput = {
  title: string;
  assignee: string | null;
  dueAt: Date | null;
  workAreaId: string | null;
};

export type JobDocumentInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: JobDocumentKind;
  workAreaId: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_NOTES_LENGTH = 2_000;
const MAX_FILENAME_LENGTH = 180;

const CONTENT_TYPE_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isWorkAreaKind(value: string): value is WorkAreaKind {
  return WORK_AREA_KINDS.includes(value as WorkAreaKind);
}

export function isJobDocumentKind(value: string): value is JobDocumentKind {
  return JOB_DOCUMENT_KINDS.includes(value as JobDocumentKind);
}

export function parseWorkAreaInput(input: {
  name?: string;
  kind?: string;
  notes?: string;
}): { ok: true; value: WorkAreaInput } | { ok: false; error: string } {
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "A work area name is required." };
  if (name.length > MAX_SHORT_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Work area names must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer.`,
    };
  }
  const kind = input.kind?.trim() || "area";
  if (!isWorkAreaKind(kind)) {
    return { ok: false, error: "Choose a valid work area type." };
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return {
      ok: false,
      error: `Work area notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
    };
  }
  return {
    ok: true,
    value: {
      name,
      kind,
      notes,
    },
  };
}

export function parseJobTaskInput(input: {
  title?: string;
  assignee?: string;
  dueAt?: string;
  workAreaId?: string;
}): { ok: true; value: JobTaskInput } | { ok: false; error: string } {
  const parsed = parseTaskInput({
    title: input.title,
    assignee: input.assignee,
    dueAt: input.dueAt,
  });
  if (!parsed.ok) return parsed;
  if (parsed.value.title.length > MAX_SHORT_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Task titles must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer.`,
    };
  }
  if (
    parsed.value.assignee &&
    parsed.value.assignee.length > MAX_SHORT_TEXT_LENGTH
  ) {
    return {
      ok: false,
      error: `Assignee names must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer.`,
    };
  }
  const workAreaId = input.workAreaId?.trim() || null;
  if (workAreaId && !isUuid(workAreaId)) {
    return { ok: false, error: "Choose a valid work area." };
  }
  return {
    ok: true,
    value: {
      ...parsed.value,
      workAreaId,
    },
  };
}

export function sanitizeJobDocumentFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FILENAME_LENGTH || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return null;
  }
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\")
  ) {
    return null;
  }
  return trimmed;
}

export function parseJobDocumentInput(input: {
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  kind?: string;
  workAreaId?: string | null;
}): { ok: true; value: JobDocumentInput } | { ok: false; error: string } {
  const filename = sanitizeJobDocumentFilename(input.filename ?? "");
  if (!filename) {
    return { ok: false, error: "A document filename is required." };
  }
  const contentType = input.contentType ?? "";
  if (!isAllowedUploadContentType(contentType)) {
    return {
      ok: false,
      error: "Upload a PDF, JPEG, PNG, or WebP file.",
    };
  }
  if (
    !CONTENT_TYPE_EXTENSIONS[contentType]?.some((extension) =>
      filename.toLowerCase().endsWith(extension),
    )
  ) {
    return {
      ok: false,
      error: "The filename extension does not match the document type.",
    };
  }
  const sizeBytes = input.sizeBytes ?? 0;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "The document is empty." };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Each document must be 25 MB or smaller." };
  }
  const kind = input.kind?.trim() || "plan";
  if (!isJobDocumentKind(kind)) {
    return { ok: false, error: "Choose a valid document type." };
  }
  const workAreaId = input.workAreaId?.trim() || null;
  if (workAreaId && !isUuid(workAreaId)) {
    return { ok: false, error: "Choose a valid work area." };
  }
  return {
    ok: true,
    value: {
      filename,
      contentType,
      sizeBytes,
      kind,
      workAreaId,
    },
  };
}

export function parseJobDocumentMeta(input: {
  kind?: string;
  workAreaId?: string | null;
}):
  | { ok: true; value: { kind: JobDocumentKind; workAreaId: string | null } }
  | { ok: false; error: string } {
  const kind = input.kind?.trim() || "plan";
  if (!isJobDocumentKind(kind)) {
    return { ok: false, error: "Choose a valid document type." };
  }
  const workAreaId = input.workAreaId?.trim() || null;
  if (workAreaId && !isUuid(workAreaId)) {
    return { ok: false, error: "Choose a valid work area." };
  }
  return { ok: true, value: { kind, workAreaId } };
}

export function isOwnedJobUploadPath(jobId: string, pathname: string): boolean {
  if (!isUuid(jobId) || pathname.includes("..") || pathname.startsWith("/")) {
    return false;
  }
  return pathname.startsWith(`jobs/${jobId}/`);
}

export function hasAllowedJobDocumentSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  if (contentType === "application/pdf") {
    return (
      bytes.length >= 5 &&
      String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
    );
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => bytes[index] === byte);
  }
  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export function sortJobTaskRows<
  T extends { status: string; dueAt: Date | null; createdAt: Date },
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function jobDocumentHref(jobId: string, documentId: string): string {
  return `/api/ops/jobs/${jobId}/documents/${documentId}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
