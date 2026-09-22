import { FileTextIcon } from "lucide-react";
import { processBidDocument, retryBidDocumentScan } from "@/app/app/opportunities/actions";
import { ActionForm } from "@/components/ops/action-form";
import { BidPackageUploader } from "@/components/ops/bid-package-uploader";
import { DocumentExtractionReview } from "@/components/ops/document-extraction-review";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BID_DOCUMENT_LABELS, type BidDocumentKind } from "@/lib/ops/commercial-documents";
import { bidDocumentProgress } from "@/lib/ops/document-extraction";
import type { BidPackageItem } from "@/lib/ops/store";

const STATUS_LABELS = {
  quarantined: "Quarantined",
  clean: "Clean",
  rejected: "Rejected",
} as const;

export function BidPackagePanel({
  opportunityId,
  organizationId,
  items,
  storageMode,
  canUpload = true,
}: {
  opportunityId: string;
  organizationId: string;
  items: BidPackageItem[];
  storageMode: "demo" | "blob" | "unavailable";
  canUpload?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid package</CardTitle>
        <CardDescription>
          Private plans and specifications for this opportunity. A file stays quarantined until it is scanned.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bid documents yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map(({ version, extraction, pages, chunks }) => {
              const progress = bidDocumentProgress({
                versionStatus: version.status,
                extractionStatus: extraction?.status,
                pageProgress: extraction?.pageProgress,
                pageCount: extraction?.pageCount,
              });
              return (
              <li key={version.id} className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{version.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {BID_DOCUMENT_LABELS[version.kind as BidDocumentKind] ?? version.kind}
                    {version.revisionLabel ? ` · ${version.revisionLabel}` : ""}
                    {` · v${version.versionNumber}`}
                    {` · ${progress}`}
                    {` · ${STATUS_LABELS[version.status as keyof typeof STATUS_LABELS] ?? version.status}`}
                    {` · ${version.uploadedBy}`}
                  </p>
                  {extraction?.error ? (
                    <p className="text-sm text-destructive">{extraction.error}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11 md:min-h-8"
                    nativeButton={false}
                    render={
                      <a
                        href={`/api/ops/opportunities/${opportunityId}/documents/${version.id}`}
                      />
                    }
                  >
                    <FileTextIcon aria-hidden="true" />
                    Download
                  </Button>
                  {canUpload && storageMode === "demo" && progress !== "Ready" && progress !== "Rejected" ? (
                    <ActionForm action={processBidDocument}>
                      <input type="hidden" name="opportunityId" value={opportunityId} />
                      <input type="hidden" name="versionId" value={version.id} />
                      <SubmitButton variant="outline" className="min-h-11 md:min-h-8" pendingLabel="Processing…">
                        {progress === "Failed" ? "Retry extraction" : "Process document"}
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                  {canUpload && version.status !== "clean" ? (
                    <ActionForm action={retryBidDocumentScan}>
                      <input type="hidden" name="opportunityId" value={opportunityId} />
                      <input type="hidden" name="versionId" value={version.id} />
                      <SubmitButton variant="outline" className="min-h-11 md:min-h-8" pendingLabel="Retrying…">
                        Retry scan
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
                </div>
                {pages.length > 0 ? (
                  <DocumentExtractionReview
                    opportunityId={opportunityId}
                    versionId={version.id}
                    pages={pages}
                    chunks={chunks}
                    canCorrect={canUpload}
                  />
                ) : null}
              </li>
            );
            })}
          </ul>
        )}
        {canUpload ? (
          <BidPackageUploader
            opportunityId={opportunityId}
            organizationId={organizationId}
            storageMode={storageMode}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
