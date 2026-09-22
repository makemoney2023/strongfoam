import { applyBidEstimateProposalAction, dismissBidEstimateProposalAction } from "@/app/app/opportunities/[id]/estimates/actions";
import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import type { BidEstimateProposal } from "@/lib/ops/commercial-ai";

export function BidEstimateProposalReview({
  estimateId,
  proposalId,
  proposal,
  baseVersionNumber,
  revisions,
  canEdit,
}: {
  estimateId: string;
  proposalId: string;
  proposal: BidEstimateProposal;
  baseVersionNumber: number;
  revisions: Array<{ id: string; label: string }>;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">An estimator reviews these suggestions.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <p>{proposal.summary}</p>
      <ActionForm action={applyBidEstimateProposalAction} className="space-y-4">
        <input type="hidden" name="estimateId" value={estimateId} />
        <input type="hidden" name="proposalId" value={proposalId} />
        <input type="hidden" name="baseVersionNumber" value={String(baseVersionNumber)} />
        {proposal.jobPackages.map((pkg, index) => (
          <label key={`package-${pkg.name}`} className="block space-y-1">
            <span className="flex items-center gap-2">
              <input type="checkbox" name={`package-${index}`} />
              <span>
                {pkg.name} — {pkg.scope}
              </span>
            </span>
            <span className="block text-muted-foreground">
              {pkg.citations[0]
                ? `Page ${pkg.citations[0].pageNumber}${pkg.citations[0].sheetLabel ? ` · ${pkg.citations[0].sheetLabel}` : ""}`
                : "No citation"}
            </span>
          </label>
        ))}
        {proposal.lines.map((line, index) => (
          <fieldset key={`line-${line.description}-${index}`} className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" name={`line-${index}`} />
              <span>
                {line.description}
                {line.quantitySource === "manual_required" ? " · Takeoff required" : ""}
              </span>
            </label>
            <p className="text-muted-foreground">
              Source: {line.quantity ? `${line.quantity.value} ${line.quantity.unit}` : "No written quantity"}
              {line.citations[0] ? ` · page ${line.citations[0].pageNumber}` : ""}
            </p>
            <label className="block">
              Confirmed quantity
              <input className="mt-1 w-full rounded-md border px-2 py-1" name={`quantity-${index}`} defaultValue={line.quantity?.value ?? ""} />
            </label>
            <label className="block">
              Price revision
              <select className="mt-1 w-full rounded-md border px-2 py-1" name={`price-${index}`} defaultValue="">
                <option value="">Choose a revision</option>
                {revisions.map((revision) => (
                  <option key={revision.id} value={revision.id}>
                    {revision.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ))}
        <SubmitButton pendingLabel="Applying…">Apply selected</SubmitButton>
      </ActionForm>
      <ActionForm action={dismissBidEstimateProposalAction}>
        <input type="hidden" name="estimateId" value={estimateId} />
        <input type="hidden" name="proposalId" value={proposalId} />
        <SubmitButton variant="outline" pendingLabel="Dismissing…">
          Dismiss
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
