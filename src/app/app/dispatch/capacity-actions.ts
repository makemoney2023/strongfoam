"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { setCrewCapacity } from "@/lib/ops/crew-capacity-store";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
  };
}

export async function saveCrewCapacity(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const result = await setCrewCapacity({
    actor: actorFrom(session),
    userId: String(formData.get("userId") ?? ""),
    jobsPerDay: String(formData.get("jobsPerDay") ?? ""),
  });
  revalidatePath("/app/dispatch");
  revalidatePath("/app/jobs");
  if (!result.ok) return fail("/app/dispatch", result.error);
  return succeed("/app/dispatch", "Crew capacity saved.");
}
