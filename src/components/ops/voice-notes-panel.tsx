import { MicIcon } from "lucide-react";
import { VoiceNoteCard } from "@/components/ops/voice-note-card";
import { VoiceNoteRecorder } from "@/components/ops/voice-note-recorder";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActionState } from "@/lib/ops/action-result";
import type { JobVoiceNoteRow } from "@/lib/ops/store";
import {
  fieldVoiceHref,
  officeVoiceHref,
  type VoiceNoteSource,
} from "@/lib/ops/voice-notes";

type Option = { id: string; name: string };

export function VoiceNotesPanel({
  jobId,
  notes,
  scope,
  returnTo,
  sessionEmail,
  canDeleteAll,
  consentCopy,
  recordAction,
  updateAction,
  extractAction,
  deleteAction,
  areas,
  tasks,
  annotations = [],
  documents = [],
  areaName,
  taskTitle,
  defaultSource = "job",
  defaultTaskId = "",
  defaultAnnotationId = "",
  defaultDocumentId = "",
  defaultWorkAreaId = "",
}: {
  jobId: string;
  notes: JobVoiceNoteRow[];
  scope: "office" | "field";
  returnTo: string;
  sessionEmail: string;
  canDeleteAll: boolean;
  consentCopy: string;
  recordAction: (formData: FormData) => Promise<ActionState | void>;
  updateAction: (formData: FormData) => Promise<ActionState | void>;
  extractAction: (formData: FormData) => Promise<ActionState | void>;
  deleteAction: (formData: FormData) => Promise<ActionState | void>;
  areas: Option[];
  tasks: Option[];
  annotations?: Option[];
  documents?: Option[];
  areaName: (workAreaId: string | null) => string | undefined;
  taskTitle: (taskId: string | null) => string | undefined;
  defaultSource?: VoiceNoteSource;
  defaultTaskId?: string;
  defaultAnnotationId?: string;
  defaultDocumentId?: string;
  defaultWorkAreaId?: string;
}) {
  return (
    <Card id="voice-notes">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <MicIcon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Voice notes</CardTitle>
            <CardDescription>
              Record on site, review the transcript, then turn selected text
              into a task or field entry.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <VoiceNoteRecorder
          jobId={jobId}
          action={recordAction}
          returnTo={returnTo}
          consentCopy={consentCopy}
          areas={areas}
          tasks={tasks}
          annotations={annotations}
          documents={documents}
          defaultSource={defaultSource}
          defaultTaskId={defaultTaskId}
          defaultAnnotationId={defaultAnnotationId}
          defaultDocumentId={defaultDocumentId}
          defaultWorkAreaId={defaultWorkAreaId}
        />
        <div className="space-y-3 border-t pt-5">
          <h3 className="text-sm font-semibold">Recordings</h3>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No voice notes on this job yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <VoiceNoteCard
                  key={note.id}
                  note={note}
                  jobId={jobId}
                  audioHref={
                    scope === "field"
                      ? fieldVoiceHref(jobId, note.id)
                      : officeVoiceHref(jobId, note.id)
                  }
                  returnTo={returnTo}
                  areaName={areaName(note.workAreaId)}
                  taskTitle={taskTitle(note.taskId)}
                  canDelete={canDeleteAll || note.createdBy === sessionEmail}
                  updateAction={updateAction}
                  extractAction={extractAction}
                  deleteAction={deleteAction}
                />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
