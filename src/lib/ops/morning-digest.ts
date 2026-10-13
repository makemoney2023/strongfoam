const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CLOSED_LEAD = new Set(["won", "lost", "archived"]);
const OPEN_QUOTE = new Set(["delivered", "viewed"]);

export type DigestLead = {
  id: string;
  label: string;
  workflowStatus: string;
  nextActionDueAt: Date | null;
  updatedAt: Date;
  href: string;
};

export type DigestQuote = {
  id: string;
  estimateNumber: string;
  status: string;
  href: string;
};

export type DigestJob = {
  id: string;
  name: string;
  status: string;
  missingDailyLog: boolean;
  href: string;
};

export type DigestDraft = {
  id: string;
  title: string;
  kind: string;
};

export type MorningDigest = {
  staleLeads: DigestLead[];
  quotesAwaitingDecision: DigestQuote[];
  atRiskJobs: DigestJob[];
  pendingDrafts: DigestDraft[];
};

export function buildMorningDigest(input: {
  now: Date;
  leads: DigestLead[];
  quotes: DigestQuote[];
  jobs: DigestJob[];
  drafts: DigestDraft[];
}): MorningDigest {
  return {
    staleLeads: input.leads.filter((lead) => isStaleLead(lead, input.now)),
    quotesAwaitingDecision: input.quotes.filter((quote) => OPEN_QUOTE.has(quote.status)),
    atRiskJobs: input.jobs.filter((job) => job.status === "blocked" || job.missingDailyLog),
    pendingDrafts: input.drafts,
  };
}

export function leadDigestRow(request: {
  id: string;
  company: string;
  firstName: string;
  lastName: string;
  workflowStatus: string;
  nextActionDueAt: Date | null;
  updatedAt: Date;
}): DigestLead {
  const company = request.company.trim();
  const name = `${request.firstName} ${request.lastName}`.trim();
  return {
    id: request.id,
    label: company || name || request.id,
    workflowStatus: request.workflowStatus,
    nextActionDueAt: request.nextActionDueAt,
    updatedAt: request.updatedAt,
    href: `/app/requests/${request.id}`,
  };
}

export function assertInternalRecipient(email: string, optedIn: readonly string[]): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;
  return optedIn.some((item) => item.trim().toLowerCase() === normalized);
}

export function optedInStaffEmails(
  rows: Array<{ email: string; optedIn: boolean }>,
  staffEmails: readonly string[],
): string[] {
  const staff = new Set(staffEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const allowed: string[] = [];
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!row.optedIn || !email || !staff.has(email) || allowed.includes(email)) continue;
    allowed.push(email);
  }
  return allowed;
}

export type StaffDigestMessage = {
  to: string[];
  subject: string;
  text: string;
};

export function digestText(digest: MorningDigest): string {
  const lines = [
    "Strong Foam morning digest",
    "",
    "Stale leads",
    ...section(digest.staleLeads.map((lead) => `${lead.label} · ${lead.href}`)),
    "",
    "Quotes awaiting a decision",
    ...section(digest.quotesAwaitingDecision.map((quote) => `${quote.estimateNumber} · ${quote.href}`)),
    "",
    "At-risk jobs",
    ...section(digest.atRiskJobs.map((job) => `${job.name} · ${job.href}`)),
    "",
    "Pending automation drafts",
    ...section(digest.pendingDrafts.map((draft) => draft.title)),
    "",
    "Review drafts at /app/automation. This note is for staff who opted in. It is not a customer message.",
  ];
  return lines.join("\n");
}

export function staffDigestMessage(
  digest: MorningDigest,
  recipient: string,
  optedIn: readonly string[],
): StaffDigestMessage | null {
  if (!assertInternalRecipient(recipient, optedIn)) return null;
  return {
    to: [recipient.trim()],
    subject: "Strong Foam morning digest",
    text: digestText(digest),
  };
}

export function morningDigestDraft(input: {
  organizationId: string;
  workingDay: string;
  digest: MorningDigest;
}): {
  kind: "morning_digest";
  status: "proposed";
  requiresConfirmation: true;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
  organizationId: string;
  recordId: string;
  title: string;
  body: string;
  href: string;
  workingDay: string;
} {
  return {
    kind: "morning_digest",
    status: "proposed",
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    organizationId: input.organizationId,
    recordId: input.organizationId,
    title: "Morning digest",
    body: digestText(input.digest),
    href: "/app",
    workingDay: input.workingDay,
  };
}

function isStaleLead(lead: DigestLead, now: Date): boolean {
  if (CLOSED_LEAD.has(lead.workflowStatus)) return false;
  if (lead.nextActionDueAt && lead.nextActionDueAt.getTime() < now.getTime()) return true;
  return now.getTime() - lead.updatedAt.getTime() >= STALE_MS;
}

function section(lines: string[]): string[] {
  return lines.length > 0 ? lines.map((line) => `- ${line}`) : ["- None"];
}
