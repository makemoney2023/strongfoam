import { getFieldSession } from "@/lib/ops/field-auth";
import { draftsFromSync } from "@/lib/ops/field-sync";
import { saveFieldDraft } from "@/lib/ops/field-draft-store";
import { canFieldUserAccessJob } from "@/lib/ops/store";

export async function POST(request: Request): Promise<Response> {
  const session = await getFieldSession();
  if (!session) {
    return Response.json({ error: "Sign in." }, { status: 401 });
  }
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That sync payload could not be read." }, { status: 400 });
  }
  const parsed = draftsFromSync({
    organizationId: session.organizationId,
    userId: session.userId,
    body,
  });
  const acked: string[] = [];
  for (const draft of parsed.accepted) {
    if (!(await canFieldUserAccessJob(session.userId, draft.jobId))) {
      parsed.rejected.push(draft.clientId);
      continue;
    }
    const saved = await saveFieldDraft(draft);
    if (saved) acked.push(draft.clientId);
    else parsed.rejected.push(draft.clientId);
  }
  return Response.json({ acked, rejected: parsed.rejected });
}
