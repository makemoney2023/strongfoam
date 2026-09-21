"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmTranscriptRecord } from "@/app/app/jobs/ai-follow-actions";
import type { TranscriptRecordProposal } from "@/lib/ops/transcript-record";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TranscriptRecordPanel({
  jobId,
  proposals,
}: {
  jobId: string;
  proposals: TranscriptRecordProposal[];
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const visible = proposals.filter((proposal) => !hidden.includes(proposal.voiceNoteId));

  async function confirm(proposal: TranscriptRecordProposal) {
    setPending(proposal.voiceNoteId);
    setMessage(null);
    const result = await confirmTranscriptRecord(jobId, proposal);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Record saved.");
    router.refresh();
  }

  if (!visible.length && !message) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript record</CardTitle>
        <CardDescription>
          A completed transcript can propose one blocker, deficiency, or material request. Saving uses the existing voice extract. Dismissing writes nothing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible.map((proposal) => (
          <div key={proposal.voiceNoteId} className="space-y-2">
            <p className="text-sm">{proposal.effect}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={pending !== null}
                onClick={() => confirm(proposal)}
              >
                Save record
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending !== null}
                onClick={() => {
                  setHidden((current) => [...current, proposal.voiceNoteId]);
                  setMessage("Transcript left unchanged.");
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
