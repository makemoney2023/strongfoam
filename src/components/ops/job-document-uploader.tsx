"use client";
import { ActionForm } from "@/components/ops/action-form";

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
  MAX_JOB_UPLOAD_FILES,
  parseJobDocumentInput,
} from "@/lib/ops/job-workspace";
import { NativeSelect } from "./native-select";
import { SubmitButton } from "./submit-button";

type AreaOption = { id: string; name: string };
type StorageMode = "demo" | "blob" | "unavailable";

function UploadFields({
  areas,
  defaultKind,
  singleFile = false,
}: {
  areas: AreaOption[];
  defaultKind: "plan" | "photo" | "other";
  singleFile?: boolean;
}) {
  const photoFirst = defaultKind === "photo";
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="jobDocumentFile">
          {photoFirst ? "Photos" : "Files"} <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="jobDocumentFile"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple={!singleFile}
          className="h-11 cursor-pointer"
          required
        />
        <p className="text-xs text-muted-foreground">
          {singleFile
            ? "PDF, JPEG, PNG, or WebP. One file, up to 25 MB."
            : photoFirst
            ? `Select many photos at once. JPEG, PNG, WebP, or PDF. Up to ${MAX_JOB_UPLOAD_FILES} files, 25 MB each.`
            : `PDF, JPEG, PNG, or WebP. Up to ${MAX_JOB_UPLOAD_FILES} files, 25 MB each.`}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobDocumentKind">Document type</Label>
          <NativeSelect
            id="jobDocumentKind"
            name="kind"
            defaultValue={defaultKind}
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
  defaultKind = "plan",
  returnTo,
  replacesDocumentId,
}: {
  jobId: string;
  areas: AreaOption[];
  storageMode: StorageMode;
  defaultKind?: "plan" | "photo" | "other";
  returnTo?: string;
  replacesDocumentId?: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const submitLabel = defaultKind === "photo" ? "Upload photos" : "Upload files";

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
      <ActionForm action={uploadJobDocument} className="space-y-4">
        <input type="hidden" name="jobId" value={jobId} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        {replacesDocumentId ? (
          <input
            type="hidden"
            name="replacesDocumentId"
            value={replacesDocumentId}
          />
        ) : null}
        <UploadFields
          areas={areas}
          defaultKind={defaultKind}
          singleFile={Boolean(replacesDocumentId)}
        />
        <SubmitButton className="min-h-11" pendingLabel="Uploading…">
          <UploadCloudIcon aria-hidden="true" />
          {submitLabel}
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
    if (files.length > MAX_JOB_UPLOAD_FILES) {
      setMessage({
        tone: "error",
        text: `Upload up to ${MAX_JOB_UPLOAD_FILES} files at a time.`,
      });
      return;
    }
    if (replacesDocumentId && files.length !== 1) {
      setMessage({
        tone: "error",
        text: "Upload one file per plan revision.",
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
        const parsed = parseJobDocumentInput({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          kind: String(data.get("kind") ?? "plan"),
          workAreaId: String(data.get("workAreaId") ?? ""),
          replacesDocumentId: String(data.get("replacesDocumentId") ?? ""),
        });
        if (!parsed.ok) {
          failed.push(`${file.name}: ${parsed.error}`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        await upload(`jobs/${jobId}/${index}-${safeName}`, file, {
          access: "private",
          handleUploadUrl: "/api/ops/job-uploads",
          multipart: file.size > 5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            jobId,
            workAreaId: parsed.value.workAreaId,
            kind: parsed.value.kind,
            filename: parsed.value.filename,
            replacesDocumentId: parsed.value.replacesDocumentId ?? null,
          }),
          onUploadProgress: ({ percentage }) => {
            const overall = ((index + percentage / 100) / files.length) * 100;
            setProgress(Math.round(overall));
          },
        });
        uploaded.push(file.name);
      }
      form.reset();
      setProgress(100);
      if (uploaded.length === 0) {
        setMessage({
          tone: "error",
          text: failed[0] ?? "Those files could not be uploaded.",
        });
      } else if (failed.length > 0) {
        setMessage({
          tone: "success",
          text: `${uploaded.length} uploaded. ${failed[0]}`,
        });
      } else {
        setMessage({
          tone: "success",
          text:
            uploaded.length === 1
              ? "File uploaded."
              : `${uploaded.length} files uploaded.`,
        });
      }
      if (returnTo) router.replace(returnTo);
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
      <input type="hidden" name="jobId" value={jobId} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {replacesDocumentId ? (
        <input
          type="hidden"
          name="replacesDocumentId"
          value={replacesDocumentId}
        />
      ) : null}
      <UploadFields
        areas={areas}
        defaultKind={defaultKind}
        singleFile={Boolean(replacesDocumentId)}
      />
      {uploading ? (
        <Progress value={progress} aria-label="Document upload progress">
          <ProgressLabel>
            Uploading {defaultKind === "photo" ? "photos" : "files"}
          </ProgressLabel>
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
        {uploading ? "Uploading…" : submitLabel}
      </Button>
    </form>
  );
}
