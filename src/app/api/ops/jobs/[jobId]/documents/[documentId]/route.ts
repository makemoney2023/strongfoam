import { getOpsSession } from "@/lib/ops/auth";
import { getJobDocumentDownload } from "@/lib/ops/store";

export type JobDocumentGetDeps = {
  getSession: () => Promise<{ email: string; userId?: string } | null>;
  canAccessJob?: (
    session: { email: string; userId?: string },
    jobId: string,
  ) => Promise<boolean>;
  getDocument: (
    jobId: string,
    documentId: string,
  ) => Promise<{
    filename: string;
    contentType: string;
  } & (
    | { kind: "bytes"; bytes: Uint8Array }
    | { kind: "redirect"; url: string }
  ) | null>;
};

export async function handleJobDocumentGet(
  params: { jobId: string; documentId: string },
  deps: JobDocumentGetDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }
  if (
    deps.canAccessJob &&
    !(await deps.canAccessJob(session, params.jobId))
  ) {
    return new Response(null, { status: 404 });
  }

  const document = await deps.getDocument(params.jobId, params.documentId);
  if (!document) {
    return new Response(null, { status: 404 });
  }

  if (document.kind === "redirect") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: document.url,
        "Cache-Control": "private, no-store",
      },
    });
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
