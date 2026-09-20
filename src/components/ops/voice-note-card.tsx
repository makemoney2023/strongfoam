"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/ops/action-result";
import type { JobVoiceNoteRow } from "@/lib/ops/store";
import {
  VOICE_EXTRACT_KINDS,
  VOICE_EXTRACT_LABELS,
  VOICE_NOTE_SOURCE_LABELS,
  VOICE_TRANSCRIPT_STATUS_LABELS,
  type VoiceNoteSource,
  type VoiceTranscriptStatus,
} from "@/lib/ops/voice-notes";

export function VoiceNoteCard({
  note,
  jobId,
  audioHref,
  returnTo,
  areaName,
  taskTitle,
  canDelete,
  updateAction,
  extractAction,
  deleteAction,
}: {
  note: JobVoiceNoteRow;
  jobId: string;
  audioHref: string;
  returnTo: string;
  areaName?: string | null;
  taskTitle?: string | null;
  canDelete: boolean;
  updateAction: (formData: FormData) => Promise<ActionState | void>;
  extractAction: (formData: FormData) => Promise<ActionState | void>;
  deleteAction: (formData: FormData) => Promise<ActionState | void>;
}) {
  const status = note.status as VoiceTranscriptStatus;
  const source = note.source as VoiceNoteSource;
  const completed = status === "completed";

  return (
    <li className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={status}
              label={VOICE_TRANSCRIPT_STATUS_LABELS[status] ?? status}
            />
            <Badge variant="outline">
              {VOICE_NOTE_SOURCE_LABELS[source] ?? source}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {note.createdBy}
            {areaName ? ` · ${areaName}` : ""}
            {taskTitle ? ` · ${taskTitle}` : ""}
            {note.durationSeconds ? ` · ${note.durationSeconds}s` : ""}
            {` · ${note.createdAt.toLocaleString("en-CA")}`}
          </p>
        </div>
        {canDelete ? (
          <ConfirmForm
            action={deleteAction}
            message="Delete this voice note and its audio? This cannot be undone."
          >
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="voiceNoteId" value={note.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitButton
              variant="ghost"
              className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
              pendingLabel="Deleting…"
            >
              <Trash2Icon aria-hidden="true" />
              <span className="sr-only">Delete voice note</span>
            </SubmitButton>
          </ConfirmForm>
        ) : null}
      </div>

      <audio controls src={audioHref} className="w-full" preload="metadata" />

      {note.error ? (
        <p className="text-sm text-destructive">{note.error}</p>
      ) : null}

      {completed ? (
        <>
          <p className="whitespace-pre-wrap text-sm">
            {note.transcript || "No machine transcript. Type what you hear."}
          </p>
          {note.provider ? (
            <p className="text-xs text-muted-foreground">
              {note.provider}
              {note.model ? ` · ${note.model}` : ""}
              {note.confidence != null
                ? ` · ${Math.round(note.confidence * 100)}%`
                : ""}
              {note.language ? ` · ${note.language}` : ""}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <FormDialog
              triggerLabel="Edit transcript"
              triggerIcon={<PencilIcon aria-hidden="true" />}
              triggerVariant="outline"
              title="Edit transcript"
              description="The original machine transcript stays on the record."
            >
              <ActionForm action={updateAction} className="grid gap-3">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="voiceNoteId" value={note.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="space-y-2">
                  <Label htmlFor={`transcript-${note.id}`}>Transcript</Label>
                  <Textarea
                    id={`transcript-${note.id}`}
                    name="transcript"
                    rows={5}
                    maxLength={8000}
                    defaultValue={note.transcript ?? ""}
                    required
                  />
                  <FieldError name="transcript" />
                </div>
                <SubmitButton variant="default" className="min-h-11 w-full">
                  Save transcript
                </SubmitButton>
              </ActionForm>
            </FormDialog>
          </div>
          <ActionForm action={extractAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="voiceNoteId" value={note.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`selected-${note.id}`}>Create from this text</Label>
              <Textarea
                id={`selected-${note.id}`}
                name="selectedText"
                rows={3}
                maxLength={4000}
                defaultValue={note.transcript ?? ""}
                required
              />
              <FieldError name="selectedText" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`kind-${note.id}`}>Record type</Label>
              <NativeSelect
                id={`kind-${note.id}`}
                name="kind"
                defaultValue="task"
                className="h-11"
              >
                {VOICE_EXTRACT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {VOICE_EXTRACT_LABELS[kind]}
                  </option>
                ))}
              </NativeSelect>
              <FieldError name="kind" />
            </div>
            <div className="flex items-end">
              <SubmitButton variant="outline" className="min-h-11 w-full">
                Create record
              </SubmitButton>
            </div>
          </ActionForm>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status === "failed"
            ? "Transcription failed. Play the audio and type the transcript after retrying from the office if needed."
            : "Transcription is in progress. This page refreshes when the transcript is ready."}
        </p>
      )}
    </li>
  );
}
