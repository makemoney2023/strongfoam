"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendThroughCloudflareEmail } from "@/lib/cloudflare/email";
import { getPlatform } from "@/lib/cloudflare/platform";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, organizationIdForOpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { appendProposalEvent, listProposalEvents } from "@/lib/ops/store";
import {
  cancelProposalFollowup,
  listReviewDrafts,
  saveDigestOptIn,
  updateReviewDrafts,
} from "@/lib/ops/proposal-followup-store";
import { confirmedStatusEvent } from "@/lib/ops/proposal-followups";
import { applyBatchDecision, decideFollowupSend } from "@/lib/ops/review-drafts";

const PATH = "/app/automation";

async function officeSession() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!isOfficeMembershipRole(session.role)) redirect("/app");
  return session;
}

export async function confirmDrafts(formData: FormData): Promise<void> {
  const session = await officeSession();
  await decideDrafts(formData, session.email, organizationIdForOpsSession(session), "confirm");
}

export async function dismissDrafts(formData: FormData): Promise<void> {
  const session = await officeSession();
  await decideDrafts(formData, session.email, organizationIdForOpsSession(session), "dismiss");
}

export async function setDigestOptIn(formData: FormData): Promise<void> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!("userId" in session)) redirect("/app");
  await saveDigestOptIn({
    organizationId: session.organizationId,
    userId: session.userId,
    email: session.email,
    optedIn: formData.get("optedIn") === "yes",
  });
  revalidatePath("/app");
  redirect("/app");
}

export async function sendFollowupDraft(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const organizationId = organizationIdForOpsSession(session);
  const drafts = await listReviewDrafts(organizationId);
  const draft = drafts.find((row) => row.id === String(formData.get("id") ?? ""));
  if (!draft) return fail(PATH, "That draft is not on the list.");
  const platform = await getPlatform();
  const from = platform?.EMAIL_FROM ?? "Strong Foam <estimates@strongfoam.com>";
  const decision = decideFollowupSend({
    draft,
    role: session.role,
    confirmSend: String(formData.get("confirmSend") ?? "") === "yes",
    from,
  });
  if (!decision.send) {
    return fail(PATH, "The follow-up stays a draft until an administrator confirms it.");
  }
  if (!platform?.EMAIL) return fail(PATH, "The EMAIL binding is not available.");
  await sendThroughCloudflareEmail(platform.EMAIL, decision.message);
  await updateReviewDrafts(organizationId, [{ ...draft, status: "sent" }]);
  revalidatePath(PATH);
  revalidatePath("/app");
  return succeed(PATH, "Follow-up sent.");
}

async function decideDrafts(
  formData: FormData,
  actorEmail: string,
  organizationId: string,
  decision: "confirm" | "dismiss",
): Promise<void> {
  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) redirect(`${PATH}?notice=none`);
  const drafts = await listReviewDrafts(organizationId);
  const result = applyBatchDecision({ drafts, ids, decision });
  await updateReviewDrafts(organizationId, result.updated);
  const now = new Date();
  for (const event of result.statusEvents) {
    if (event.organizationId !== organizationId) continue;
    const existing = await listProposalEvents(event.proposalId);
    const closed = existing.some(
      (row) => row.kind === "accepted" || row.kind === "rejected" || row.kind === "revoked",
    );
    if (!closed) {
      await appendProposalEvent(
        confirmedStatusEvent({
          organizationId,
          proposalId: event.proposalId,
          kind: event.kind,
          quote: event.quote,
          actorEmail,
          now,
        }),
      );
    }
  }
  for (const proposalId of result.cancelProposalIds) {
    await cancelProposalFollowup(proposalId);
  }
  revalidatePath(PATH);
  revalidatePath("/app");
  redirect(`${PATH}?notice=${decision === "confirm" ? "confirmed" : "dismissed"}`);
}
