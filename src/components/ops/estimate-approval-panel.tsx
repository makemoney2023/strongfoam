import { EstimateVersionDiff } from "@/components/ops/estimate-version-diff";
import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decideEstimateVersionAction } from "@/app/app/opportunities/[id]/estimates/actions";
import type { EstimateApproval } from "@/lib/ops/estimate-approvals";
import type { EstimateDiff } from "@/lib/ops/estimates";
import { formatUnitPrice } from "@/lib/ops/price-book";

function expiryLabel(value: Date, now: Date): string {
  const day = value.toISOString().slice(0, 10);
  return value <= now ? `${day} (expired)` : day;
}

export function EstimateApprovalPanel({
  estimateId,
  versionId,
  versionNumber,
  contentHash,
  totalCents,
  latestVersionNumber,
  ruleName,
  requiredApprovals,
  thresholdCents,
  status,
  decisions,
  diff,
  fromVersion,
  canDecide,
  now,
}: {
  estimateId: string;
  versionId: string;
  versionNumber: number;
  contentHash: string;
  totalCents: number;
  latestVersionNumber: number;
  ruleName: string;
  requiredApprovals: number;
  thresholdCents: number | null;
  status: "pending" | "approved" | "rejected";
  decisions: EstimateApproval[];
  diff: EstimateDiff | null;
  fromVersion: number | null;
  canDecide: boolean;
  now: Date;
}) {
  const superseded = versionNumber !== latestVersionNumber;
  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm">
        <p>
          Version {versionNumber} · {formatUnitPrice(totalCents)} · {status}
        </p>
        <p className="break-all text-muted-foreground">Content hash {contentHash}</p>
        <p>
          {ruleName}. {requiredApprovals} administrator{" "}
          {requiredApprovals === 1 ? "approval" : "approvals"} required.
          {thresholdCents != null
            ? ` A second approver is required at ${formatUnitPrice(thresholdCents)} and above.`
            : ""}
        </p>
        {superseded ? (
          <p>
            Version {versionNumber} is superseded by version {latestVersionNumber}. Its approval
            stays on record and does not approve the latest version.
          </p>
        ) : null}
      </div>
      {diff && fromVersion != null ? (
        <EstimateVersionDiff fromVersion={fromVersion} toVersion={versionNumber} diff={diff} />
      ) : (
        <p className="text-sm text-muted-foreground">No previous version to compare.</p>
      )}
      {decisions.length ? (
        <ul className="space-y-2 text-sm">
          {decisions.map((decision) => (
            <li key={decision.id}>
              {decision.actorEmail} · {decision.decision} · expires{" "}
              {expiryLabel(decision.expiresAt, now)}
              {decision.comment ? ` · ${decision.comment}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No decisions on this version.</p>
      )}
      {canDecide && !superseded ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionForm action={decideEstimateVersionAction} className="space-y-3">
            <input type="hidden" name="estimateId" value={estimateId} />
            <input type="hidden" name="estimateVersionId" value={versionId} />
            <input type="hidden" name="expectedHash" value={contentHash} />
            <input type="hidden" name="decision" value="approved" />
            <Label htmlFor={`approve-${versionId}`}>Approval comment</Label>
            <Textarea id={`approve-${versionId}`} name="comment" className="min-h-24" />
            <SubmitButton variant="default" className="min-h-11" pendingLabel="Approving…">
              Approve version {versionNumber}
            </SubmitButton>
          </ActionForm>
          <ActionForm action={decideEstimateVersionAction} className="space-y-3">
            <input type="hidden" name="estimateId" value={estimateId} />
            <input type="hidden" name="estimateVersionId" value={versionId} />
            <input type="hidden" name="expectedHash" value={contentHash} />
            <input type="hidden" name="decision" value="rejected" />
            <Label htmlFor={`reject-${versionId}`}>Rejection comment</Label>
            <Textarea id={`reject-${versionId}`} name="comment" className="min-h-24" />
            <SubmitButton className="min-h-11" pendingLabel="Rejecting…">
              Reject version {versionNumber}
            </SubmitButton>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
