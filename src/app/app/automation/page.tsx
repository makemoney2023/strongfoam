import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { PageHeader } from "@/components/ops/page-header";
import { Button } from "@/components/ui/button";
import { getOpsSession, organizationIdForOpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { listReviewDrafts } from "@/lib/ops/proposal-followup-store";
import { confirmDrafts, dismissDrafts, sendFollowupDraft } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutomationReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const params = await searchParams;
  const drafts = await listReviewDrafts(organizationIdForOpsSession(session));
  const proposed = drafts.filter((draft) => draft.status === "proposed");
  const readyToSend = drafts.filter(
    (draft) => draft.kind === "proposal_followup" && (draft.status === "proposed" || draft.status === "confirmed"),
  );
  const office = isOfficeMembershipRole(session.role);
  const notice =
    params.notice === "confirmed"
      ? "Selected drafts were confirmed. Nothing was sent."
      : params.notice === "dismissed"
        ? "Selected drafts were dismissed. Nothing was sent."
        : params.notice === "none"
          ? "Select at least one draft."
          : null;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ href: "/app", label: "Home" }, { label: "Automation" }]}
        title="Automation drafts"
        description="Confirm or dismiss many drafts at once. Confirming does not send mail, set a price, or approve work. A follow-up email is sent only from its own administrator confirmation."
      />
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {proposed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drafts waiting for review.</p>
      ) : office ? (
        <form className="space-y-4">
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {proposed.map((draft) => (
              <li key={draft.id} className="space-y-2 px-4 py-3">
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="checkbox" name="id" value={draft.id} />
                  <span className="space-y-1">
                    <span className="block font-medium">{draft.title}</span>
                    <span className="block whitespace-pre-wrap text-muted-foreground">{draft.body}</span>
                    <Link className="underline underline-offset-4" href={draft.href}>
                      Open record
                    </Link>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" formAction={confirmDrafts}>
              Confirm selected
            </Button>
            <Button type="submit" formAction={dismissDrafts} variant="outline">
              Dismiss selected
            </Button>
          </div>
        </form>
      ) : (
        <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
          {proposed.map((draft) => (
            <li key={draft.id} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{draft.title}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{draft.body}</p>
            </li>
          ))}
        </ul>
      )}
      {session.role === "administrator" && readyToSend.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Follow-up send</h2>
          <p className="text-sm text-muted-foreground">
            Each send uses the stored draft and the address recorded when the proposal was delivered.
          </p>
          <ul className="space-y-3">
            {readyToSend.map((draft) => (
              <li key={`send-${draft.id}`} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <p className="font-medium">{draft.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{draft.body}</p>
                <ConfirmForm
                  action={sendFollowupDraft}
                  title="Send this follow-up?"
                  message="This sends the stored draft to the proposal recipient. It does not set a price or approve the work."
                  confirmLabel="Send follow-up"
                  className="mt-3"
                >
                  <input type="hidden" name="id" value={draft.id} />
                  <input type="hidden" name="confirmSend" value="yes" />
                  <Button type="submit">Send follow-up</Button>
                </ConfirmForm>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
