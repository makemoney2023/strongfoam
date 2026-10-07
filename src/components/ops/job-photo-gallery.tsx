"use client";

import { uploadPrivateFile } from "@/lib/cloudflare/upload-client";
import {
  CameraIcon,
  FileTextIcon,
  ImagesIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  removeJobDocument as defaultRemoveJobDocument,
  saveJobDocumentMeta as defaultSaveJobDocumentMeta,
  uploadJobDocument as defaultUploadJobDocument,
} from "@/app/app/jobs/actions";
import { DocumentMetaFields } from "@/app/app/jobs/workspace-fields";
import { ActionForm } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { JobCameraDialog } from "@/components/ops/job-camera-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { applyActionResult } from "@/lib/ops/apply-action-result";
import type { ActionState } from "@/lib/ops/action-result";
import {
  JOB_DOCUMENT_LABELS,
  MAX_JOB_UPLOAD_FILES,
  fieldJobDocumentHref,
  formatFileSize,
  isJobImageContentType,
  jobDocumentHref,
  normalizeJobPhotoFile,
  parseJobDocumentInput,
} from "@/lib/ops/job-workspace";

type AreaOption = { id: string; name: string };
type StorageMode = "demo" | "blob" | "unavailable";

type GalleryDocument = {
  id: string;
  filename: string;
  contentType: string;
  kind: string;
  workAreaId: string | null;
  sizeBytes: number;
};

function prefersNativeCamera(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function canUseLiveCamera(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function JobPhotoGallery({
  jobId,
  areas,
  documents,
  storageMode,
  returnTo,
  handleUploadUrl = "/api/ops/job-uploads",
  documentScope = "ops",
  uploadAction = defaultUploadJobDocument,
  saveMetaAction = defaultSaveJobDocumentMeta,
  removeAction = defaultRemoveJobDocument,
  editable = true,
}: {
  jobId: string;
  areas: AreaOption[];
  documents: GalleryDocument[];
  storageMode: StorageMode;
  returnTo: string;
  handleUploadUrl?: string;
  documentScope?: "ops" | "field";
  uploadAction?: (formData: FormData) => Promise<ActionState>;
  saveMetaAction?: (formData: FormData) => Promise<ActionState>;
  removeAction?: (formData: FormData) => Promise<ActionState>;
  editable?: boolean;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [workAreaId, setWorkAreaId] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaName = (workAreaId: string | null) =>
    areas.find((area) => area.id === workAreaId)?.name;

  async function uploadFiles(files: File[]) {
    if (storageMode === "unavailable") {
      setError("Photo storage is unavailable on this environment.");
      return;
    }
    files = files.map(normalizeJobPhotoFile);
    if (files.length === 0) return;
    if (files.length > MAX_JOB_UPLOAD_FILES) {
      setError(`Upload up to ${MAX_JOB_UPLOAD_FILES} photos at a time.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      if (storageMode === "demo") {
        const data = new FormData();
        data.set("jobId", jobId);
        data.set("kind", "photo");
        data.set("workAreaId", workAreaId);
        data.set("returnTo", returnTo);
        for (const file of files) data.append("file", file);
        applyActionResult(await uploadAction(data), router);
        return;
      }

      const failed: string[] = [];
      let uploaded = 0;
      for (const [index, file] of files.entries()) {
        const parsed = parseJobDocumentInput({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          kind: "photo",
          workAreaId,
        });
        if (!parsed.ok) {
          failed.push(`${file.name}: ${parsed.error}`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        await uploadPrivateFile(`jobs/${jobId}/${index}-${safeName}`, file, {
          handleUploadUrl,
          clientPayload: JSON.stringify({
            jobId,
            workAreaId: parsed.value.workAreaId,
            kind: parsed.value.kind,
            filename: parsed.value.filename,
          }),
        });
        uploaded += 1;
      }
      if (uploaded === 0) {
        setError(failed[0] ?? "Those photos could not be uploaded.");
        return;
      }
      applyActionResult(
        {
          href: returnTo,
          notice: {
            kind: "success",
            message:
              failed.length > 0
                ? `${uploaded} uploaded. ${failed[0]}`
                : uploaded === 1
                  ? "Photo uploaded."
                  : `${uploaded} photos uploaded.`,
          },
        },
        router,
      );
    } catch {
      setError("The photos could not be uploaded. Check them and retry.");
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (libraryInputRef.current) libraryInputRef.current.value = "";
    }
  }

  function openCamera() {
    if (prefersNativeCamera() || !canUseLiveCamera()) {
      cameraInputRef.current?.click();
      return;
    }
    setCameraOpen(true);
  }

  const openNativeCamera = useCallback(() => {
    setCameraOpen(false);
    cameraInputRef.current?.click();
  }, []);

  function handleCapturedPhoto(file: File) {
    setCameraOpen(false);
    void uploadFiles([file]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="photoWorkArea">Pin to</Label>
          <NativeSelect
            id="photoWorkArea"
            value={workAreaId}
            onChange={(event) => setWorkAreaId(event.target.value)}
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
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 shrink-0"
          disabled={uploading || storageMode === "unavailable"}
          onClick={() => libraryInputRef.current?.click()}
        >
          <ImagesIcon aria-hidden="true" />
          Library
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          void uploadFiles(files);
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          void uploadFiles(files);
        }}
      />

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <li>
          <button
            type="button"
            onClick={openCamera}
            disabled={uploading || storageMode === "unavailable"}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/20 bg-muted/50 text-foreground transition hover:border-foreground/40 hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          >
            {uploading ? (
              <LoaderCircleIcon className="size-8 animate-spin" aria-hidden="true" />
            ) : (
              <CameraIcon className="size-8" aria-hidden="true" />
            )}
            <span className="text-xs font-medium">
              {uploading ? "Uploading…" : "Camera"}
            </span>
          </button>
        </li>
        {documents.map((document) => {
          const href =
            documentScope === "field"
              ? fieldJobDocumentHref(jobId, document.id)
              : jobDocumentHref(jobId, document.id);
          const isImage = isJobImageContentType(document.contentType);
          return (
            <li
              key={document.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-muted"
            >
              <a href={href} className="block size-full">
                {isImage ? (
                  // Authenticated job files are served by the ops document route.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={href}
                    alt={document.filename}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <FileTextIcon className="size-7 text-muted-foreground" aria-hidden="true" />
                    <span className="line-clamp-3 text-xs font-medium">
                      {document.filename}
                    </span>
                  </span>
                )}
                <span className="sr-only">
                  Open {document.filename}
                </span>
              </a>
              {editable ? (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-0.5 bg-gradient-to-t from-black/70 to-transparent p-1">
                <FormDialog
                  triggerLabel=""
                  triggerIcon={<PencilIcon aria-hidden="true" />}
                  triggerVariant="ghost"
                  triggerClassName="size-11 min-h-11 text-white hover:bg-white/15 hover:text-white"
                  triggerAriaLabel={`Edit ${document.filename}`}
                  title="Edit file"
                  description={document.filename}
                >
                  <ActionForm action={saveMetaAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="jobId" value={jobId} />
                    <input type="hidden" name="documentId" value={document.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <DocumentMetaFields
                      idPrefix={`doc-${document.id}`}
                      areas={areas}
                      defaults={document}
                    />
                    <div className="sm:col-span-2">
                      <SubmitButton variant="default" className="min-h-11 w-full">
                        Save file
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </FormDialog>
                <ConfirmForm
                  action={removeAction}
                  message={`Delete ${document.filename}? The file is removed permanently.`}
                >
                  <input type="hidden" name="jobId" value={jobId} />
                  <input type="hidden" name="documentId" value={document.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <SubmitButton
                    variant="ghost"
                    className="size-11 min-h-11 text-white hover:bg-white/15 hover:text-white"
                    pendingLabel="Deleting…"
                  >
                    <Trash2Icon aria-hidden="true" />
                    <span className="sr-only">Delete {document.filename}</span>
                  </SubmitButton>
                </ConfirmForm>
              </div>
              ) : null}
              <p className="pointer-events-none absolute inset-x-0 top-0 truncate bg-gradient-to-b from-black/55 to-transparent px-2 py-1.5 text-[11px] text-white">
                {JOB_DOCUMENT_LABELS[document.kind as keyof typeof JOB_DOCUMENT_LABELS] ??
                  document.kind}
                {areaName(document.workAreaId) ? ` · ${areaName(document.workAreaId)}` : ""}
                {` · ${formatFileSize(document.sizeBytes)}`}
              </p>
            </li>
          );
        })}
      </ul>

      {documents.length === 0 && !uploading ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. Tap the camera to shoot, or add from the library.
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {storageMode === "unavailable" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Photo storage is unavailable. Configure BLOB_READ_WRITE_TOKEN before
            uploading production files.
          </AlertDescription>
        </Alert>
      ) : null}

      <JobCameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCapturedPhoto}
        onUnavailable={openNativeCamera}
      />
    </div>
  );
}
