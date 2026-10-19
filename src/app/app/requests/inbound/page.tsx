import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { PageHeader } from "@/components/ops/page-header";
import { Button } from "@/components/ui/button";
import { getOpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { listInboundProposals } from "@/lib/leads/inbound-store";
import { acceptInboundMail, dismissInboundMail, sendInboundReply } from "./actions";

export const dynamic = "force-dynamic";

export default async function InboundMailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const params = await searchParams;
  const proposals = await listInboundProposals();
  const office = isOfficeMembershipRole(session.role);
  const notice =
    params.notice === "accepted"
      ? "Estimate request recorded. No mail was sent."
      : params.notice === "dismissed"
        ? "Message dismissed. No mail was sent."
        : params.error === "office"
          ? "Office access is required."
          : params.error === "missing"
            ? "That message is not on the list."
            : null;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/requests", label: "Estimate requests" },
          { label: "Inbound mail" },
        ]}
        title="Inbound mail"
        description="Email Routing stores a proposal here. Accepting a match records an estimate request and does not send mail. An administrator confirms the reply before it goes out."
      />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {proposals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inbound mail.</p>
      ) : (
        <ul className="space-y-4">
          {proposals.map((proposal) => (
            <li key={proposal.dedupeKey} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="space-y-1">
                <p className="font-medium">{proposal.subject || "(no subject)"}</p>
                <p className="text-sm text-muted-foreground">
                  {proposal.fromName ? `${proposal.fromName} ` : ""}
                  &lt;{proposal.fromEmail}&gt; · {proposal.triage.intent} · {proposal.status}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm">{proposal.text}</p>
              {proposal.triage.company || proposal.triage.city || proposal.triage.phone ? (
                <p className="text-sm">
                  {[proposal.triage.company, proposal.triage.city, proposal.triage.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm">{proposal.replyDraft}</p>
              {proposal.attachments.length > 0 ? (
                <ul className="text-sm text-muted-foreground">
                  {proposal.attachments.map((file) => (
                    <li key={`${proposal.dedupeKey}-${file.filename}`}>
                      {file.filename}
                      {file.r2Key ? "" : ` · skipped (${file.skippedReason ?? "not stored"})`}
                    </li>
                  ))}
                </ul>
              ) : null}
              {proposal.leadId ? (
                <Link className="text-sm underline underline-offset-4" href={`/app/requests/${proposal.leadId}`}>
                  Open estimate request
                </Link>
              ) : null}
              {office && proposal.status === "proposed" ? (
                <div className="flex flex-wrap gap-2">
                  <form action={acceptInboundMail}>
                    <input type="hidden" name="dedupeKey" value={proposal.dedupeKey} />
                    <Button type="submit">Accept match</Button>
                  </form>
                  <form action={dismissInboundMail}>
                    <input type="hidden" name="dedupeKey" value={proposal.dedupeKey} />
                    <Button type="submit" variant="outline">Dismiss</Button>
                  </form>
                </div>
              ) : null}
              {session.role === "administrator" && proposal.status === "accepted" ? (
                <ConfirmForm
                  action={sendInboundReply}
                  title="Send this reply?"
                  message="This sends the stored draft to the person who emailed. It does not set a price or approve the work."
                  confirmLabel="Send reply"
                >
                  <input type="hidden" name="dedupeKey" value={proposal.dedupeKey} />
                  <input type="hidden" name="confirmSend" value="yes" />
                  <Button type="submit">Send reply</Button>
                </ConfirmForm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
