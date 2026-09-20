import { getFieldSession } from "@/lib/ops/field-auth";
import { createJobEventStream } from "@/lib/ops/realtime-stream";
import { listJobs } from "@/lib/ops/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  if (!(await getFieldSession())) return new Response(null, { status: 401 });
  return createJobEventStream(request, async () => {
    const session = await getFieldSession();
    if (!session) return null;
    const jobs = await listJobs({ fieldUserId: session.userId });
    return jobs.map((job) => job.id);
  });
}
