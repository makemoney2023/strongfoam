"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { sendThroughCloudflareEmail } from "@/lib/cloudflare/email";
import { getPlatform } from "@/lib/cloudflare/platform";
import {
  acceptInboundProposal,
  decideReplySend,
  type InboundProposal,
} from "@/lib/leads/inbound-mail";
import { drizzleInboundRepository, listInboundProposals } from "@/lib/leads/inbound-store";

const PATH = "/app/requests/inbound";

async function proposalFor(dedupeKey: string): Promise<InboundProposal | null> {
  const rows = await listInboundProposals();
  return rows.find((row) => row.dedupeKey === dedupeKey) ?? null;
}

export async function acceptInboundMail(formData: FormData): Promise<void> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!isOfficeMembershipRole(session.role)) redirect(`${PATH}?error=office`);
  const proposal = await proposalFor(String(formData.get("dedupeKey") ?? ""));
  if (!proposal) redirect(`${PATH}?error=missing`);
  await acceptInboundProposal(proposal, drizzleInboundRepository());
  revalidatePath(PATH);
  revalidatePath("/app/requests");
  redirect(`${PATH}?notice=accepted`);
}

export async function dismissInboundMail(formData: FormData): Promise<void> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!isOfficeMembershipRole(session.role)) redirect(`${PATH}?error=office`);
  const proposal = await proposalFor(String(formData.get("dedupeKey") ?? ""));
  if (!proposal) redirect(`${PATH}?error=missing`);
  await drizzleInboundRepository().saveProposal({ ...proposal, status: "dismissed" });
  revalidatePath(PATH);
  redirect(`${PATH}?notice=dismissed`);
}

export async function sendInboundReply(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const proposal = await proposalFor(String(formData.get("dedupeKey") ?? ""));
  if (!proposal) return fail(PATH, "That message is not on the list.");
  const platform = await getPlatform();
  const from = platform?.EMAIL_FROM ?? "Strong Foam <estimates@strongfoam.com>";
  const decision = decideReplySend({
    proposal,
    role: session.role,
    confirmSend: String(formData.get("confirmSend") ?? "") === "yes",
    from,
  });
  if (!decision.send) return fail(PATH, "The reply stays a draft until an administrator confirms it.");
  if (!platform?.EMAIL) return fail(PATH, "The EMAIL binding is not available.");
  await sendThroughCloudflareEmail(platform.EMAIL, decision.message);
  await drizzleInboundRepository().saveProposal({ ...proposal, status: "sent" });
  revalidatePath(PATH);
  return succeed(PATH, "Reply sent.");
}
