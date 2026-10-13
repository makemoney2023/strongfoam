import type { ProposalEvent, ProposalLifecycleStatus } from "@/lib/ops/proposals";

export const FOLLOWUP_GAPS = [
  { day: 3, sleep: "3 days" },
  { day: 7, sleep: "4 days" },
  { day: 14, sleep: "7 days" },
] as const;

export type FollowupDay = (typeof FOLLOWUP_GAPS)[number]["day"];

const OPEN_PROPOSAL_STATUSES = ["generated", "delivered", "viewed"] as const;

export function followupStillOpen(status: ProposalLifecycleStatus): boolean {
  return (OPEN_PROPOSAL_STATUSES as readonly string[]).includes(status);
}

export type FollowupParams = {
  organizationId: string;
  proposalId: string;
  estimateId: string;
  estimateNumber: string;
  recipientName: string;
  recipientEmail: string;
};

export type FollowupDraft = {
  kind: "proposal_followup";
  status: "proposed";
  requiresConfirmation: true;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
  organizationId: string;
  recordId: string;
  proposalId: string;
  estimateId: string;
  day: FollowupDay;
  title: string;
  body: string;
  href: string;
  workingDay: string;
  recipientName: string;
  recipientEmail: string;
};

export type FollowupStep = {
  sleep(name: string, duration: string): Promise<void>;
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export function followupDraft(
  input: FollowupParams & { day: FollowupDay; workingDay: string },
): FollowupDraft {
  const estimateNumber = input.estimateNumber.trim();
  const day = input.day;
  return {
    kind: "proposal_followup",
    status: "proposed",
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    organizationId: input.organizationId,
    recordId: `${input.proposalId}:day-${day}`,
    proposalId: input.proposalId,
    estimateId: input.estimateId,
    day,
    title: `Follow-up draft · ${estimateNumber} · day ${day}`,
    body: `Following up on estimate ${estimateNumber}, day ${day}. The proposal is still open. This draft is for the owner to review. It was not sent.`,
    href: "/app/automation",
    workingDay: input.workingDay,
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim(),
  };
}

export async function runFollowupSteps(
  step: FollowupStep,
  params: FollowupParams,
  deps: {
    isOpen: (proposalId: string) => Promise<boolean>;
    saveDraft: (draft: FollowupDraft) => Promise<void>;
    send?: (message: unknown) => Promise<void>;
  },
): Promise<FollowupDraft[]> {
  const saved: FollowupDraft[] = [];
  for (const gap of FOLLOWUP_GAPS) {
    await step.sleep(`wait-day-${gap.day}`, gap.sleep);
    const draft = await step.do(`draft-day-${gap.day}`, async () => {
      const open = await deps.isOpen(params.proposalId);
      if (!open) return null;
      const next = followupDraft({
        ...params,
        day: gap.day,
        workingDay: `day-${gap.day}`,
      });
      await deps.saveDraft(next);
      return next;
    });
    if (!draft) break;
    saved.push(draft);
  }
  return saved;
}

export type ReplyClass = "accepted" | "question" | "lost" | "other";

const ACCEPT_PATTERN = /\b(accept|accepted|go ahead|proceed)\b/i;
const LOST_PATTERN =
  /\b(decline|declined|not moving forward|went with|another (?:vendor|contractor|company)|no longer|pass on)\b/i;
const QUESTION_PATTERN = /\?|\b(question|clarify|clarification|wondering|can you)\b/i;

export function classifyProposalReply(input: {
  subject: string;
  text: string;
  modelLabel?: string | null;
}): { classification: ReplyClass; quote: string } {
  const blob = `${input.subject}\n${input.text}`;
  const keyword = keywordClass(blob);
  const model = normalizeLabel(input.modelLabel);
  const classification = model && textSupports(blob, model) ? model : keyword;
  return { classification, quote: supportingQuote(blob, classification) };
}

export function readReplyLabel(content: string): ReplyClass | null {
  try {
    const parsed = JSON.parse(content) as { label?: unknown };
    return normalizeLabel(parsed.label);
  } catch {
    return null;
  }
}

export type OpenProposalRef = {
  id: string;
  organizationId: string;
  estimateNumber: string;
  recipientEmail: string;
  status: ProposalLifecycleStatus;
};

export function proposalReplyMatch(input: {
  fromEmail: string;
  subject: string;
  text: string;
  open: OpenProposalRef[];
}): OpenProposalRef | null {
  const open = input.open.filter((row) => followupStillOpen(row.status));
  const haystack = `${input.subject}\n${input.text}`.toLowerCase();
  const byNumber = open.filter((row) => {
    const number = row.estimateNumber.trim().toLowerCase();
    return number.length > 0 && haystack.includes(number);
  });
  if (byNumber.length === 1) return byNumber[0];
  if (byNumber.length > 1) return null;
  const from = input.fromEmail.trim().toLowerCase();
  const byEmail = open.filter((row) => row.recipientEmail.trim().toLowerCase() === from);
  if (byEmail.length === 1) return byEmail[0];
  return null;
}

export type StatusChangeDraft = {
  kind: "status_change";
  status: "proposed";
  requiresConfirmation: true;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
  organizationId: string;
  recordId: string;
  proposalId: string;
  classification: ReplyClass;
  quote: string;
  title: string;
  body: string;
  href: string;
  workingDay: string;
  recipientEmail: string;
};

export function statusChangeProposal(input: {
  match: OpenProposalRef;
  classification: ReplyClass;
  quote: string;
  fromEmail: string;
  subject: string;
  text: string;
  workingDay: string;
  dedupeKey: string;
}): StatusChangeDraft {
  const kept = quoteFromEmail(input.quote, input.subject, input.text);
  const estimateNumber = input.match.estimateNumber.trim();
  return {
    kind: "status_change",
    status: "proposed",
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    organizationId: input.match.organizationId,
    recordId: `${input.match.id}:${input.dedupeKey}`,
    proposalId: input.match.id,
    classification: input.classification,
    quote: kept,
    title: `Status change · ${estimateNumber} · ${input.classification}`,
    body: `Reply classified as ${input.classification}.\n\n${kept}\n\nConfirming accepted or lost updates the proposal. This draft was not sent.`,
    href: "/app/automation",
    workingDay: input.workingDay,
    recipientEmail: input.fromEmail.trim(),
  };
}

export function confirmedStatusEvent(input: {
  organizationId: string;
  proposalId: string;
  kind: "accepted" | "rejected";
  quote: string;
  actorEmail: string;
  now: Date;
}): ProposalEvent {
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    kind: input.kind,
    actorEmail: input.actorEmail,
    recipientName: null,
    recipientEmail: null,
    channel: "email-reply",
    externalMessageId: null,
    attestation: input.quote.trim() || null,
    ipAddress: null,
    userAgent: null,
    createdAt: input.now,
  };
}

export type FollowupInstance = {
  terminate(): Promise<void>;
};

export type FollowupBinding = {
  create(options: { id: string; params: FollowupParams }): Promise<FollowupInstance>;
  get(id: string): Promise<FollowupInstance>;
};

export async function createFollowupInstance(
  binding: FollowupBinding | null | undefined,
  params: FollowupParams,
): Promise<"started" | "unavailable" | "exists"> {
  if (!binding) return "unavailable";
  try {
    await binding.create({ id: params.proposalId, params });
    return "started";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists|instance\.already/i.test(message)) return "exists";
    throw error;
  }
}

export async function cancelFollowupInstance(
  binding: FollowupBinding | null | undefined,
  proposalId: string,
): Promise<"terminated" | "unavailable"> {
  if (!binding) return "unavailable";
  try {
    const instance = await binding.get(proposalId);
    await instance.terminate();
    return "terminated";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|instance\.not/i.test(message)) return "terminated";
    throw error;
  }
}

function keywordClass(blob: string): ReplyClass {
  if (ACCEPT_PATTERN.test(blob)) return "accepted";
  if (LOST_PATTERN.test(blob)) return "lost";
  if (QUESTION_PATTERN.test(blob)) return "question";
  return "other";
}

function textSupports(blob: string, label: ReplyClass): boolean {
  if (label === "accepted") return ACCEPT_PATTERN.test(blob);
  if (label === "lost") return LOST_PATTERN.test(blob);
  if (label === "question") return QUESTION_PATTERN.test(blob);
  return !ACCEPT_PATTERN.test(blob) && !LOST_PATTERN.test(blob) && !QUESTION_PATTERN.test(blob);
}

function normalizeLabel(value: unknown): ReplyClass | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase();
  if (label === "accepted" || label === "question" || label === "lost" || label === "other") {
    return label;
  }
  return null;
}

function supportingQuote(blob: string, classification: ReplyClass): string {
  const parts = blob
    .split(/\n|(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hit = parts.find((part) => textSupports(part, classification)) ?? parts[0] ?? "";
  return hit.slice(0, 280);
}

function quoteFromEmail(quote: string, subject: string, text: string): string {
  const source = `${subject}\n${text}`;
  const trimmed = quote.trim();
  if (!trimmed || !source.includes(trimmed)) return "";
  return trimmed.slice(0, 280);
}
