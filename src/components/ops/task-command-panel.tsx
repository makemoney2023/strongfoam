"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmTaskCommand,
  previewTaskCommand,
  undoTaskCommand,
} from "@/app/app/jobs/task-command-actions";
import type { TaskCommandKind, TaskCommandProposal } from "@/lib/ops/task-command";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COMMANDS: Array<{ kind: TaskCommandKind; label: string }> = [
  { kind: "complete", label: "Mark done" },
  { kind: "reopen", label: "Reopen" },
  { kind: "slip_due", label: "Move due date one working day" },
];

export function TaskCommandPanel({
  jobId,
  tasks,
  undos,
}: {
  jobId: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  undos: Array<{ taskId: string; title: string; effect: string }>;
}) {
  const router = useRouter();
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [kind, setKind] = useState<TaskCommandKind>("complete");
  const [proposal, setProposal] = useState<TaskCommandProposal | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selectedTaskId = tasks.some((task) => task.id === taskId)
    ? taskId
    : (tasks[0]?.id ?? "");

  async function preview() {
    setPending(true);
    setMessage(null);
    const result = await previewTaskCommand(jobId, selectedTaskId, kind);
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
    const result = await confirmTaskCommand(
      jobId,
      proposal.taskId,
      proposal.kind,
      proposal.expectedUpdatedAt,
    );
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setProposal(null);
    setMessage("Task updated.");
    router.refresh();
  }

  async function undo(undoTaskId: string) {
    setPending(true);
    setMessage(null);
    const result = await undoTaskCommand(jobId, undoTaskId);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setProposal(null);
    setMessage("Task change undone.");
    router.refresh();
  }

  if (tasks.length === 0 && undos.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task command</CardTitle>
        <CardDescription>
          Preview a status or due-date change. Apply writes it. Undo restores that change, and the previous change stays undoable when nothing else edited the task.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {undos.map((item) => (
          <div key={item.taskId} className="space-y-2">
            <p className="text-sm">{item.effect}</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => undo(item.taskId)}
            >
              Undo {item.title}
            </Button>
          </div>
        ))}
        {tasks.length > 0 ? (
          <>
            <label className="grid gap-2 text-sm font-medium" htmlFor="task-command-task">
              Task
              <select
                id="task-command-task"
                className="h-11 rounded-lg border bg-background px-3"
                value={selectedTaskId}
                onChange={(event) => {
                  setTaskId(event.target.value);
                  setProposal(null);
                }}
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="task-command-kind">
              Change
              <select
                id="task-command-kind"
                className="h-11 rounded-lg border bg-background px-3"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as TaskCommandKind);
                  setProposal(null);
                }}
              >
                {COMMANDS.map((command) => (
                  <option key={command.kind} value={command.kind}>
                    {command.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" className="min-h-11" disabled={pending} onClick={preview}>
              Preview command
            </Button>
          </>
        ) : null}
        {proposal ? (
          <div className="space-y-3">
            <p className="text-sm">{proposal.effect}</p>
            <Button type="button" className="min-h-11" disabled={pending} onClick={confirm}>
              Apply command
            </Button>
          </div>
        ) : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
