import { correctBidDocumentPage } from "@/app/app/opportunities/actions";
import { ActionForm } from "@/components/ops/action-form";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BidPackageItem } from "@/lib/ops/store";

export function DocumentExtractionReview({
  opportunityId,
  versionId,
  pages,
  chunks,
  canCorrect,
}: {
  opportunityId: string;
  versionId: string;
  pages: BidPackageItem["pages"];
  chunks: BidPackageItem["chunks"];
  canCorrect: boolean;
}) {
  return (
    <div className="space-y-4">
      {pages.map((page) => {
        const pageChunks = chunks.filter((chunk) => chunk.pageId === page.id);
        return (
          <article key={page.id} className="space-y-3 rounded-md bg-muted/40 p-3">
            <p className="text-sm font-medium">
              Page {page.pageNumber}
              {page.sheetLabel ? ` · ${page.sheetLabel}` : ""}
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Machine text</p>
              <pre className="mt-1 whitespace-pre-wrap text-sm">{page.machineText}</pre>
            </div>
            {page.correctedText ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Corrected text</p>
                <pre className="mt-1 whitespace-pre-wrap text-sm">{page.correctedText}</pre>
              </div>
            ) : null}
            {pageChunks.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {pageChunks.map((chunk) => (
                  <li key={chunk.id}>
                    Citation {chunk.id.slice(0, 8)} · {chunk.contentHash.slice(0, 12)} ·{" "}
                    {chunk.startOffset}-{chunk.endOffset}
                  </li>
                ))}
              </ul>
            ) : null}
            {canCorrect ? (
              <ActionForm action={correctBidDocumentPage} className="grid gap-3">
                <input type="hidden" name="opportunityId" value={opportunityId} />
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={page.id} />
                <div className="space-y-2">
                  <Label htmlFor={`sheet-${page.id}`}>Sheet label</Label>
                  <Input
                    id={`sheet-${page.id}`}
                    name="sheetLabel"
                    className="h-11"
                    defaultValue={page.sheetLabel ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`correction-${page.id}`}>Corrected text</Label>
                  <Textarea
                    id={`correction-${page.id}`}
                    name="correctedText"
                    defaultValue={page.correctedText ?? ""}
                  />
                </div>
                <SubmitButton variant="outline" className="min-h-11 w-fit" pendingLabel="Saving…">
                  Save correction
                </SubmitButton>
              </ActionForm>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
