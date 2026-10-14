export type GeoPoint = { latitude: number; longitude: number };

export type SiteGeofence = GeoPoint & {
  siteId: string;
  organizationId: string;
  radiusMeters: number;
};

const EARTH_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const start = toRadians(from.latitude);
  const end = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(start) * Math.cos(end) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function geofenceContains(point: GeoPoint, fence: GeoPoint & { radiusMeters: number }): boolean {
  return haversineMeters(point, fence) <= fence.radiusMeters;
}

export function parseGeofenceFields(input: {
  latitude?: string;
  longitude?: string;
  radiusMeters?: string;
}):
  | { ok: true; value: { latitude: number; longitude: number; radiusMeters: number } | null }
  | { ok: false; error: string; field?: string } {
  const latitude = input.latitude?.trim() ?? "";
  const longitude = input.longitude?.trim() ?? "";
  const radius = input.radiusMeters?.trim() ?? "";
  if (!latitude && !longitude && !radius) return { ok: true, value: null };
  if (!latitude || !longitude) {
    return { ok: false, error: "Enter both latitude and longitude, or leave both blank.", field: "latitude" };
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "Latitude must be between -90 and 90.", field: "latitude" };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: "Longitude must be between -180 and 180.", field: "longitude" };
  }
  const radiusMeters = radius ? Number(radius) : 150;
  if (!Number.isInteger(radiusMeters) || radiusMeters < 25 || radiusMeters > 2000) {
    return { ok: false, error: "Radius is a whole number of meters from 25 to 2000.", field: "radiusMeters" };
  }
  return { ok: true, value: { latitude: lat, longitude: lng, radiusMeters } };
}

export function arrivalDraftBody(siteName: string): string {
  return `Arrived at ${siteName}.`;
}
