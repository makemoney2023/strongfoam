"use client";

import { upload } from "@vercel/blob/client";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  UploadCloudIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadJobDocument } from "@/app/app/jobs/actions";
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
  JOB_DOCUMENT_KINDS,
  JOB_DOCUMENT_LABELS,
  parseJobDocumentInput,
} from "@/lib/ops/job-workspace";
import { NativeSelect } from "./native-select";
import { SubmitButton } from "./submit-button";

type AreaOption = { id: string; name: string };
type StorageMode = "demo" | "blob" | "unavailable";

function UploadFields({ areas }: { areas: AreaOption[] }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="jobDocumentFile">
          File <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="jobDocumentFile"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="h-11 cursor-pointer"
          required
        />
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, PNG, or WebP. Maximum 25 MB.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobDocumentKind">Document type</Label>
          <NativeSelect
            id="jobDocumentKind"
            name="kind"
            defaultValue="plan"
            className="h-11"
          >
            {JOB_DOCUMENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {JOB_DOCUMENT_LABELS[kind]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobDocumentWorkArea">Work area</Label>
          <NativeSelect
            id="jobDocumentWorkArea"
            name="workAreaId"
            defaultValue=""
            className="h-11"
          >
            <option value="">Whole job</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </>
  );
}

export function JobDocumentUploader({
  jobId,
  areas,
  storageMode,
}: {
  jobId: string;
  areas: AreaOption[];
  storageMode: StorageMode;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  if (storageMode === "unavailable") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>
          Job document storage is unavailable. Configure
          BLOB_READ_WRITE_TOKEN before uploading production files.
        </AlertDescription>
      </Alert>
    );
  }

  if (storageMode === "demo") {
    return (
      <form action={uploadJobDocument} className="space-y-4">
        <input type="hidden" name="jobId" value={jobId} />
        <UploadFields areas={areas} />
        <SubmitButton className="min-h-11" pendingLabel="Uploading…">
          <UploadCloudIcon aria-hidden="true" />
          Upload document
        </SubmitButton>
      </form>
    );
  }

  async function submitDirectUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage({ tone: "error", text: "Choose a file to upload." });
      return;
    }
    const parsed = parseJobDocumentInput({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind: String(data.get("kind") ?? "plan"),
      workAreaId: String(data.get("workAreaId") ?? ""),
    });
    if (!parsed.ok) {
      setMessage({ tone: "error", text: parsed.error });
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      await upload(`jobs/${jobId}/${safeName}`, file, {
        access: "private",
        handleUploadUrl: "/api/ops/job-uploads",
        multipart: file.size > 5 * 1024 * 1024,
        clientPayload: JSON.stringify({
          jobId,
          workAreaId: parsed.value.workAreaId,
          kind: parsed.value.kind,
          filename: parsed.value.filename,
        }),
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      form.reset();
      setProgress(100);
      setMessage({ tone: "success", text: "Document uploaded." });
      router.refresh();
    } catch {
      setMessage({
        tone: "error",
        text: "The document could not be uploaded. Check the file and retry.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submitDirectUpload} className="space-y-4">
      <UploadFields areas={areas} />
      {uploading ? (
        <Progress value={progress} aria-label="Document upload progress">
          <ProgressLabel>Uploading document</ProgressLabel>
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
      <Button
        type="submit"
        variant="outline"
        className="min-h-11"
        disabled={uploading}
      >
        {uploading ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloudIcon aria-hidden="true" />
        )}
        {uploading ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}
