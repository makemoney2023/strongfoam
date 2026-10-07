"use client";

import { uploadPrivateFile } from "@/lib/cloudflare/upload-client";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadBidPackage } from "@/app/app/opportunities/actions";
import { ActionForm } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  BID_DOCUMENT_KINDS,
  BID_DOCUMENT_LABELS,
  MAX_BID_UPLOAD_FILES,
  parseBidDocumentInput,
} from "@/lib/ops/commercial-documents";

type StorageMode = "demo" | "blob" | "unavailable";

function UploadFields() {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="bidPackageFile">
          Files <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="bidPackageFile"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          className="h-11 cursor-pointer"
          required
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, PNG, or WebP. Up to {MAX_BID_UPLOAD_FILES} files, 25 MB each.
          Uploading a plan does not create a project or job.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bidPackageKind">Document type</Label>
          <NativeSelect id="bidPackageKind" name="kind" defaultValue="plan" className="h-11">
            {BID_DOCUMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {BID_DOCUMENT_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bidPackageRevision">Revision</Label>
          <Input id="bidPackageRevision" name="revisionLabel" className="h-11" placeholder="Optional" />
        </div>
      </div>
    </>
  );
}

export function BidPackageUploader({
  opportunityId,
  organizationId,
  storageMode,
}: {
  opportunityId: string;
  organizationId: string;
  storageMode: StorageMode;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (storageMode === "unavailable") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>
          Bid package storage is unavailable. Configure BLOB_READ_WRITE_TOKEN before uploading production files.
        </AlertDescription>
      </Alert>
    );
  }

  if (storageMode === "demo") {
    return (
      <ActionForm action={uploadBidPackage} className="space-y-4">
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <UploadFields />
        <SubmitButton className="min-h-11" pendingLabel="Uploading…">
          <UploadCloudIcon aria-hidden="true" />
          Upload bid package
        </SubmitButton>
      </ActionForm>
    );
  }

  async function submitDirectUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = [...data.getAll("file")].filter(
      (value): value is File => value instanceof File && value.size > 0,
    );
    if (files.length === 0) {
      setMessage({ tone: "error", text: "Choose at least one file to upload." });
      return;
    }
    if (files.length > MAX_BID_UPLOAD_FILES) {
      setMessage({
        tone: "error",
        text: `Upload up to ${MAX_BID_UPLOAD_FILES} files at a time.`,
      });
      return;
    }
    setUploading(true);
    setProgress(0);
    setMessage(null);
    const uploaded: string[] = [];
    const failed: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const parsed = parseBidDocumentInput({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          kind: String(data.get("kind") ?? "plan"),
          revisionLabel: String(data.get("revisionLabel") ?? ""),
        });
        if (!parsed.ok) {
          failed.push(`${file.name}: ${parsed.error}`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        setProgress(Math.round((index / files.length) * 100));
        await uploadPrivateFile(
          `opportunities/${organizationId}/${opportunityId}/${index}-${safeName}`,
          file,
          {
            handleUploadUrl: "/api/ops/opportunity-uploads",
            clientPayload: JSON.stringify({
              opportunityId,
              documentId: null,
              kind: parsed.value.kind,
              revisionLabel: parsed.value.revisionLabel,
              filename: parsed.value.filename,
            }),
          },
        );
        uploaded.push(file.name);
      }
      form.reset();
      setMessage({
        tone: uploaded.length === 0 ? "error" : "success",
        text:
          uploaded.length === 0
            ? (failed[0] ?? "Those files could not be uploaded.")
            : "Bid package uploaded. It stays in quarantine until it is scanned.",
      });
      router.refresh();
    } catch {
      setMessage({
        tone: "error",
        text: "The files could not be uploaded. Check them and retry.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submitDirectUpload} className="space-y-4">
      <UploadFields />
      {uploading ? (
        <Progress value={progress} aria-label="Bid package upload progress">
          <ProgressLabel>Uploading files</ProgressLabel>
          <ProgressValue />
        </Progress>
      ) : null}
      {message ? (
        <Alert variant={message.tone === "error" ? "destructive" : "default"}>
          {message.tone === "error" ? (
            <AlertCircleIcon aria-hidden="true" />
          ) : (
            <CheckCircle2Icon aria-hidden="true" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" className="min-h-11" disabled={uploading}>
        <UploadCloudIcon aria-hidden="true" />
        Upload bid package
      </Button>
    </form>
  );
}
