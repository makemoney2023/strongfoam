"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { recordInspection } from "@/lib/ops/inspection-store";

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

export async function recordJobInspection(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await recordInspection({
    actor: actorFrom(session),
    jobId,
    name: String(formData.get("name") ?? ""),
    result: String(formData.get("result") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Inspection recorded.");
}
