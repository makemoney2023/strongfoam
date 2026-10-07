"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, organizationIdForOpsSession, type OpsSession } from "@/lib/ops/auth";
import { recordAssembly } from "@/lib/ops/assembly-store";
import { previewCloseoutPacket, recordCloseout, saveCloseoutPacket } from "@/lib/ops/closeout-store";

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
  revalidatePath(jobPath(jobId));
  revalidatePath(`/field/jobs/${jobId}`);
}

export async function recordJobCloseout(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await recordCloseout({
    actor: actorFrom(session),
    jobId,
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Closeout recorded.");
}

export async function recordJobAssembly(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await recordAssembly({
    actor: actorFrom(session),
    jobId,
    fields: {
      location: String(formData.get("location") ?? ""),
      targetRValue: String(formData.get("targetRValue") ?? ""),
      areaSqFt: String(formData.get("areaSqFt") ?? ""),
      bagCount: String(formData.get("bagCount") ?? ""),
      product: String(formData.get("product") ?? ""),
      rebateProgram: String(formData.get("rebateProgram") ?? ""),
    },
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Assembly saved.");
}

export async function saveJobCloseoutPacket(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const actor = actorFrom(session);
  const jobId = String(formData.get("jobId") ?? "");
  const draft = await previewCloseoutPacket(organizationIdForOpsSession(actor), jobId);
  if (!draft.ok) {
    refresh(jobId);
    return fail(jobPath(jobId), draft.error);
  }
  const result = await saveCloseoutPacket({
    actor,
    jobId,
    narrative: draft.draft.narrative,
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Closeout packet saved. It was not sent.");
}
