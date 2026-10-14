import { describe, expect, it } from "vitest";
import {
  arrivalDraftBody,
  geofenceContains,
  haversineMeters,
  parseGeofenceFields,
} from "@/lib/ops/geofence";

describe("geofence", () => {
  it("contains a nearby point and rejects a farther one", () => {
    const fence = { latitude: 43.7, longitude: -79.4, radiusMeters: 150 };
    expect(geofenceContains(fence, fence)).toBe(true);
    expect(geofenceContains({ latitude: 43.701, longitude: -79.4 }, fence)).toBe(true);
    expect(geofenceContains({ latitude: 43.703, longitude: -79.4 }, fence)).toBe(false);
    expect(haversineMeters(fence, fence)).toBe(0);
  });

  it("treats a blank point as no geofence", () => {
    expect(parseGeofenceFields({ latitude: "", longitude: "" })).toEqual({ ok: true, value: null });
    expect(parseGeofenceFields({ latitude: "43.7", longitude: "-79.4" }).ok).toBe(true);
    expect(parseGeofenceFields({ latitude: "43.7", longitude: "" }).ok).toBe(false);
  });

  it("does not put coordinates in the arrival sentence", () => {
    expect(arrivalDraftBody("North yard")).toBe("Arrived at North yard.");
    expect(arrivalDraftBody("North yard")).not.toContain("43.7");
  });
});
