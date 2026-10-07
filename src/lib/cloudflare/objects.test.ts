import { describe, expect, it } from "vitest";
import {
  deleteObject,
  getObject,
  isObjectStorage,
  putObject,
  type ObjectBucket,
} from "@/lib/cloudflare/objects";

function memoryBucket(): ObjectBucket & { keys: Map<string, { bytes: Uint8Array; contentType: string }> } {
  const keys = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    keys,
    async put(key, value, options) {
      keys.set(key, {
        bytes: value,
        contentType: options?.httpMetadata?.contentType || "application/octet-stream",
      });
    },
    async get(key) {
      const stored = keys.get(key);
      if (!stored) return null;
      return {
        size: stored.bytes.byteLength,
        httpMetadata: { contentType: stored.contentType },
        arrayBuffer: async () =>
          stored.bytes.buffer.slice(
            stored.bytes.byteOffset,
            stored.bytes.byteOffset + stored.bytes.byteLength,
          ) as ArrayBuffer,
      };
    },
    async head(key) {
      const stored = keys.get(key);
      if (!stored) return null;
      return { size: stored.bytes.byteLength, httpMetadata: { contentType: stored.contentType } };
    },
    async delete(key) {
      keys.delete(key);
    },
  };
}

describe("R2 object storage", () => {
  it("stores and reads a private file", async () => {
    const bucket = memoryBucket();
    const bytes = new Uint8Array([1, 2, 3]);
    await putObject(bucket, "leads/draft/plan.pdf", bytes, "application/pdf");
    const stored = await getObject(bucket, "leads/draft/plan.pdf");
    expect(stored?.contentType).toBe("application/pdf");
    expect(stored?.body).toEqual(bytes);
    expect(isObjectStorage("r2")).toBe(true);
    expect(isObjectStorage("memory")).toBe(false);
  });

  it("returns null for a missing object and deletes a stored one", async () => {
    const bucket = memoryBucket();
    expect(await getObject(bucket, "missing")).toBeNull();
    await putObject(bucket, "jobs/a/photo.jpg", new Uint8Array([9]), "image/jpeg");
    await deleteObject(bucket, "jobs/a/photo.jpg");
    expect(await getObject(bucket, "jobs/a/photo.jpg")).toBeNull();
  });
});
