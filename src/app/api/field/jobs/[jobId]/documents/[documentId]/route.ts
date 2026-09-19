import { handleJobDocumentGet } from "@/app/api/ops/jobs/[jobId]/documents/[documentId]/route";
import { getFieldSession } from "@/lib/ops/field-auth";
import {
  canFieldUserAccessJob,
  getJobDocumentDownload,
} from "@/lib/ops/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; documentId: string }> },
): Promise<Response> {
  const params = await context.params;
  return handleJobDocumentGet(params, {
    getSession: getFieldSession,
    canAccessJob: async (session, jobId) =>
      Boolean(
        session.userId &&
          (await canFieldUserAccessJob(session.userId, jobId)),
      ),
    getDocument: getJobDocumentDownload,
  });
}
