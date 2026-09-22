import { ActionForm, FieldError } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordProposalDecision } from "@/app/proposals/[token]/actions";
import { PROPOSAL_ACCEPTANCE_TERMS } from "@/lib/ops/proposals";
import { formatUnitPrice, priceBookUnitLabel } from "@/lib/ops/price-book";
import { openProposalByToken } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function ProposalReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const opened = await openProposalByToken(token);
  if (!opened.ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Proposal unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">This proposal is unavailable.</p>
      </main>
    );
  }
  const { snapshot } = opened;
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium">{snapshot.organizationName}</p>
        <h1 className="text-3xl font-semibold">{snapshot.estimateTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {snapshot.companyName} · {snapshot.siteName}
        </p>
        <p className="text-sm">
          {snapshot.estimateNumber} · version {snapshot.versionNumber} · expires{" "}
          {opened.expiresAt.slice(0, 10)}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Base scope</h2>
        {snapshot.scope.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {snapshot.scope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No base scope is listed.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Lines</h2>
        {snapshot.lines.length ? (
          <ul className="space-y-2 text-sm">
            {snapshot.lines.map((line) => (
              <li key={`${line.description}-${line.amountCents}-${line.included}`}>
                {line.description}
                {line.quantity
                  ? ` · ${line.quantity} ${line.unit ? priceBookUnitLabel(line.unit) : ""}`
                  : ""}
                {line.unitPriceCents != null ? ` · ${formatUnitPrice(line.unitPriceCents)}` : ""}
                {` · ${formatUnitPrice(line.amountCents)}`}
                {line.alternateName
                  ? ` · ${line.included ? "included" : "excluded"} alternate ${line.alternateName}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This proposal has no lines.</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Inclusions</h2>
          {snapshot.inclusions.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {snapshot.inclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold">Exclusions</h2>
          {snapshot.exclusions.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {snapshot.exclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
          )}
        </div>
      </section>

      <p className="text-xl font-semibold">Total {formatUnitPrice(snapshot.totalCents)}</p>
      <p className="text-sm">{snapshot.acceptanceTerms}</p>
      <p>
        <a className="text-sm underline underline-offset-4" href={`/proposals/${token}/pdf`}>
          Download proposal PDF
        </a>
      </p>

      {opened.decision === "accepted" ? (
        <p className="text-sm">This proposal was accepted. Work has not started.</p>
      ) : null}
      {opened.decision === "rejected" ? (
        <p className="text-sm">This proposal was rejected.</p>
      ) : null}
      {opened.decision == null ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <ActionForm action={recordProposalDecision} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="decision" value="accepted" />
            <h2 className="text-lg font-semibold">Accept</h2>
            <Label htmlFor="accept-name">Recipient name</Label>
            <Input id="accept-name" name="recipientName" autoComplete="name" />
            <FieldError name="recipientName" />
            <Label htmlFor="accept-email">Recipient email</Label>
            <Input id="accept-email" name="recipientEmail" type="email" autoComplete="email" />
            <FieldError name="recipientEmail" />
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" name="attestation" value={PROPOSAL_ACCEPTANCE_TERMS} />
              <span>{PROPOSAL_ACCEPTANCE_TERMS}</span>
            </label>
            <FieldError name="attestation" />
            <SubmitButton variant="default" className="min-h-11" pendingLabel="Accepting…">
              Accept proposal
            </SubmitButton>
          </ActionForm>
          <ActionForm action={recordProposalDecision} className="space-y-3">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="decision" value="rejected" />
            <h2 className="text-lg font-semibold">Reject</h2>
            <Label htmlFor="reject-name">Recipient name</Label>
            <Input id="reject-name" name="recipientName" autoComplete="name" />
            <FieldError name="recipientName" />
            <Label htmlFor="reject-email">Recipient email</Label>
            <Input id="reject-email" name="recipientEmail" type="email" autoComplete="email" />
            <FieldError name="recipientEmail" />
            <SubmitButton className="min-h-11" pendingLabel="Rejecting…">
              Reject proposal
            </SubmitButton>
          </ActionForm>
        </div>
      ) : null}
    </main>
  );
}
