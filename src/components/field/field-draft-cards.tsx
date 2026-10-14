import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import type { ActionState } from "@/lib/ops/action-result";
import type { FieldDraft } from "@/lib/ops/field-drafts";

export function FieldDraftCards({
  drafts,
  jobId,
  returnTo,
  action,
}: {
  drafts: FieldDraft[];
  jobId: string;
  returnTo: string;
  action: (formData: FormData) => Promise<ActionState | void>;
}) {
  const open = drafts.filter((draft) => draft.status === "proposed");
  if (open.length === 0) return null;
  return (
    <section id="field-drafts" aria-labelledby="field-drafts-heading" className="space-y-3">
      <h2 id="field-drafts-heading" className="text-lg font-semibold">
        Confirm before writing
      </h2>
      <ul className="space-y-3">
        {open.map((draft) => (
          <li key={draft.id} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-sm font-medium capitalize">{draft.kind.replaceAll("_", " ")}</p>
            {draft.kind === "caption" ? null : (
              <p className="whitespace-pre-wrap text-sm">{draft.body}</p>
            )}
            {draft.effect ? (
              <p className="text-sm font-medium">{draft.effect}</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <ActionForm action={action} className="space-y-2">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="decision" value="confirm" />
                <input type="hidden" name="returnTo" value={returnTo} />
                {draft.kind === "caption" ? (
                  <label className="grid gap-1 text-sm sm:col-span-2">
                    Caption
                    <textarea
                      name="body"
                      defaultValue={draft.body}
                      maxLength={500}
                      rows={3}
                      required
                      className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                ) : null}
                {draft.kind === "labor" ? (
                  <label className="grid gap-1 text-sm">
                    Hours today
                    <input
                      name="hours"
                      inputMode="decimal"
                      required
                      className="min-h-11 rounded-lg border bg-background px-3 text-sm"
                    />
                  </label>
                ) : null}
                <SubmitButton className="min-h-11 w-full">Confirm</SubmitButton>
              </ActionForm>
              <ActionForm action={action}>
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="decision" value="dismiss" />
                <input type="hidden" name="returnTo" value={returnTo} />
                <SubmitButton variant="outline" className="min-h-11 w-full">
                  Dismiss
                </SubmitButton>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
