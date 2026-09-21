"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmSpokenPlanMark,
  previewSpokenPlanMark,
} from "@/app/app/jobs/ai-follow-actions";
import type { SpokenPlanProposal } from "@/lib/ops/spoken-plan-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SpeakOntoPlan({
  jobId,
  documentId,
  notes,
}: {
  jobId: string;
  documentId: string;
  notes: Array<{ id: string; filename: string; transcript: string }>;
}) {
  const router = useRouter();
  const [voiceNoteId, setVoiceNoteId] = useState(notes[0]?.id ?? "");
  const [proposal, setProposal] = useState<SpokenPlanProposal | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function preview() {
    setPending(true);
    setMessage(null);
    const result = await previewSpokenPlanMark(jobId, documentId, voiceNoteId);
    setPending(false);
    if (!result.ok) {
      setProposal(null);
      setMessage(result.error);
      return;
    }
    setProposal(result.proposal);
  }

  async function confirm() {
    if (!proposal) return;
    setPending(true);
    setMessage(null);
    const result = await confirmSpokenPlanMark(
      jobId,
      documentId,
      voiceNoteId,
      proposal.effect,
    );
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setProposal(null);
    setMessage("Mark placed.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speak onto the plan</CardTitle>
        <CardDescription>
          A completed transcript can propose one pin. Nothing is placed until you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed transcript on this job.</p>
        ) : (
          <>
            <label className="grid gap-2 text-sm font-medium" htmlFor="spoken-transcript">
              Transcript
              <select
                id="spoken-transcript"
                className="h-11 rounded-lg border bg-background px-3"
                value={voiceNoteId}
                onChange={(event) => {
                  setVoiceNoteId(event.target.value);
                  setProposal(null);
                }}
              >
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.filename}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" className="min-h-11" disabled={pending} onClick={preview}>
              Preview mark
            </Button>
          </>
        )}
        {proposal ? (
          <div className="space-y-3">
            <p className="text-sm">{proposal.effect}</p>
            <Button type="button" className="min-h-11" disabled={pending} onClick={confirm}>
              Place mark
            </Button>
          </div>
        ) : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
