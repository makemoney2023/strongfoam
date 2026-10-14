import { saveFieldDraft } from "@/lib/ops/field-draft-store";
import { arrivalDraftBody, geofenceContains } from "@/lib/ops/geofence";
import { readSiteGeofence } from "@/lib/ops/geofence-store";
import { getJob, getSite } from "@/lib/ops/store";

export async function proposeArrivalDraft(input: {
  organizationId: string;
  userId: string;
  jobId: string;
  latitude: number;
  longitude: number;
  consent: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.consent) {
    return { ok: false, error: "Location is used only after you allow it on this device." };
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return { ok: false, error: "This site has no arrival point." };
  }
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== input.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!job.siteId) return { ok: false, error: "This job has no site." };
  const fence = await readSiteGeofence(job.siteId);
  if (!fence || fence.organizationId !== input.organizationId) {
    return { ok: false, error: "This site has no arrival point." };
  }
  const inside = geofenceContains(
    { latitude: input.latitude, longitude: input.longitude },
    fence,
  );
  if (!inside) return { ok: false, error: "You are outside this site." };
  const site = await getSite(job.siteId);
  const body = arrivalDraftBody(site?.name ?? "the site");
  const draft = await saveFieldDraft({
    organizationId: input.organizationId,
    jobId: job.id,
    userId: input.userId,
    kind: "labor",
    body,
    quote: body,
    quantity: null,
    unit: null,
    workAreaId: null,
    taskId: null,
    documentId: null,
    voiceNoteId: null,
    effect: null,
    source: "arrival",
  });
  if (!draft) return { ok: false, error: "That arrival could not be saved." };
  return { ok: true };
}
