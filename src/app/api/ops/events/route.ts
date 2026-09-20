import { getOpsSession } from "@/lib/ops/auth";
import { isUuid } from "@/lib/ops/job-workspace";
import { createJobEventStream } from "@/lib/ops/realtime-stream";
import { getJob, getProject, listJobs } from "@/lib/ops/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  if (!(await getOpsSession())) return new Response(null, { status: 401 });
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const projectId = url.searchParams.get("projectId");

  if (jobId && isUuid(jobId) && (await getJob(jobId))) {
    return createJobEventStream(request, async () => {
      if (!(await getOpsSession())) return null;
      return [jobId];
    });
  }
  if (projectId && isUuid(projectId) && (await getProject(projectId))) {
    return createJobEventStream(request, async () => {
      if (!(await getOpsSession())) return null;
      const jobs = await listJobs({ projectId });
      return jobs.map((job) => job.id);
    });
  }
  return Response.json({ error: "Choose a valid job or project." }, { status: 400 });
}
