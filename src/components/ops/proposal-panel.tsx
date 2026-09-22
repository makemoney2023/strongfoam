"use client";

import {
  generateProposalAction,
  recordProposalDeliveryAction,
  revokeProposalAction,
} from "@/app/app/opportunities/[id]/estimates/actions";
import { ActionForm, FieldError, useActionFormState } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProposalSummary = {
  id: string;
  estimateVersionId: string;
  versionNumber: number;
  createdAt: string;
  expiresAt: string;
  status: string;
  events: Array<{
    id: string;
    kind: string;
    createdAt: string;
    actorEmail: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
    channel: string | null;
    externalMessageId: string | null;
  }>;
};

function ReviewLink() {
  const state = useActionFormState();
  if (!state.reviewPath) return null;
  return (
    <p className="text-sm">
      Review link, shown once:{" "}
      <a className="break-all underline underline-offset-4" href={state.reviewPath}>
        {state.reviewPath}
      </a>
    </p>
  );
}

export function ProposalPanel({
  estimateId,
  versionId,
  approved,
  isLatest,
  canDeliver,
  proposals,
}: {
  estimateId: string;
  versionId: string;
  approved: boolean;
  isLatest: boolean;
  canDeliver: boolean;
  proposals: ProposalSummary[];
}) {
  const visible = proposals.filter((proposal) => proposal.estimateVersionId === versionId);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generating a proposal does not send it. Recording delivery is a separate action and does
        not email the customer.
      </p>
      {!isLatest ? (
        <p className="text-sm">A newer version exists. Generate the proposal from that version.</p>
      ) : null}
      {!approved ? (
        <p className="text-sm">Approve this version before generating a proposal.</p>
      ) : null}
      {canDeliver && approved && isLatest ? (
        <ActionForm action={generateProposalAction} className="space-y-3">
          <input type="hidden" name="estimateId" value={estimateId} />
          <input type="hidden" name="estimateVersionId" value={versionId} />
          <SubmitButton variant="default" className="min-h-11" pendingLabel="Generating…">
            Generate proposal
          </SubmitButton>
          <ReviewLink />
        </ActionForm>
      ) : null}
      {!canDeliver ? (
        <p className="text-sm text-muted-foreground">
          An administrator generates the proposal and records delivery.
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No proposal has been generated for this version.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((proposal) => (
            <li key={proposal.id} className="space-y-3 rounded-md border p-3">
              <p className="text-sm">
                Version {proposal.versionNumber} · {proposal.status} · generated{" "}
                {proposal.createdAt.slice(0, 10)} · expires {proposal.expiresAt.slice(0, 10)}
              </p>
              {proposal.events.length ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {proposal.events.map((event) => (
                    <li key={event.id}>
                      {event.kind}
                      {event.channel ? ` · ${event.channel}` : ""}
                      {event.recipientName ? ` · ${event.recipientName}` : ""}
                      {event.recipientEmail ? ` · ${event.recipientEmail}` : ""}
                      {event.externalMessageId ? ` · ${event.externalMessageId}` : ""}
                      {event.actorEmail ? ` · ${event.actorEmail}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canDeliver &&
              proposal.status !== "revoked" &&
              proposal.status !== "expired" &&
              proposal.status !== "accepted" &&
              proposal.status !== "rejected" ? (
                <ActionForm action={recordProposalDeliveryAction} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`channel-${proposal.id}`}>Channel</Label>
                    <select
                      id={`channel-${proposal.id}`}
                      name="channel"
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                      defaultValue="email"
                    >
                      <option value="email">Email</option>
                      <option value="in-person">In person</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`message-${proposal.id}`}>External message ID</Label>
                    <Input id={`message-${proposal.id}`} name="externalMessageId" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`name-${proposal.id}`}>Recipient name</Label>
                    <Input id={`name-${proposal.id}`} name="recipientName" />
                    <FieldError name="recipientName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${proposal.id}`}>Recipient email</Label>
                    <Input id={`email-${proposal.id}`} name="recipientEmail" type="email" />
                    <FieldError name="recipientEmail" />
                  </div>
                  <SubmitButton className="min-h-11 sm:col-span-2" pendingLabel="Recording…">
                    Record delivery
                  </SubmitButton>
                </ActionForm>
              ) : null}
              {canDeliver && proposal.status !== "revoked" && proposal.status !== "accepted" ? (
                <ActionForm action={revokeProposalAction}>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <SubmitButton className="min-h-11" pendingLabel="Revoking…">
                    Revoke review link
                  </SubmitButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
