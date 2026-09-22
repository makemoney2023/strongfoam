import Link from "next/link";
import { convertAcceptedEstimateAction } from "@/app/app/opportunities/[id]/estimates/actions";
import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import type { EstimateConversionPreview } from "@/lib/ops/estimate-conversion";
import { formatUnitPrice } from "@/lib/ops/price-book";

export function EstimateConversionPreview({
  estimateId,
  acceptanceId,
  expectedHash,
  idempotencyKey,
  preview,
  canConvert,
  result,
}: {
  estimateId: string;
  acceptanceId: string | null;
  expectedHash: string;
  idempotencyKey: string;
  preview: EstimateConversionPreview | null;
  canConvert: boolean;
  result: { projectId: string; jobIds: string[] } | null;
}) {
  if (result) {
    return (
      <div className="space-y-2 text-sm">
        <p>This accepted estimate already created the project and jobs.</p>
        <p>
          <Link className="underline underline-offset-4" href={`/app/projects/${result.projectId}`}>
            Open project
          </Link>
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {result.jobIds.map((jobId) => (
            <li key={jobId}>
              <Link className="underline underline-offset-4" href={`/app/jobs/${jobId}`}>
                Open job
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (!preview || !acceptanceId) {
    return (
      <p className="text-sm text-muted-foreground">
        Customer acceptance does not create a project. Accept the proposal, then confirm this
        preview.
      </p>
    );
  }
  const areaCount = preview.jobs.reduce((sum, job) => sum + job.workAreas.length, 0);
  const taskCount = preview.jobs.reduce((sum, job) => sum + job.tasks.length, 0);
  return (
    <div className="space-y-3 text-sm">
      <p>Create project: {preview.project.name}</p>
      <p>Create {preview.jobs.length} jobs:</p>
      <ul className="list-disc space-y-1 pl-5">
        {preview.jobs.map((job) => (
          <li key={job.packageId}>
            {job.name} — {job.scope}
          </li>
        ))}
      </ul>
      <p>
        Create {areaCount} work areas and {taskCount} starter tasks
      </p>
      <p>Create approved project budget {formatUnitPrice(preview.budgetTotalCents)}</p>
      <p>Link {preview.documentVersionIds.length} source document versions</p>
      {canConvert ? (
        <ActionForm action={convertAcceptedEstimateAction} className="space-y-3">
          <input type="hidden" name="estimateId" value={estimateId} />
          <input type="hidden" name="acceptanceId" value={acceptanceId} />
          <input type="hidden" name="expectedHash" value={expectedHash} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <SubmitButton variant="default" className="min-h-11" pendingLabel="Creating…">
            Create project and jobs
          </SubmitButton>
        </ActionForm>
      ) : (
        <p className="text-muted-foreground">An administrator confirms this conversion.</p>
      )}
    </div>
  );
}
