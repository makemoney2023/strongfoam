import type { EstimateDiff } from "@/lib/ops/estimates";

export type RevisionSentence = {
  text: string;
  source: string;
};

export type EstimateRevisionExplanation = {
  sentences: RevisionSentence[];
  text: string;
  crossesSecondApprover: boolean;
};

function needsSecondApprover(totalCents: number, threshold: number | null): boolean {
  return threshold != null && totalCents >= threshold;
}

export function explainEstimateRevision(input: {
  fromVersion: number;
  toVersion: number;
  diff: EstimateDiff;
  ruleName: string;
  secondApproverTotalCents: number | null;
}): EstimateRevisionExplanation {
  const sentences: RevisionSentence[] = [];
  const push = (text: string, source: string) => sentences.push({ text, source });
  for (const line of input.diff.lines.added) push(`Added line: ${line}.`, `line:${line}`);
  for (const line of input.diff.lines.removed) push(`Removed line: ${line}.`, `line:${line}`);
  for (const line of input.diff.lines.changed) {
    push(`Changed quantity or price on line: ${line}.`, `line:${line}`);
  }
  for (const clause of input.diff.clauses.added) push(`Added clause: ${clause}.`, `clause:${clause}`);
  for (const clause of input.diff.clauses.removed) push(`Removed clause: ${clause}.`, `clause:${clause}`);
  for (const clause of input.diff.clauses.changed) push(`Changed clause: ${clause}.`, `clause:${clause}`);
  const delta = input.diff.totals.deltaCents;
  push(
    `Total moves by ${delta} cents, from ${input.diff.totals.fromCents} cents to ${input.diff.totals.toCents} cents.`,
    "totals",
  );
  const crossed =
    !needsSecondApprover(input.diff.totals.fromCents, input.secondApproverTotalCents) &&
    needsSecondApprover(input.diff.totals.toCents, input.secondApproverTotalCents);
  push(
    crossed
      ? `Version ${input.toVersion} crosses the second-approver threshold on ${input.ruleName}. A person still decides.`
      : `Version ${input.toVersion} does not cross a new approval threshold on ${input.ruleName}. A person still decides.`,
    "approval-rule",
  );
  return {
    sentences,
    text: sentences.map((sentence) => sentence.text).join(" "),
    crossesSecondApprover: crossed,
  };
}

export function keepGroundedParaphrase(modelText: string, grounded: RevisionSentence[]): string {
  const allowed = grounded.map((sentence) => sentence.text);
  const parts = modelText
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = parts.filter((part) => allowed.some((sentence) => part.includes(sentence.replace(/\.$/, "")) || sentence.includes(part)));
  if (!kept.length) return grounded.map((sentence) => sentence.text).join(" ");
  return kept.join(" ");
}
