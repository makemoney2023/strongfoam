import { del, head } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { handleJobUploadPost } from "@/app/api/ops/job-uploads/route";
import { getFieldSession } from "@/lib/ops/field-auth";
import {
  canFieldUserAccessJob,
  getJob,
  listWorkAreas,
  recordUploadedJobDocument,
} from "@/lib/ops/store";

export async function POST(request: Request): Promise<Response> {
  return handleJobUploadPost(request, {
    handleUpload,
    getSession: getFieldSession,
    canAccessJob: async (session, jobId) =>
      Boolean(
        session.userId &&
          (await canFieldUserAccessJob(session.userId, jobId)),
      ),
    getJob,
    listWorkAreas,
    getBlobMetadata: head,
    deleteBlob: del,
    recordDocument: recordUploadedJobDocument,
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
  });
}
