import type { FieldDraft } from "@/lib/ops/field-drafts";

export function confirmedDailyReport(input: {
  jobName: string;
  workingDay: string;
  doneTasks: string[];
  drafts: Array<Pick<FieldDraft, "status" | "kind" | "body">>;
}): string | null {
  const confirmed = input.drafts.filter((draft) => draft.status === "confirmed" && draft.body.trim());
  if (confirmed.length === 0 && input.doneTasks.length === 0) return null;
  if (confirmed.length === 0) return null;
  const lines = [
    `${input.jobName} daily report for ${input.workingDay}.`,
    ...input.doneTasks.map((title) => `Done: ${title}.`),
    ...confirmed.map((draft) => `${draft.kind.replaceAll("_", " ")}: ${draft.body.trim()}`),
  ];
  return lines.join(" ");
}
