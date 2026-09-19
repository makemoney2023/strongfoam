import { getOpsSession } from "@/lib/ops/auth";
import { getJobDocumentDownload } from "@/lib/ops/store";

export type JobDocumentGetDeps = {
  getSession: () => Promise<{ email: string } | null>;
  getDocument: (
    jobId: string,
    documentId: string,
  ) => Promise<{
    filename: string;
    contentType: string;
    bytes: Uint8Array;
  } | null>;
};

export async function handleJobDocumentGet(
  params: { jobId: string; documentId: string },
  deps: JobDocumentGetDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const document = await deps.getDocument(params.jobId, params.documentId);
  if (!document) {
    return new Response(null, { status: 404 });
  }

  const filename = document.filename.replace(/"/g, "");
  return new Response(Buffer.from(document.bytes), {
    status: 200,
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; documentId: string }> },
): Promise<Response> {
  const params = await context.params;
  return handleJobDocumentGet(params, {
    getSession: getOpsSession,
    getDocument: getJobDocumentDownload,
  });
}
