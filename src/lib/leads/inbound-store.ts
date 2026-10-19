import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { backgroundJobs, leads } from "@/db/schema";
import type { InboundProposal, InboundRepository } from "@/lib/leads/inbound-mail";
import {
  findDemoInboundProposal,
  listDemoInboundProposals,
  saveDemoInboundProposal,
} from "@/lib/ops/demo-inbox";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { findDemoLeadByIdempotency, insertDemoLeadFromValues } from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

function inboundKey(dedupeKey: string): string {
  return `leads.inbound:${dedupeKey}`;
}

function isProposal(value: unknown): value is InboundProposal {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<InboundProposal>;
  return typeof record.dedupeKey === "string" && typeof record.fromEmail === "string";
}

export function drizzleInboundRepository(): InboundRepository {
  return {
    async findProposal(organizationId, dedupeKey) {
      const rows = await getDb()
        .select({ payload: backgroundJobs.payload })
        .from(backgroundJobs)
        .where(
          and(
            eq(backgroundJobs.organizationId, organizationId),
            eq(backgroundJobs.idempotencyKey, inboundKey(dedupeKey)),
          ),
        )
        .limit(1);
      return isProposal(rows[0]?.payload) ? rows[0].payload : null;
    },
    async insertProposal(proposal) {
      const rows = await getDb()
        .insert(backgroundJobs)
        .values({
          organizationId: proposal.organizationId,
          kind: "leads.inbound",
          aggregateType: "inbound_email",
          aggregateId: proposal.dedupeKey,
          idempotencyKey: inboundKey(proposal.dedupeKey),
          status: "completed",
          attempts: 1,
          maxAttempts: 1,
          checkpoint: { proposalStatus: proposal.status },
          payload: proposal,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
        })
        .returning({ id: backgroundJobs.id });
      return rows.length > 0 ? "created" : "duplicate";
    },
    async saveProposal(proposal) {
      await getDb()
        .update(backgroundJobs)
        .set({
          payload: proposal,
          checkpoint: { proposalStatus: proposal.status },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(backgroundJobs.organizationId, proposal.organizationId),
            eq(backgroundJobs.idempotencyKey, inboundKey(proposal.dedupeKey)),
          ),
        );
    },
    async findLead(idempotencyKey) {
      const rows = await getDb()
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.idempotencyKey, idempotencyKey))
        .limit(1);
      return rows[0] ?? null;
    },
    async insertLead(values) {
      const rows = await getDb()
        .insert(leads)
        .values(values as typeof leads.$inferInsert)
        .returning({ id: leads.id });
      const row = rows[0];
      if (!row) throw new Error("Inbound lead was not stored.");
      return row;
    },
  };
}

export function demoInboundRepository(): InboundRepository {
  return {
    async findProposal(organizationId, dedupeKey) {
      return findDemoInboundProposal(organizationId, dedupeKey);
    },
    async insertProposal(proposal) {
      return saveDemoInboundProposal(proposal);
    },
    async saveProposal(proposal) {
      saveDemoInboundProposal(proposal);
    },
    async findLead(idempotencyKey) {
      const lead = findDemoLeadByIdempotency(idempotencyKey);
      return lead ? { id: lead.id } : null;
    },
    async insertLead(values) {
      return insertDemoLeadFromValues(values);
    },
  };
}

export function activeInboundRepository(): InboundRepository {
  return isDemoOpsStore() ? demoInboundRepository() : drizzleInboundRepository();
}

export async function listInboundProposals(
  organizationId = STRONG_FOAM_ORGANIZATION_ID,
): Promise<InboundProposal[]> {
  if (isDemoOpsStore()) return listDemoInboundProposals(organizationId);
  try {
    const rows = await getDb()
      .select({ payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.kind, "leads.inbound"),
        ),
      )
      .orderBy(desc(backgroundJobs.createdAt))
      .limit(50);
    return rows.map((row) => row.payload).filter(isProposal);
  } catch (error) {
    console.error("Inbound mail could not be listed.", error);
    return [];
  }
}
