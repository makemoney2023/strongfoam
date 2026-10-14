"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { MicIcon, SquareIcon, UploadIcon } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  VOICE_NOTE_SOURCE_LABELS,
  VOICE_NOTE_SOURCES,
  type VoiceNoteSource,
} from "@/lib/ops/voice-notes";

type Option = { id: string; name: string };

function preferredAudioType(): { mimeType: string; filename: string } {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      return { mimeType: "audio/webm", filename: "voice-note.webm" };
    }
    if (MediaRecorder.isTypeSupported("audio/mp4")) {
      return { mimeType: "audio/mp4", filename: "voice-note.m4a" };
    }
  }
  return { mimeType: "audio/webm", filename: "voice-note.webm" };
}

export function VoiceNoteRecorder({
  jobId,
  action,
  returnTo,
  consentCopy,
  areas,
  tasks,
  annotations = [],
  documents = [],
  defaultSource = "job",
  defaultTaskId = "",
  defaultAnnotationId = "",
  defaultDocumentId = "",
  defaultWorkAreaId = "",
  language = "en",
}: {
  jobId: string;
  action: (formData: FormData) => Promise<ActionState | void>;
  returnTo: string;
  consentCopy: string;
  areas: Option[];
  tasks: Option[];
  annotations?: Option[];
  documents?: Option[];
  defaultSource?: VoiceNoteSource;
  defaultTaskId?: string;
  defaultAnnotationId?: string;
  defaultDocumentId?: string;
  defaultWorkAreaId?: string;
  language?: string;
}) {
  const consentKey = "strongfoam-field-voice-consent";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState("");
  const [recordError, setRecordError] = useState<string | null>(null);
  const consentRemembered = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("strongfoam-field-consent", onStoreChange);
      return () => window.removeEventListener("strongfoam-field-consent", onStoreChange);
    },
    () => window.localStorage.getItem(consentKey) === "1",
    () => false,
  );

  const sources = VOICE_NOTE_SOURCES.filter((source) => {
    if (source === "task") return tasks.length > 0;
    if (source === "annotation") return annotations.length > 0;
    if (source === "document") return documents.length > 0;
    return true;
  });

  function assignFile(file: File, seconds: number | null) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = transfer.files;
    setDurationSeconds(seconds && seconds > 0 ? String(seconds) : "");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function startRecording() {
    setRecordError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordError("This browser cannot record audio. Upload a file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = preferredAudioType();
      const recorder = new MediaRecorder(stream, {
        mimeType: preferred.mimeType,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || preferred.mimeType,
        });
        const elapsed = startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : null;
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        assignFile(
          new File([blob], `voice-note.${extension}`, {
            type: blob.type || preferred.mimeType,
          }),
          elapsed,
        );
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setRecordError("Microphone access was denied. Upload a file instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function submitVoice(formData: FormData): Promise<ActionState | void> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const body = "Voice note queued on this device.";
      const workAreaId = String(formData.get("workAreaId") ?? "").trim() || null;
      window.dispatchEvent(
        new CustomEvent("strongfoam-field-queue", {
          detail: {
            id: crypto.randomUUID(),
            draft: {
              jobId,
              kind: "daily_report",
              body,
              quote: body,
              source: "manual",
              workAreaId,
              taskId: null,
              documentId: null,
              voiceNoteId: null,
              quantity: null,
              unit: null,
              effect: "This keeps the queued voice note. It does not transcribe or change the job.",
            },
          },
        }),
      );
      return { href: returnTo, notice: { kind: "success", message: "Voice note queued as a draft." } };
    }
    return action(formData);
  }

  return (
    <ActionForm action={submitVoice} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="durationSeconds" value={durationSeconds} />
      <input type="hidden" name="language" value={language} />
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept="audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg,audio/x-wav,.webm,.m4a,.mp3,.wav,.ogg"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(URL.createObjectURL(file));
        }}
      />

      <div className="space-y-2">
        <Label htmlFor={`voice-source-${jobId}`}>Attached to</Label>
        <NativeSelect
          id={`voice-source-${jobId}`}
          name="source"
          defaultValue={defaultSource}
          className="h-11"
        >
          {sources.map((source) => (
            <option key={source} value={source}>
              {VOICE_NOTE_SOURCE_LABELS[source]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`voice-area-${jobId}`}>Work area</Label>
        <NativeSelect
          id={`voice-area-${jobId}`}
          name="workAreaId"
          defaultValue={defaultWorkAreaId}
          className="h-11"
        >
          <option value="">Entire job</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor={`voice-task-${jobId}`}>Task</Label>
          <NativeSelect
            id={`voice-task-${jobId}`}
            name="taskId"
            defaultValue={defaultTaskId}
            className="h-11"
          >
            <option value="">None</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError name="taskId" />
        </div>
      ) : null}
      {annotations.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor={`voice-mark-${jobId}`}>Plan mark</Label>
          <NativeSelect
            id={`voice-mark-${jobId}`}
            name="annotationId"
            defaultValue={defaultAnnotationId}
            className="h-11"
          >
            <option value="">None</option>
            {annotations.map((annotation) => (
              <option key={annotation.id} value={annotation.id}>
                {annotation.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError name="annotationId" />
        </div>
      ) : null}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor={`voice-doc-${jobId}`}>Document</Label>
          <NativeSelect
            id={`voice-doc-${jobId}`}
            name="documentId"
            defaultValue={defaultDocumentId}
            className="h-11"
          >
            <option value="">None</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError name="documentId" />
        </div>
      ) : null}

      <div className="space-y-3 sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {recording ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={stopRecording}
            >
              <SquareIcon aria-hidden="true" />
              Stop recording
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={startRecording}
            >
              <MicIcon aria-hidden="true" />
              Record
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon aria-hidden="true" />
            Upload audio
          </Button>
        </div>
        {previewUrl ? (
          <audio controls src={previewUrl} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Record on site or upload a WebM, MP4, MP3, WAV, or OGG file.
          </p>
        )}
        {recordError ? (
          <p className="text-sm text-destructive" role="alert">
            {recordError}
          </p>
        ) : null}
        <FieldError name="file" />
      </div>

      {consentRemembered ? (
        <div className="space-y-2 text-sm sm:col-span-2">
          <input type="hidden" name="consent" value="on" />
          <p>Recording consent is saved on this device.</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              window.localStorage.removeItem(consentKey);
              window.dispatchEvent(new Event("strongfoam-field-consent"));
            }}
          >
            Forget recording consent
          </Button>
        </div>
      ) : (
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="consent"
            value="on"
            required
            className="mt-1 size-4"
            onChange={(event) => {
              if (!event.target.checked) return;
              window.localStorage.setItem(consentKey, "1");
              window.dispatchEvent(new Event("strongfoam-field-consent"));
            }}
          />
          <span>{consentCopy}</span>
        </label>
      )}
      <FieldError name="consent" />

      <div className="sm:col-span-2">
        <SubmitButton
          variant="default"
          className="min-h-11 w-full"
          pendingLabel="Saving voice note…"
        >
          Save voice note
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
