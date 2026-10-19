import { createHash } from "node:crypto";
import { buildLeadInsertValues } from "@/lib/leads/adapters";
import type { CloudflareEmailMessage } from "@/lib/cloudflare/email";
import { qualifyLead } from "@/lib/leads/qualify";
import type { LeadPayload } from "@/lib/leads/schema";
import { demoAiFixturesEnabled, inboundTriageModel, keepGroundedSentences } from "@/lib/ops/demo-ai-fixtures";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "tif",
  "tiff",
]);

const ESTIMATE_PATTERN = /\b(estimate|quote|bid|tender|drawing|spec)\b/i;

export type InboundAttachmentInput = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StoredAttachment = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string | null;
  skippedReason: string | null;
};

export type InboundTriage = {
  intent: "estimate" | "general" | "other";
  company: string;
  phone: string;
  city: string;
  firstName: string;
  lastName: string;
  model: string | null;
};

export type InboundProposal = {
  organizationId: string;
  dedupeKey: string;
  messageId: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  receivedAt: string;
  attachments: StoredAttachment[];
  triage: InboundTriage;
  replyDraft: string;
  status: "proposed" | "accepted" | "dismissed" | "sent";
  leadId: string | null;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
  requiresConfirmation: true;
};

export type ParsedInboundMail = {
  messageId: string;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  receivedAt: string;
  attachments: InboundAttachmentInput[];
};

export type InboundRepository = {
  findProposal(organizationId: string, dedupeKey: string): Promise<InboundProposal | null>;
  insertProposal(proposal: InboundProposal): Promise<"created" | "duplicate">;
  saveProposal(proposal: InboundProposal): Promise<void>;
  findLead(idempotencyKey: string): Promise<{ id: string } | null>;
  insertLead(values: Record<string, unknown>): Promise<{ id: string }>;
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function inboundDedupeKey(mail: {
  messageId?: string;
  fromEmail: string;
  subject: string;
  text: string;
}): string {
  const messageId = mail.messageId?.trim();
  const material = messageId
    ? `message-id:${messageId.toLowerCase()}`
    : `content:${normalize(mail.fromEmail)}|${normalize(mail.subject)}|${normalize(mail.text)}`;
  return createHash("sha256").update(material).digest("hex");
}

export function parseMailbox(value: string): { name: string; email: string } {
  const trimmed = value.trim();
  const wrapped = trimmed.match(/^(.*)<([^>]+)>$/);
  const email = (wrapped ? wrapped[2] : trimmed).trim().toLowerCase();
  const name = (wrapped ? wrapped[1] : "").replace(/"/g, "").trim();
  return { name, email };
}

export function namesFromMailbox(name: string, email: string): { firstName: string; lastName: string } {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0].slice(0, 80), lastName: parts.slice(1).join(" ").slice(0, 80) };
  }
  if (parts.length === 1) return { firstName: parts[0].slice(0, 80), lastName: "Inbound" };
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return { firstName: (local || "Inbound").slice(0, 80), lastName: "Mail" };
}

function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function safeAttachmentName(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "attachment";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+/, "");
  return (cleaned || "attachment").slice(0, 120);
}

export function attachmentDecision(file: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}): { store: boolean; reason: string | null } {
  if (file.sizeBytes <= 0 || file.sizeBytes > 15_000_000) {
    return { store: false, reason: "size" };
  }
  const extension = extensionOf(file.filename);
  const type = file.contentType.toLowerCase();
  const allowedType = type === "application/pdf" || type.startsWith("image/");
  if (!ALLOWED_EXTENSIONS.has(extension) || !allowedType) {
    return { store: false, reason: "type" };
  }
  return { store: true, reason: null };
}

export function inboundObjectKey(
  organizationId: string,
  dedupeKey: string,
  filename: string,
): string {
  return `inbound/${organizationId}/${dedupeKey}/${safeAttachmentName(filename)}`;
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function keywordIntent(text: string): InboundTriage["intent"] {
  if (!text.trim()) return "other";
  return ESTIMATE_PATTERN.test(text) ? "estimate" : "general";
}

function groundedField(value: unknown, text: string): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length < 2) return "";
  if (text.toLowerCase().includes(trimmed.toLowerCase())) return trimmed.slice(0, 120);
  const needle = digits(trimmed);
  if (needle.length >= 7 && digits(text).includes(needle)) return trimmed.slice(0, 40);
  return "";
}

export function triageInbound(
  mail: { text: string; fromName: string; fromEmail: string },
  modelOutput?: unknown,
  model?: string | null,
): InboundTriage {
  const names = namesFromMailbox(mail.fromName, mail.fromEmail);
  const parsed =
    modelOutput && typeof modelOutput === "object"
      ? (modelOutput as Record<string, unknown>)
      : {};
  const intent = parsed.intent;
  return {
    intent:
      intent === "estimate" || intent === "general" || intent === "other"
        ? intent
        : keywordIntent(mail.text),
    company: groundedField(parsed.company, mail.text),
    phone: groundedField(parsed.phone, mail.text),
    city: groundedField(parsed.city, mail.text),
    firstName: names.firstName,
    lastName: names.lastName,
    model: model ?? null,
  };
}

export function firstReplyDraft(mail: {
  fromName: string;
  fromEmail: string;
  subject: string;
  attachmentCount: number;
}): string {
  const name = mail.fromName.trim() || mail.fromEmail;
  const files =
    mail.attachmentCount > 0 ? " We have the files you attached." : "";
  return `Hello ${name},\n\nWe received your message "${mail.subject}". A person at Strong Foam will review it before anyone replies with pricing or a site visit.${files}\n`;
}

export function keepGroundedReply(draft: string, grounded: string): string {
  const allowed = grounded
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const kept = draft
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => allowed.some((item) => item === sentence));
  return kept.length > 0 ? `${kept.join(" ")}\n` : grounded;
}

export function inboundLeadKey(dedupeKey: string): string {
  return `email:${dedupeKey}`;
}

export function leadPayloadForInbound(proposal: InboundProposal, now: number): LeadPayload {
  const phone = proposal.triage.phone || "unlisted";
  const uploadPaths = proposal.attachments
    .map((file) => file.r2Key)
    .filter((key): key is string => Boolean(key));
  const shared = {
    firstName: proposal.triage.firstName,
    lastName: proposal.triage.lastName,
    email: proposal.fromEmail,
    phone,
    consent: true as const,
    companyWebsite: "",
    startedAt: now,
    draftId: crypto.randomUUID(),
    uploadPaths,
  };
  if (proposal.triage.intent === "estimate" && proposal.triage.city) {
    const ontario = /\bontario\b|\bON\b/.test(proposal.text);
    return {
      intakeType: "estimate",
      projectType: "residential_other",
      city: proposal.triage.city,
      province: ontario ? "ON" : "outside_ontario",
      notes: proposal.text.slice(0, 2000),
      company: proposal.triage.company,
      services: [],
      ...shared,
    };
  }
  return {
    intakeType: "general",
    message: (proposal.text || proposal.subject || "Inbound email").slice(0, 2000),
    company: proposal.triage.company,
    ...shared,
  };
}

export async function prepareInboundProposal(
  mail: ParsedInboundMail,
  deps: {
    organizationId?: string;
    putObject?: (key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
    repo: Pick<InboundRepository, "findProposal">;
    modelOutput?: unknown;
    model?: string | null;
  },
): Promise<{ outcome: "duplicate"; proposal: InboundProposal } | { outcome: "ready"; proposal: InboundProposal }> {
  const organizationId = deps.organizationId ?? STRONG_FOAM_ORGANIZATION_ID;
  const dedupeKey = inboundDedupeKey(mail);
  const existing = await deps.repo.findProposal(organizationId, dedupeKey);
  if (existing) return { outcome: "duplicate", proposal: existing };
  const attachments: StoredAttachment[] = [];
  let stored = 0;
  for (const file of mail.attachments) {
    const decision = attachmentDecision({
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: file.bytes.byteLength,
    });
    if (!decision.store || stored >= 5 || !deps.putObject) {
      attachments.push({
        filename: safeAttachmentName(file.filename),
        contentType: file.contentType,
        sizeBytes: file.bytes.byteLength,
        r2Key: null,
        skippedReason: decision.store ? (deps.putObject ? "limit" : "no_bucket") : decision.reason,
      });
      continue;
    }
    const r2Key = inboundObjectKey(organizationId, dedupeKey, file.filename);
    await deps.putObject(r2Key, file.bytes, file.contentType);
    stored += 1;
    attachments.push({
      filename: safeAttachmentName(file.filename),
      contentType: file.contentType,
      sizeBytes: file.bytes.byteLength,
      r2Key,
      skippedReason: null,
    });
  }
  const fixture = deps.modelOutput ? null : demoAiFixturesEnabled() ? inboundTriageModel() : null;
  const triage = triageInbound(
    mail,
    deps.modelOutput ?? fixture ?? undefined,
    deps.model ?? (fixture ? "golden-path-fixture" : null),
  );
  const groundedReply = firstReplyDraft({
    fromName: mail.fromName,
    fromEmail: mail.fromEmail,
    subject: mail.subject.slice(0, 200),
    attachmentCount: attachments.filter((file) => file.r2Key).length,
  });
  const proposal: InboundProposal = {
    organizationId,
    dedupeKey,
    messageId: mail.messageId,
    fromEmail: mail.fromEmail,
    fromName: mail.fromName,
    to: mail.to,
    subject: mail.subject.slice(0, 200),
    text: mail.text.slice(0, 8000),
    receivedAt: mail.receivedAt,
    attachments,
    triage,
    replyDraft: fixture
      ? keepGroundedSentences(`${groundedReply} We approved the price.`, groundedReply)
      : groundedReply,
    status: "proposed",
    leadId: null,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    requiresConfirmation: true,
  };
  return { outcome: "ready", proposal };
}

export async function acceptInboundProposal(
  proposal: InboundProposal,
  repo: Pick<InboundRepository, "findLead" | "insertLead" | "saveProposal">,
  now = Date.now(),
): Promise<{ leadId: string; created: boolean }> {
  if (proposal.leadId) return { leadId: proposal.leadId, created: false };
  const key = inboundLeadKey(proposal.dedupeKey);
  const existing = await repo.findLead(key);
  if (existing) {
    await repo.saveProposal({ ...proposal, status: "accepted", leadId: existing.id });
    return { leadId: existing.id, created: false };
  }
  const payload = leadPayloadForInbound(proposal, now);
  const qualification =
    payload.intakeType === "general"
      ? qualifyLead({ intakeType: "general" })
      : qualifyLead({
          intakeType: "estimate",
          projectType: payload.projectType,
          province: payload.province,
          services: [],
        });
  const values = buildLeadInsertValues(
    {
      status: qualification.status,
      bookingStatus: "none",
      notifyStatus: "pending",
      email: proposal.fromEmail,
      idempotencyKey: key,
      payload,
    },
    now,
  );
  values.notifyStatus = "held";
  values.sourcePath = `email:${proposal.dedupeKey}`;
  values.files = proposal.attachments
    .filter((file) => file.r2Key)
    .map((file) => ({ pathname: file.r2Key }));
  const inserted = await repo.insertLead(values);
  await repo.saveProposal({ ...proposal, status: "accepted", leadId: inserted.id });
  return { leadId: inserted.id, created: true };
}

export function decideReplySend(args: {
  proposal: InboundProposal;
  role: string;
  confirmSend: boolean;
  from: string;
}):
  | { send: false; reason: "not_confirmed" | "not_administrator" | "not_accepted" | "empty_draft" }
  | { send: true; message: CloudflareEmailMessage } {
  if (!args.confirmSend) return { send: false, reason: "not_confirmed" };
  if (args.role !== "administrator") return { send: false, reason: "not_administrator" };
  if (args.proposal.status !== "accepted" && args.proposal.status !== "sent") {
    return { send: false, reason: "not_accepted" };
  }
  const text = args.proposal.replyDraft.trim();
  if (!text) return { send: false, reason: "empty_draft" };
  const subject = /^re:/i.test(args.proposal.subject)
    ? args.proposal.subject
    : `Re: ${args.proposal.subject}`;
  return {
    send: true,
    message: {
      to: [args.proposal.fromEmail],
      from: args.from,
      subject,
      text,
    },
  };
}

export function parseRawEmail(raw: string, receivedAt: string): ParsedInboundMail {
  const normalized = raw.replace(/\r\n/g, "\n");
  const splitAt = normalized.indexOf("\n\n");
  const headerText = splitAt === -1 ? normalized : normalized.slice(0, splitAt);
  const body = splitAt === -1 ? "" : normalized.slice(splitAt + 2);
  const headers = new Map<string, string>();
  let current = "";
  for (const line of headerText.split("\n")) {
    if (/^\s/.test(line) && current) {
      headers.set(current, `${headers.get(current) ?? ""} ${line.trim()}`);
      continue;
    }
    const index = line.indexOf(":");
    if (index === -1) continue;
    current = line.slice(0, index).trim().toLowerCase();
    headers.set(current, line.slice(index + 1).trim());
  }
  const from = parseMailbox(headers.get("from") ?? "");
  const contentType = headers.get("content-type") ?? "text/plain";
  const boundary = contentType.match(/boundary="?([^";]+)"?/i)?.[1];
  const attachments: InboundAttachmentInput[] = [];
  let text = "";
  if (boundary) {
    for (const part of body.split(`--${boundary}`)) {
      if (!part.trim() || part.trim() === "--") continue;
      const normalizedPart = part.replace(/^\n/, "").replace(/\n--$/, "");
      const partSplit = normalizedPart.indexOf("\n\n");
      const partHeaders = partSplit === -1 ? normalizedPart : normalizedPart.slice(0, partSplit);
      const partBody = partSplit === -1 ? "" : normalizedPart.slice(partSplit + 2).trim();
      const disposition = partHeaders.match(/content-disposition:\s*([^\n]+)/i)?.[1] ?? "";
      const partType = partHeaders.match(/content-type:\s*([^;\n]+)/i)?.[1]?.trim() ?? "text/plain";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      if (filename) {
        const encoding = partHeaders.match(/content-transfer-encoding:\s*([^\n]+)/i)?.[1] ?? "";
        const bytes = /base64/i.test(encoding)
          ? Uint8Array.from(Buffer.from(partBody.replace(/\s/g, ""), "base64"))
          : new TextEncoder().encode(partBody.trim());
        attachments.push({ filename, contentType: partType, bytes });
        continue;
      }
      if (partType.toLowerCase().startsWith("text/plain")) {
        text = partBody.trim();
      }
    }
  } else {
    text = body.trim();
  }
  return {
    messageId: (headers.get("message-id") ?? "").replace(/^<|>$/g, ""),
    fromEmail: from.email,
    fromName: from.name,
    to: parseMailbox(headers.get("to") ?? "").email,
    subject: headers.get("subject") ?? "",
    text,
    receivedAt,
    attachments,
  };
}
