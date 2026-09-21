"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import {
  applyConfirmedTaskCommand,
  previewTaskCommandChange,
  undoAppliedTaskCommand,
} from "@/lib/ops/apply-task-command";
import type { TaskCommandKind, TaskCommandProposal } from "@/lib/ops/task-command";

function canUseOfficeAi(session: OpsSession): boolean {
  return session.role === "estimator" || isOfficeMembershipRole(session.role);
}

async function requireOfficeSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session || !canUseOfficeAi(session)) redirect("/app/login");
  return session;
}

function refreshTaskCommand(jobId: string) {
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath(`/field/jobs/${jobId}`);
  revalidatePath("/field");
}

export async function previewTaskCommand(
  jobId: string,
  taskId: string,
  kind: TaskCommandKind,
): Promise<{ ok: true; proposal: TaskCommandProposal } | { ok: false; error: string }> {
  await requireOfficeSession();
  return previewTaskCommandChange(jobId, taskId, kind);
}

export async function confirmTaskCommand(
  jobId: string,
  taskId: string,
  kind: TaskCommandKind,
  expectedUpdatedAt: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const result = await applyConfirmedTaskCommand({
    jobId,
    taskId,
    actor: session.email,
    kind,
    expectedUpdatedAt,
  });
  if (result.ok) refreshTaskCommand(jobId);
  return result;
}

export async function undoTaskCommand(
  jobId: string,
  taskId: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const result = await undoAppliedTaskCommand({
    jobId,
    taskId,
    actor: session.email,
  });
  if (result.ok) refreshTaskCommand(jobId);
  return result;
}
