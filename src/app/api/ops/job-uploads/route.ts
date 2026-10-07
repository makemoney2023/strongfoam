import { del, head } from "@vercel/blob";
import { isDirectUpload, readDirectUpload } from "@/lib/cloudflare/direct-upload";
import { deletePrivateObject, writePrivateObject } from "@/lib/cloudflare/private-objects";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getOpsSession } from "@/lib/ops/auth";
import {
  isJobDocumentKind,
  isOwnedJobUploadPath,
  isUuid,
  parseJobDocumentInput,
  sanitizeJobDocumentFilename,
} from "@/lib/ops/job-workspace";
import {
  getJob,
  listWorkAreas,
  recordUploadedJobDocument,
} from "@/lib/ops/store";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/leads/uploads";

type JobUploadPayload = {
  jobId: string;
  workAreaId: string | null;
  kind: string;
  filename: string;
  actor: string;
  replacesDocumentId: string | null;
};

function parsePayload(value: string | null): JobUploadPayload | null {
  try {
    const payload = JSON.parse(value ?? "{}") as Partial<JobUploadPayload>;
    const filename = sanitizeJobDocumentFilename(payload.filename ?? "");
    const workAreaId = payload.workAreaId?.trim() || null;
    const replacesDocumentId = payload.replacesDocumentId?.trim() || null;
    if (
      typeof payload.jobId !== "string" ||
      !isUuid(payload.jobId) ||
      !filename ||
      typeof payload.kind !== "string" ||
      !isJobDocumentKind(payload.kind) ||
      (workAreaId !== null && !isUuid(workAreaId)) ||
      (replacesDocumentId !== null && !isUuid(replacesDocumentId)) ||
      typeof payload.actor !== "string" ||
      !payload.actor
    ) {
      return null;
    }
    return {
      jobId: payload.jobId,
      workAreaId,
      kind: payload.kind,
      filename,
      actor: payload.actor,
      replacesDocumentId,
    };
  } catch {
    return null;
  }
}

export type JobUploadPostDeps = {
  handleUpload: (options: Parameters<typeof handleUpload>[0]) => ReturnType<
    typeof handleUpload
  >;
  getSession: () => Promise<{ email: string; userId?: string } | null>;
  canAccessJob?: (
    session: { email: string; userId?: string },
    jobId: string,
  ) => Promise<boolean>;
  getJob: typeof getJob;
  listWorkAreas: typeof listWorkAreas;
  getBlobMetadata: typeof head;
  deleteBlob: typeof del;
  recordDocument: typeof recordUploadedJobDocument;
  blobToken?: string;
};

const defaultDeps: JobUploadPostDeps = {
  handleUpload,
  getSession: getOpsSession,
  getJob,
  listWorkAreas,
  getBlobMetadata: head,
  deleteBlob: del,
  recordDocument: recordUploadedJobDocument,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
};

export async function handleDirectJobUpload(
  request: Request,
  deps: JobUploadPostDeps = defaultDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const upload = await readDirectUpload(request);
  if (!isDirectUpload(upload)) {
    return Response.json({ error: upload.error }, { status: 400 });
  }
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(upload.clientPayload || "{}") as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_job_upload" }, { status: 400 });
  }
  const payload = parsePayload(JSON.stringify({ ...raw, actor: session.email }));
  if (!payload || !isOwnedJobUploadPath(payload.jobId, upload.pathname)) {
    return Response.json({ error: "invalid_job_upload" }, { status: 400 });
  }
  if (!(await deps.getJob(payload.jobId))) {
    return Response.json({ error: "job_not_found" }, { status: 404 });
  }
  if (upload.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 400 });
  }
  const stored = await writePrivateObject(upload.pathname, upload.bytes, upload.contentType);
  if (!stored) {
    return Response.json({ error: "Job document storage is not configured." }, { status: 503 });
  }
  const parsed = parseJobDocumentInput({
    filename: payload.filename,
    contentType: upload.contentType,
    sizeBytes: upload.bytes.byteLength,
    kind: payload.kind,
    workAreaId: payload.workAreaId ?? "",
    replacesDocumentId: payload.replacesDocumentId ?? "",
  });
  if (!parsed.ok) {
    await deletePrivateObject(upload.pathname);
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const document = await deps.recordDocument({
      jobId: payload.jobId,
      actor: payload.actor,
      input: parsed.value,
      pathname: upload.pathname,
      storage: stored,
    });
    if (!document) throw new Error("job_document_not_saved");
  } catch (error) {
    await deletePrivateObject(upload.pathname);
    return Response.json(
      { error: error instanceof Error ? error.message : "job_document_not_saved" },
      { status: 400 },
    );
  }
  return Response.json({ pathname: upload.pathname });
}

export async function handleJobUploadPost(
  request: Request,
  deps: JobUploadPostDeps = defaultDeps,
): Promise<Response> {
  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return handleDirectJobUpload(request, deps);
  }
  if (!deps.blobToken) {
    return Response.json(
      { error: "Job document storage is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  const session =
    body.type === "blob.generate-client-token"
      ? await deps.getSession()
      : null;
  if (body.type === "blob.generate-client-token" && !session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const response = await deps.handleUpload({
      body,
      request,
      token: deps.blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const raw = JSON.parse(clientPayload ?? "{}") as Record<
          string,
          unknown
        >;
        const payload = parsePayload(
          JSON.stringify({ ...raw, actor: session?.email ?? "" }),
        );
        if (!payload || !isOwnedJobUploadPath(payload.jobId, pathname)) {
          throw new Error("invalid_job_upload");
        }
        if (!(await deps.getJob(payload.jobId))) {
          throw new Error("job_not_found");
        }
        if (
          session &&
          deps.canAccessJob &&
          !(await deps.canAccessJob(session, payload.jobId))
        ) {
          throw new Error("job_access_denied");
        }
        if (payload.workAreaId) {
          const areas = await deps.listWorkAreas(payload.jobId);
          if (!areas.some((area) => area.id === payload.workAreaId)) {
            throw new Error("work_area_not_found");
          }
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify(payload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload ?? null);
        if (!payload || !isOwnedJobUploadPath(payload.jobId, blob.pathname)) {
          throw new Error("invalid_job_upload");
        }
        const metadata = await deps.getBlobMetadata(blob.pathname, {
          token: deps.blobToken,
        });
        const parsed = parseJobDocumentInput({
          filename: payload.filename,
          contentType: metadata.contentType,
          sizeBytes: metadata.size,
          kind: payload.kind,
          workAreaId: payload.workAreaId ?? "",
          replacesDocumentId: payload.replacesDocumentId ?? "",
        });
        if (!parsed.ok) throw new Error("invalid_job_document");

        try {
          const document = await deps.recordDocument({
            jobId: payload.jobId,
            actor: payload.actor,
            input: parsed.value,
            pathname: blob.pathname,
          });
          if (!document) throw new Error("job_document_not_saved");
        } catch (error) {
          try {
            await deps.deleteBlob(blob.pathname, { token: deps.blobToken });
          } catch (cleanupError) {
            console.error("Could not clean up an orphaned job document.", cleanupError);
          }
          throw error;
        }
      },
    });
    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleJobUploadPost(request);
}
