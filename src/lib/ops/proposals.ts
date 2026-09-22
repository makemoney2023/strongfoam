import { createHash, randomBytes } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  assertSameOrganization,
  resolveCommercialAccess,
  type CommercialActor,
} from "@/lib/ops/commercial-authorization";
import {
  evaluateApprovalRules,
  type CommercialApprovalRule,
  type EstimateApproval,
} from "@/lib/ops/estimate-approvals";
import type { PreparedEstimateVersion } from "@/lib/ops/estimates";
import { formatUnitPrice } from "@/lib/ops/price-book";

export const PROPOSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const PROPOSAL_ACCEPTANCE_TERMS =
  "I am authorized to accept this proposal for the stated scope, price, and expiry. Acceptance does not start work until Strong Foam confirms the project.";

export const PROPOSAL_EVENT_KINDS = [
  "generated",
  "delivered",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "revoked",
] as const;

export type ProposalEventKind = (typeof PROPOSAL_EVENT_KINDS)[number];

export type ProposalPublicSnapshot = {
  organizationName: string;
  companyName: string;
  siteName: string;
  estimateNumber: string;
  estimateTitle: string;
  versionNumber: number;
  lines: Array<{
    description: string;
    quantity: string | null;
    unit: string | null;
    unitPriceCents: number | null;
    amountCents: number;
    alternateName: string | null;
    included: boolean;
  }>;
  inclusions: string[];
  exclusions: string[];
  scope: string[];
  totalCents: number;
  acceptanceTerms: string;
};

export type ProposalRecord = {
  id: string;
  organizationId: string;
  estimateId: string;
  estimateVersionId: string;
  versionNumber: number;
  contentHash: string;
  pdfSha256: string;
  pdfBase64: string;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string;
  createdAt: Date;
  snapshot: ProposalPublicSnapshot;
};

export type ProposalEvent = {
  id: string;
  organizationId: string;
  proposalId: string;
  kind: ProposalEventKind;
  actorEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  channel: string | null;
  externalMessageId: string | null;
  attestation: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type EstimateAcceptance = {
  id: string;
  organizationId: string;
  proposalId: string;
  estimateId: string;
  estimateVersionId: string;
  contentHash: string;
  recipientName: string;
  recipientEmail: string;
  attestation: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type ProposalLifecycleStatus =
  | "generated"
  | "delivered"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "revoked";

type LoadedProposal = {
  organizationId: string;
  organizationName: string;
  companyName: string;
  siteName: string;
  estimateNumber: string;
  estimateTitle: string;
  version: PreparedEstimateVersion;
  latestVersionNumber: number;
  approvals: EstimateApproval[];
  rules: CommercialApprovalRule[];
};

export function hashProposalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createProposalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function proposalLifecycleStatus(
  proposal: ProposalRecord,
  events: ProposalEvent[],
  now: Date,
): ProposalLifecycleStatus {
  if (events.some((event) => event.kind === "revoked")) return "revoked";
  if (proposal.expiresAt <= now) return "expired";
  if (events.some((event) => event.kind === "accepted")) return "accepted";
  if (events.some((event) => event.kind === "rejected")) return "rejected";
  if (events.some((event) => event.kind === "viewed")) return "viewed";
  if (events.some((event) => event.kind === "delivered")) return "delivered";
  return "generated";
}

export function buildProposalSnapshot(input: {
  organizationName: string;
  companyName: string;
  siteName: string;
  estimateNumber: string;
  estimateTitle: string;
  version: PreparedEstimateVersion;
}): ProposalPublicSnapshot {
  return {
    organizationName: input.organizationName,
    companyName: input.companyName,
    siteName: input.siteName,
    estimateNumber: input.estimateNumber,
    estimateTitle: input.estimateTitle,
    versionNumber: input.version.versionNumber,
    lines: [...input.version.lines]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.lineTotalCents,
        alternateName:
          input.version.alternates.find((alternate) => alternate.id === line.alternateId)?.name ??
          null,
        included: line.includedInTotal,
      })),
    inclusions: input.version.clauses
      .filter((clause) => clause.kind === "inclusion")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((clause) => clause.text),
    exclusions: input.version.clauses
      .filter((clause) => clause.kind === "exclusion")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((clause) => clause.text),
    scope: [...input.version.jobPackages]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((pkg) => `${pkg.name}: ${pkg.scope}`),
    totalCents: input.version.totalCents,
    acceptanceTerms: PROPOSAL_ACCEPTANCE_TERMS,
  };
}

function pdfSafe(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function wrap(value: string, width: number): string[] {
  const words = pdfSafe(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function renderProposalPdf(
  snapshot: ProposalPublicSnapshot,
  expiresAt: Date,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 748;
  const draw = (text: string, options?: { bold?: boolean; size?: number }) => {
    const size = options?.size ?? 11;
    const used = options?.bold ? bold : font;
    for (const line of wrap(text, 88)) {
      if (y < 56) {
        page = pdf.addPage([612, 792]);
        y = 748;
      }
      page.drawText(line, { x: 48, y, size, font: used, color: rgb(0.12, 0.14, 0.16) });
      y -= size + 5;
    }
  };
  draw(snapshot.organizationName, { bold: true, size: 16 });
  draw(`${snapshot.companyName} · ${snapshot.siteName}`);
  draw(`${snapshot.estimateNumber} · ${snapshot.estimateTitle} · version ${snapshot.versionNumber}`, {
    bold: true,
  });
  y -= 6;
  draw("Base scope", { bold: true });
  for (const item of snapshot.scope) draw(item);
  y -= 4;
  draw("Lines", { bold: true });
  for (const line of snapshot.lines) {
    const quantity = line.quantity ? `${line.quantity} ${line.unit ?? ""}`.trim() : "Fixed";
    const price = line.unitPriceCents == null ? "" : ` @ ${formatUnitPrice(line.unitPriceCents)}`;
    const alternate = line.alternateName
      ? ` (${line.included ? "included alternate" : "excluded alternate"}: ${line.alternateName})`
      : "";
    draw(
      `${line.description} — ${quantity}${price} — ${formatUnitPrice(line.amountCents)}${alternate}`,
    );
  }
  y -= 4;
  draw("Inclusions", { bold: true });
  for (const item of snapshot.inclusions) draw(item);
  draw("Exclusions", { bold: true });
  for (const item of snapshot.exclusions) draw(item);
  y -= 4;
  draw(`Total ${formatUnitPrice(snapshot.totalCents)}`, { bold: true, size: 13 });
  draw(`This proposal expires ${expiresAt.toISOString().slice(0, 10)}.`);
  draw(snapshot.acceptanceTerms);
  return pdf.save();
}

function event(input: {
  organizationId: string;
  proposalId: string;
  kind: ProposalEventKind;
  now: Date;
  actorEmail?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  channel?: string | null;
  externalMessageId?: string | null;
  attestation?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): ProposalEvent {
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    kind: input.kind,
    actorEmail: input.actorEmail ?? null,
    recipientName: input.recipientName ?? null,
    recipientEmail: input.recipientEmail ?? null,
    channel: input.channel ?? null,
    externalMessageId: input.externalMessageId ?? null,
    attestation: input.attestation ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: input.now,
  };
}

export function revealProposal(input: {
  proposal: ProposalRecord;
  events: ProposalEvent[];
  now: Date;
}): { ok: true; snapshot: ProposalPublicSnapshot } | { ok: false; error: "unavailable" } {
  if (input.proposal.expiresAt <= input.now) return { ok: false, error: "unavailable" };
  if (input.events.some((item) => item.kind === "revoked")) return { ok: false, error: "unavailable" };
  return { ok: true, snapshot: input.proposal.snapshot };
}

export async function generateProposal(input: {
  actor: CommercialActor & { email: string };
  now: Date;
  token?: string;
  loaded: LoadedProposal;
}): Promise<
  | { ok: true; proposal: ProposalRecord; events: ProposalEvent[]; token: string }
  | { ok: false; error: string }
> {
  const access = resolveCommercialAccess(input.actor, "proposal.deliver");
  if (!access.ok) return { ok: false, error: access.error };
  const same = assertSameOrganization(access.organizationId, input.loaded.organizationId);
  if (!same.ok) return { ok: false, error: same.error };
  if (input.loaded.version.versionNumber !== input.loaded.latestVersionNumber) {
    return { ok: false, error: "superseded" };
  }
  const approval = evaluateApprovalRules({
    now: input.now,
    organizationId: input.loaded.organizationId,
    versionId: input.loaded.version.versionId,
    contentHash: input.loaded.version.contentHash,
    totalCents: input.loaded.version.totalCents,
    rules: input.loaded.rules,
    decisions: input.loaded.approvals,
  });
  if (!approval.satisfied) return { ok: false, error: "approval-required" };
  const snapshot = buildProposalSnapshot({
    organizationName: input.loaded.organizationName,
    companyName: input.loaded.companyName,
    siteName: input.loaded.siteName,
    estimateNumber: input.loaded.estimateNumber,
    estimateTitle: input.loaded.estimateTitle,
    version: input.loaded.version,
  });
  const expiresAt = new Date(input.now.getTime() + PROPOSAL_TTL_MS);
  const pdf = await renderProposalPdf(snapshot, expiresAt);
  const pdfBase64 = Buffer.from(pdf).toString("base64");
  const token = input.token ?? createProposalToken();
  const proposal: ProposalRecord = {
    id: crypto.randomUUID(),
    organizationId: input.loaded.organizationId,
    estimateId: input.loaded.version.estimateId,
    estimateVersionId: input.loaded.version.versionId,
    versionNumber: input.loaded.version.versionNumber,
    contentHash: input.loaded.version.contentHash,
    pdfSha256: createHash("sha256").update(pdf).digest("hex"),
    pdfBase64,
    tokenHash: hashProposalToken(token),
    expiresAt,
    createdBy: input.actor.email,
    createdAt: input.now,
    snapshot,
  };
  return {
    ok: true,
    proposal,
    token,
    events: [
      event({
        organizationId: proposal.organizationId,
        proposalId: proposal.id,
        kind: "generated",
        now: input.now,
        actorEmail: input.actor.email,
      }),
    ],
  };
}

export function recordProposalView(input: {
  proposal: ProposalRecord;
  events: ProposalEvent[];
  now: Date;
}):
  | { ok: true; snapshot: ProposalPublicSnapshot; event: ProposalEvent | null }
  | { ok: false; error: "unavailable" } {
  const revealed = revealProposal(input);
  if (!revealed.ok) return revealed;
  if (input.events.some((item) => item.kind === "viewed")) {
    return { ok: true, snapshot: revealed.snapshot, event: null };
  }
  return {
    ok: true,
    snapshot: revealed.snapshot,
    event: event({
      organizationId: input.proposal.organizationId,
      proposalId: input.proposal.id,
      kind: "viewed",
      now: input.now,
    }),
  };
}

export function recordProposalDelivery(input: {
  actor: CommercialActor & { email: string };
  proposal: ProposalRecord;
  now: Date;
  channel: string;
  recipientName: string;
  recipientEmail: string;
  externalMessageId?: string | null;
}): { ok: true; event: ProposalEvent } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "proposal.deliver");
  if (!access.ok) return { ok: false, error: access.error };
  const same = assertSameOrganization(access.organizationId, input.proposal.organizationId);
  if (!same.ok) return { ok: false, error: same.error };
  const channel = input.channel.trim();
  const recipientName = input.recipientName.trim();
  const recipientEmail = input.recipientEmail.trim();
  if (!channel || !recipientName || !isEmail(recipientEmail)) {
    return { ok: false, error: "recipient-required" };
  }
  return {
    ok: true,
    event: event({
      organizationId: input.proposal.organizationId,
      proposalId: input.proposal.id,
      kind: "delivered",
      now: input.now,
      actorEmail: input.actor.email,
      recipientName,
      recipientEmail,
      channel,
      externalMessageId: input.externalMessageId?.trim() || null,
    }),
  };
}

export function revokeProposal(input: {
  actor: CommercialActor & { email: string };
  proposal: ProposalRecord;
  events: ProposalEvent[];
  now: Date;
}): { ok: true; event: ProposalEvent; replayed: boolean } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "proposal.deliver");
  if (!access.ok) return { ok: false, error: access.error };
  const same = assertSameOrganization(access.organizationId, input.proposal.organizationId);
  if (!same.ok) return { ok: false, error: same.error };
  const existing = input.events.find((item) => item.kind === "revoked");
  if (existing) return { ok: true, event: existing, replayed: true };
  return {
    ok: true,
    replayed: false,
    event: event({
      organizationId: input.proposal.organizationId,
      proposalId: input.proposal.id,
      kind: "revoked",
      now: input.now,
      actorEmail: input.actor.email,
    }),
  };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function decideProposal(input: {
  proposal: ProposalRecord;
  events: ProposalEvent[];
  now: Date;
  decision: "accepted" | "rejected";
  latestVersionNumber: number;
  approvalSatisfied: boolean;
  existingAcceptance: EstimateAcceptance | null;
  recipientName: string;
  recipientEmail: string;
  attestation: string;
  ipAddress: string | null;
  userAgent: string | null;
}):
  | {
      ok: true;
      decision: "accepted";
      acceptance: EstimateAcceptance;
      event: ProposalEvent;
      replayed: boolean;
    }
  | { ok: true; decision: "rejected"; event: ProposalEvent; replayed: boolean }
  | { ok: false; error: string } {
  const revealed = revealProposal({
    proposal: input.proposal,
    events: input.events,
    now: input.now,
  });
  if (!revealed.ok) return revealed;
  const recipientName = input.recipientName.trim();
  const recipientEmail = input.recipientEmail.trim();
  if (!recipientName || !isEmail(recipientEmail)) return { ok: false, error: "recipient-required" };
  if (input.decision === "accepted" && input.attestation.trim() !== PROPOSAL_ACCEPTANCE_TERMS) {
    return { ok: false, error: "attestation-required" };
  }
  const rejected = input.events.find((item) => item.kind === "rejected");
  if (input.existingAcceptance && input.decision === "accepted") {
    return {
      ok: true,
      decision: "accepted",
      acceptance: input.existingAcceptance,
      event:
        input.events.find((item) => item.kind === "accepted") ??
        event({
          organizationId: input.proposal.organizationId,
          proposalId: input.proposal.id,
          kind: "accepted",
          now: input.existingAcceptance.createdAt,
          recipientName: input.existingAcceptance.recipientName,
          recipientEmail: input.existingAcceptance.recipientEmail,
          attestation: input.existingAcceptance.attestation,
        }),
      replayed: true,
    };
  }
  if (rejected && input.decision === "rejected") {
    return { ok: true, decision: "rejected", event: rejected, replayed: true };
  }
  if (input.existingAcceptance || rejected) return { ok: false, error: "already-decided" };
  if (
    input.latestVersionNumber !== input.proposal.versionNumber ||
    !input.approvalSatisfied
  ) {
    return { ok: false, error: "stale-approval" };
  }
  const decidedAt = input.now;
  const decisionEvent = event({
    organizationId: input.proposal.organizationId,
    proposalId: input.proposal.id,
    kind: input.decision,
    now: decidedAt,
    recipientName,
    recipientEmail,
    attestation: input.decision === "accepted" ? PROPOSAL_ACCEPTANCE_TERMS : null,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  if (input.decision === "rejected") {
    return { ok: true, decision: "rejected", event: decisionEvent, replayed: false };
  }
  return {
    ok: true,
    decision: "accepted",
    replayed: false,
    event: decisionEvent,
    acceptance: {
      id: crypto.randomUUID(),
      organizationId: input.proposal.organizationId,
      proposalId: input.proposal.id,
      estimateId: input.proposal.estimateId,
      estimateVersionId: input.proposal.estimateVersionId,
      contentHash: input.proposal.contentHash,
      recipientName,
      recipientEmail,
      attestation: PROPOSAL_ACCEPTANCE_TERMS,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: decidedAt,
    },
  };
}
