import { getOpsSession } from "@/lib/ops/auth";
import { getJobVoiceNoteDownload } from "@/lib/ops/store";

export type JobVoiceGetDeps = {
  getSession: () => Promise<{ email: string; userId?: string } | null>;
  canAccessJob?: (
    session: { email: string; userId?: string },
    jobId: string,
  ) => Promise<boolean>;
  getVoice: (
    jobId: string,
    voiceId: string,
  ) => Promise<{
    filename: string;
    contentType: string;
  } & (
    | { kind: "bytes"; bytes: Uint8Array }
    | { kind: "redirect"; url: string }
  ) | null>;
};

export async function handleJobVoiceGet(
  params: { jobId: string; voiceId: string },
  deps: JobVoiceGetDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }
  if (deps.canAccessJob && !(await deps.canAccessJob(session, params.jobId))) {
    return new Response(null, { status: 404 });
  }

  const voice = await deps.getVoice(params.jobId, params.voiceId);
  if (!voice) {
    return new Response(null, { status: 404 });
  }

  if (voice.kind === "redirect") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: voice.url,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const filename = voice.filename.replace(/"/g, "");
  return new Response(Buffer.from(voice.bytes), {
    status: 200,
    headers: {
      "Content-Type": voice.contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string; voiceId: string }> },
): Promise<Response> {
  const params = await context.params;
  return handleJobVoiceGet(params, {
    getSession: getOpsSession,
    getVoice: getJobVoiceNoteDownload,
  });
}
