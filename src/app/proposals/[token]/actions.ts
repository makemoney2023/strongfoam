"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { fail } from "@/lib/ops/action-redirect";
import { invalid, type ActionState } from "@/lib/ops/action-result";
import { PROPOSAL_ACCEPTANCE_TERMS } from "@/lib/ops/proposals";
import { decideStoredProposal } from "@/lib/ops/store";

function reviewPath(token: string): string {
  return `/proposals/${encodeURIComponent(token)}`;
}

export async function recordProposalDecision(formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const decision = formData.get("decision") === "rejected" ? "rejected" : "accepted";
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const attestation = String(formData.get("attestation") ?? "");
  const path = token ? reviewPath(token) : "/proposals/unavailable";
  if (!recipientName) return invalid("Enter the recipient name.", "recipientName");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return invalid("Enter the recipient email.", "recipientEmail");
  }
  if (decision === "accepted" && attestation.trim() !== PROPOSAL_ACCEPTANCE_TERMS) {
    return invalid("Confirm the acceptance terms.", "attestation");
  }
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const decided = await decideStoredProposal({
    token,
    decision,
    recipientName,
    recipientEmail,
    attestation,
    ipAddress: forwarded,
    userAgent: headerList.get("user-agent"),
  });
  if (!decided.ok) {
    const message =
      decided.error === "unavailable"
        ? "This proposal is unavailable."
        : decided.error === "stale-approval"
          ? "This proposal is no longer tied to the approved version."
          : decided.error === "already-decided"
            ? "This proposal already has a different decision."
            : "This proposal could not be decided.";
    return fail(path, message);
  }
  revalidatePath(path);
  const message = decided.replayed
    ? decided.decision === "accepted"
      ? "This proposal was already accepted."
      : "This proposal was already rejected."
    : decided.decision === "accepted"
      ? "Proposal accepted. Work has not started."
      : "Proposal rejected.";
  return { href: path, notice: { kind: "success", message } };
}
