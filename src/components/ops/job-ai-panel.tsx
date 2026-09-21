"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  discardJobAiDraft,
  draftJobDailyReport,
  saveJobDailyReport,
  summarizeJob,
} from "@/app/app/jobs/ai-actions";
import { citationHref, type Citation } from "@/lib/ops/ai-evidence";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Cited = { text: string; citations: Citation[] };

type SummaryState = {
  paragraph: string;
  bullets: Cited[];
};

export function JobAiPanel({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  async function runSummary() {
    setPending("summary");
    setMessage(null);
    const result = await summarizeJob(jobId);
    setPending(null);
    if (result.status === "disabled") {
      setSummary(null);
      setMessage(
        "Job summaries are off until an AI gateway model is configured. You can still add a daily report in the field log.",
      );
      return;
    }
    if (result.status === "failed") {
      setMessage(result.message);
      return;
    }
    setSummary({ paragraph: result.paragraph, bullets: result.bullets });
  }

  async function runDraft() {
    setPending("draft");
    setMessage(null);
    const result = await draftJobDailyReport(jobId);
    setPending(null);
    if (result.status === "disabled") {
      setDraft(null);
      setMessage(
        "Job summaries are off until an AI gateway model is configured. You can still add a daily report in the field log.",
      );
      return;
    }
    if (result.status === "failed") {
      setMessage(result.message);
      return;
    }
    setDraft(result.body ?? "");
  }

  async function saveDraft() {
    if (!draft?.trim()) return;
    setPending("save");
    setMessage(null);
    const result = await saveJobDailyReport(jobId, draft);
    setPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setDraft(null);
    setMessage("Daily report saved.");
    router.refresh();
  }

  async function discardDraft() {
    setPending("discard");
    await discardJobAiDraft();
    setDraft(null);
    setPending(null);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Job assistant</CardTitle>
          <CardDescription>
            Summarize this job or draft today’s report from the field log. Nothing is saved until you confirm.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-h-11"
            disabled={pending !== null}
            onClick={runSummary}
          >
            {pending === "summary" ? "Summarizing…" : "Summarize job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending !== null}
            onClick={runDraft}
          >
            {pending === "draft" ? "Drafting…" : "Draft today's report"}
          </Button>
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {summary ? (
          <div className="space-y-3">
            <p className="text-sm">{summary.paragraph}</p>
            {summary.bullets.length ? (
              <ul className="space-y-2 text-sm">
                {summary.bullets.map((bullet) => (
                  <li key={bullet.text}>
                    <p>{bullet.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {bullet.citations.map((citation) => (
                        <a
                          key={`${citation.kind}-${citation.id}`}
                          href={citationHref(jobId, citation.kind)}
                          className="mr-3 underline"
                        >
                          {citation.kind.replaceAll("_", " ")}
                        </a>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {draft !== null ? (
          <div className="space-y-3">
            <label className="grid gap-2 text-sm font-medium" htmlFor="ai-daily-report">
              Today’s report
              <Textarea
                id="ai-daily-report"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={10}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                disabled={pending !== null || !draft.trim()}
                onClick={saveDraft}
              >
                {pending === "save" ? "Saving…" : "Save daily report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending !== null}
                onClick={discardDraft}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
