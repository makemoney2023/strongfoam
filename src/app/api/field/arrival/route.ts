import { getFieldSession } from "@/lib/ops/field-auth";
import { proposeArrivalDraft } from "@/lib/ops/field-arrival";
import { canFieldUserAccessJob } from "@/lib/ops/store";

export async function POST(request: Request): Promise<Response> {
  const session = await getFieldSession();
  if (!session) return Response.json({ error: "Sign in." }, { status: 401 });
  let body: { jobId?: unknown; latitude?: unknown; longitude?: unknown; consent?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "That arrival could not be read." }, { status: 400 });
  }
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!jobId || !(await canFieldUserAccessJob(session.userId, jobId))) {
    return Response.json({ error: "That job was not found." }, { status: 404 });
  }
  const result = await proposeArrivalDraft({
    organizationId: session.organizationId,
    userId: session.userId,
    jobId,
    latitude: typeof body.latitude === "number" ? body.latitude : Number.NaN,
    longitude: typeof body.longitude === "number" ? body.longitude : Number.NaN,
    consent: body.consent === true,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
