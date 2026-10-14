"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, organizationIdForOpsSession, type OpsSession } from "@/lib/ops/auth";
import { listFieldDrafts, updateFieldDraft } from "@/lib/ops/field-draft-store";
import { decideFieldDraft } from "@/lib/ops/field-drafts";
import { recordQuality } from "@/lib/ops/quality-store";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
  };
}

function jobPath(jobId: string): string {
  return `/app/jobs/${jobId}`;
}

function refresh(jobId: string) {
  revalidatePath("/app");
  revalidatePath("/app/jobs");
  revalidatePath("/app/workforce");
  revalidatePath("/field");
  revalidatePath(jobPath(jobId));
  revalidatePath(`/field/jobs/${jobId}`);
}

export async function recordJobQuality(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await recordQuality({
    actor: actorFrom(session),
    jobId,
    kind: String(formData.get("kind") ?? ""),
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Quality record saved.");
}

export async function reviewJobQualityDraft(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const organizationId = organizationIdForOpsSession(session);
  const draft = (await listFieldDrafts(organizationId, jobId)).find(
    (item) => item.id === draftId && item.kind === "inspection_note",
  );
  const next = draft && (decision === "confirm" || decision === "dismiss")
    ? decideFieldDraft(draft, decision)
    : null;
  if (!draft || !next) return fail(jobPath(jobId), "That quality proposal is no longer available.");
  if (decision === "confirm") {
    const result = await recordQuality({
      actor: actorFrom(session),
      jobId,
      kind: "deficiency",
      name: draft.body.trim().slice(0, 80),
      status: "open",
      note: draft.body.trim().slice(0, 500),
    });
    if (!result.ok) return fail(jobPath(jobId), result.error);
  }
  await updateFieldDraft(next);
  refresh(jobId);
  return succeed(
    jobPath(jobId),
    decision === "confirm" ? "Quality record opened." : "Quality proposal dismissed.",
  );
}
