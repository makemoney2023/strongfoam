import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { crewCapacities } from "@/db/schema";
import { capacityMemory, resetCapacityMemory } from "@/lib/ops/crew-capacity-access";
import { parseJobsPerDay } from "@/lib/ops/crew-capacity";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { resolveDispatchAccess } from "@/lib/ops/dispatch-authorization";
import type { MembershipRole } from "@/lib/ops/identity";
import { isUuid } from "@/lib/ops/job-workspace";

export function resetCrewCapacityForTests(): void {
  resetCapacityMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  const message = `${candidate.message ?? ""} ${candidate.cause?.message ?? ""}`;
  return code === "23505" || code === "SQLITE_CONSTRAINT" || message.includes("UNIQUE");
}

export async function listCrewCapacities(
  organizationId: string,
): Promise<{ userId: string; jobsPerDay: number }[]> {
  if (isDemoOpsStore()) {
    return capacityMemory().rows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({ userId: row.userId, jobsPerDay: row.jobsPerDay }));
  }
  const rows = await getDb()
    .select({ userId: crewCapacities.userId, jobsPerDay: crewCapacities.jobsPerDay })
    .from(crewCapacities)
    .where(eq(crewCapacities.organizationId, organizationId));
  return rows;
}

export async function setCrewCapacity(input: {
  actor: { role: MembershipRole | "estimator"; organizationId?: string; email: string };
  userId: string;
  jobsPerDay?: string;
}): Promise<{ ok: true; jobsPerDay: number } | { ok: false; error: string }> {
  const access = resolveDispatchAccess(input.actor, "dispatch.edit");
  if (!access.ok) return access;
  if (!isUuid(input.userId)) return { ok: false, error: "That person was not found." };
  const parsed = parseJobsPerDay(input.jobsPerDay);
  if (!parsed.ok) return parsed;
  const now = new Date();
  if (isDemoOpsStore()) {
    const existing = capacityMemory().rows.find(
      (row) => row.organizationId === access.organizationId && row.userId === input.userId,
    );
    if (existing) existing.jobsPerDay = parsed.value;
    else {
      capacityMemory().rows.push({
        id: crypto.randomUUID(),
        organizationId: access.organizationId,
        userId: input.userId,
        jobsPerDay: parsed.value,
      });
    }
    return { ok: true, jobsPerDay: parsed.value };
  }
  const db = getDb();
  try {
    await db.insert(crewCapacities).values({
      organizationId: access.organizationId,
      userId: input.userId,
      jobsPerDay: parsed.value,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    await db
      .update(crewCapacities)
      .set({ jobsPerDay: parsed.value, updatedAt: now })
      .where(
        and(
          eq(crewCapacities.organizationId, access.organizationId),
          eq(crewCapacities.userId, input.userId),
        ),
      );
  }
  return { ok: true, jobsPerDay: parsed.value };
}
