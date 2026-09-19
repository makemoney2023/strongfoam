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
  const kind = input.kind?.trim() || "area";
  if (!isWorkAreaKind(kind)) {
    return { ok: false, error: "Choose a valid work area type." };
  }
  return {
    ok: true,
    value: {
      name,
      kind,
      notes: input.notes?.trim() || null,
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
  return {
    ok: true,
    value: {
      ...parsed.value,
      workAreaId: input.workAreaId?.trim() || null,
    },
  };
}

export function sanitizeJobDocumentFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;
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
  workAreaId?: string;
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
  return {
    ok: true,
    value: {
      filename,
      contentType,
      sizeBytes,
      kind,
      workAreaId: input.workAreaId?.trim() || null,
    },
  };
}

export function jobDocumentHref(jobId: string, documentId: string): string {
  return `/api/ops/jobs/${jobId}/documents/${documentId}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
