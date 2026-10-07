import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionState } from "@/lib/ops/action-result";
import {
  formatDispatchRecommendation,
  type DispatchRecommendation,
} from "@/lib/ops/dispatch-recommendation";

export function DispatchRecommendationPanel({
  jobId,
  recommendation,
  reason,
  acceptAction,
}: {
  jobId: string;
  recommendation: DispatchRecommendation | null;
  reason: string | null;
  acceptAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch recommendation</CardTitle>
        <CardDescription>
          A person with remaining capacity for today. Accepting assigns that open task. It does not schedule the day by itself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendation ? (
          <p className="text-sm">{formatDispatchRecommendation(recommendation)}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{reason ?? "No recommendation."}</p>
        )}
        {recommendation && acceptAction ? (
          <ActionForm action={acceptAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="taskId" value={recommendation.taskId} />
            <input type="hidden" name="userId" value={recommendation.userId} />
            <SubmitButton pendingLabel="Assigning…" className="min-h-11">
              Assign {recommendation.displayName}
            </SubmitButton>
          </ActionForm>
        ) : null}
      </CardContent>
    </Card>
  );
}
