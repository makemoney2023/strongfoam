import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { insulationAssemblies } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { assemblyMemory, resetAssemblyMemory } from "@/lib/ops/assembly-access";
import {
  parseAssembly,
  type AssemblyLocation,
  type InsulationAssembly,
} from "@/lib/ops/assembly";
import { resolveCloseoutAccess, type CloseoutActor } from "@/lib/ops/closeout-authorization";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import { isUuid } from "@/lib/ops/job-workspace";
import { getJob } from "@/lib/ops/store";

export function resetAssembliesForTests(): void {
  resetAssemblyMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  const message = `${candidate.message ?? ""} ${candidate.cause?.message ?? ""}`;
  return code === "23505" || code === "SQLITE_CONSTRAINT" || message.includes("UNIQUE");
}

function asLocation(value: string): AssemblyLocation {
  if (
    value === "attic" ||
    value === "wall" ||
    value === "rim_joist" ||
    value === "basement" ||
    value === "crawlspace" ||
    value === "roof"
  ) {
    return value;
  }
  throw new Error("Unknown assembly location.");
}

function fromRow(row: typeof insulationAssemblies.$inferSelect): InsulationAssembly {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    location: asLocation(row.location),
    existingRValue: row.existingRValue,
    targetRValue: row.targetRValue,
    areaSqFt: row.areaSqFt,
    depthInches: row.depthInches,
    product: row.product,
    manufacturer: row.manufacturer,
    batch: row.batch,
    lot: row.lot,
    bagCount: row.bagCount,
    airBarrier: row.airBarrier,
    vaporBarrier: row.vaporBarrier,
    blowerDoor: row.blowerDoor,
    rebateProgram: row.rebateProgram,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listJobAssembly(
  organizationId: string,
  jobId: string,
): Promise<InsulationAssembly | null> {
  if (isDemoOpsStore()) {
    return (
      assemblyMemory().rows.find(
        (row) => row.organizationId === organizationId && row.jobId === jobId,
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(insulationAssemblies)
    .where(
      and(
        eq(insulationAssemblies.organizationId, organizationId),
        eq(insulationAssemblies.jobId, jobId),
      ),
    )
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function recordAssembly(input: {
  actor: CloseoutActor;
  jobId: string;
  fields: Parameters<typeof parseAssembly>[0];
}): Promise<{ ok: true; assembly: InsulationAssembly } | { ok: false; error: string }> {
  const access = resolveCloseoutAccess(input.actor, "closeout.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take an assembly." };
  }
  const parsed = parseAssembly(input.fields);
  if (!parsed.ok) return parsed;
  const now = new Date();
  const existing = isDemoOpsStore()
    ? assemblyMemory().rows.find(
        (row) => row.organizationId === access.organizationId && row.jobId === job.id,
      )
    : null;
  if (isDemoOpsStore() && existing) {
    Object.assign(existing, parsed.value, { updatedAt: now });
    return { ok: true, assembly: existing };
  }
  if (isDemoOpsStore()) {
    const assembly: InsulationAssembly = {
      id: crypto.randomUUID(),
      organizationId: access.organizationId,
      jobId: job.id,
      ...parsed.value,
      createdBy: input.actor.email,
      createdAt: now,
      updatedAt: now,
    };
    assemblyMemory().rows.push(assembly);
    await recordAuditEvent({
      organizationId: access.organizationId,
      actor: input.actor.email,
      action: "assembly.record",
      entityType: "insulation_assembly",
      entityId: assembly.id,
      result: "success",
      correlationId: crypto.randomUUID(),
      payload: { jobId: job.id, location: assembly.location, bagCount: assembly.bagCount },
    });
    return { ok: true, assembly };
  }
  const db = getDb();
  try {
    const inserted = await db
      .insert(insulationAssemblies)
      .values({
        organizationId: access.organizationId,
        jobId: job.id,
        ...parsed.value,
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { ok: true, assembly: fromRow(inserted[0]!) };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const updated = await db
      .update(insulationAssemblies)
      .set({ ...parsed.value, updatedAt: now })
      .where(
        and(
          eq(insulationAssemblies.organizationId, access.organizationId),
          eq(insulationAssemblies.jobId, job.id),
        ),
      )
      .returning();
    const assembly = updated[0] ? fromRow(updated[0]) : null;
    if (!assembly) return { ok: false, error: "That assembly was not found." };
    return { ok: true, assembly };
  }
}
