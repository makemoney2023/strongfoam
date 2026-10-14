import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID, DEMO_ORGANIZATION_ID, DEMO_FIELD_USER_ID } from "@/lib/ops/demo-data";
import { proposeArrivalDraft } from "@/lib/ops/field-arrival";
import { listFieldDrafts, resetFieldDraftMemory } from "@/lib/ops/field-draft-store";
import { resetGeofenceMemory, saveSiteGeofence } from "@/lib/ops/geofence-store";

const SITE_ID = "88888888-8888-4888-8888-888888888888";

describe("arrival labor draft", () => {
  beforeEach(() => {
    resetFieldDraftMemory();
    resetGeofenceMemory();
  });

  it("stores a labor draft inside the fence and keeps the coordinates out of the row", async () => {
    await saveSiteGeofence({
      siteId: SITE_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      latitude: 43.7,
      longitude: -79.4,
      radiusMeters: 150,
    });
    const result = await proposeArrivalDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      userId: DEMO_FIELD_USER_ID,
      jobId: DEMO_JOB_ID,
      latitude: 43.701,
      longitude: -79.4,
      consent: true,
    });
    expect(result.ok).toBe(true);
    const drafts = await listFieldDrafts(DEMO_ORGANIZATION_ID, DEMO_JOB_ID);
    expect(drafts[0]?.kind).toBe("labor");
    expect(drafts[0]?.source).toBe("arrival");
    expect(JSON.stringify(drafts[0])).not.toContain("43.701");
    expect(drafts[0]?.body).toContain("Arrived at");
  });

  it("does nothing without consent or a point", async () => {
    const refused = await proposeArrivalDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      userId: DEMO_FIELD_USER_ID,
      jobId: DEMO_JOB_ID,
      latitude: 43.7,
      longitude: -79.4,
      consent: false,
    });
    expect(refused.ok).toBe(false);
    const missing = await proposeArrivalDraft({
      organizationId: DEMO_ORGANIZATION_ID,
      userId: DEMO_FIELD_USER_ID,
      jobId: DEMO_JOB_ID,
      latitude: 43.7,
      longitude: -79.4,
      consent: true,
    });
    expect(missing).toMatchObject({ ok: false, error: "This site has no arrival point." });
  });
});
