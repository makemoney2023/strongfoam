import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { siteGeofences } from "@/db/schema";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import type { SiteGeofence } from "@/lib/ops/geofence";

const memory = globalThis as { __strongfoamGeofences?: SiteGeofence[] };

function bucket(): SiteGeofence[] {
  memory.__strongfoamGeofences ??= [];
  return memory.__strongfoamGeofences;
}

export function resetGeofenceMemory(): void {
  memory.__strongfoamGeofences = [];
}

export async function readSiteGeofence(siteId: string): Promise<SiteGeofence | null> {
  if (isDemoOpsStore()) return bucket().find((row) => row.siteId === siteId) ?? null;
  const rows = await getDb().select().from(siteGeofences).where(eq(siteGeofences.siteId, siteId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    siteId: row.siteId,
    organizationId: row.organizationId,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radiusMeters,
  };
}

export async function listSiteGeofences(siteIds: string[]): Promise<SiteGeofence[]> {
  if (siteIds.length === 0) return [];
  if (isDemoOpsStore()) return bucket().filter((row) => siteIds.includes(row.siteId));
  const rows = await getDb().select().from(siteGeofences).where(inArray(siteGeofences.siteId, siteIds));
  return rows.map((row) => ({
    siteId: row.siteId,
    organizationId: row.organizationId,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radiusMeters,
  }));
}

export async function saveSiteGeofence(input: SiteGeofence | { siteId: string; clear: true }): Promise<void> {
  if ("clear" in input) {
    if (isDemoOpsStore()) {
      memory.__strongfoamGeofences = bucket().filter((row) => row.siteId !== input.siteId);
      return;
    }
    await getDb().delete(siteGeofences).where(eq(siteGeofences.siteId, input.siteId));
    return;
  }
  if (isDemoOpsStore()) {
    const next = bucket().filter((row) => row.siteId !== input.siteId);
    next.push(input);
    memory.__strongfoamGeofences = next;
    return;
  }
  await getDb()
    .insert(siteGeofences)
    .values(input)
    .onConflictDoUpdate({
      target: siteGeofences.siteId,
      set: {
        organizationId: input.organizationId,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
      },
    });
}
