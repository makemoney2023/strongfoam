"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
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
