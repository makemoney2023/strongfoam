import { handleJobVoiceGet } from "@/app/api/ops/jobs/[jobId]/voice/[voiceId]/route";
import { getFieldSession } from "@/lib/ops/field-auth";
import {
  canFieldUserAccessJob,
  getJobVoiceNoteDownload,
} from "@/lib/ops/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; voiceId: string }> },
): Promise<Response> {
  const params = await context.params;
  return handleJobVoiceGet(params, {
    getSession: getFieldSession,
    canAccessJob: async (session, jobId) =>
      Boolean(
        session.userId && (await canFieldUserAccessJob(session.userId, jobId)),
      ),
    getVoice: getJobVoiceNoteDownload,
  });
}
