"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptScheduleDiff,
  rejectScheduleDiff,
} from "@/app/app/jobs/ai-follow-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ScheduleDiffPanel({
  jobId,
  proposals,
}: {
  jobId: string;
  proposals: Array<{ noteId: string; kind: string; effect: string }>;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const visible = proposals.filter((proposal) => !hidden.includes(proposal.noteId));

  async function accept(noteId: string, effect: string) {
    setPending(noteId);
    setMessage(null);
    const result = await acceptScheduleDiff(jobId, noteId, effect);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Schedule updated.");
    router.refresh();
  }

  async function reject(noteId: string) {
    setPending(noteId);
    await rejectScheduleDiff();
    setHidden((current) => [...current, noteId]);
    setPending(null);
    setMessage("Schedule left unchanged.");
  }

  if (!visible.length && !message) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule diff</CardTitle>
        <CardDescription>
          A blocker or quantity note can suggest a one-working-day slip. Accept uses the existing reschedule. Reject leaves the dates alone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible.map((proposal) => (
          <div key={proposal.noteId} className="space-y-2">
            <p className="text-sm">{proposal.effect}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={pending !== null}
                onClick={() => accept(proposal.noteId, proposal.effect)}
              >
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending !== null}
                onClick={() => reject(proposal.noteId)}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
