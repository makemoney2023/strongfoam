export type StoredObject = {
  body: Uint8Array;
  contentType: string;
  size: number;
};

export type ObjectBucket = {
  put(
    key: string,
    value: Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
    size: number;
  } | null>;
  head(key: string): Promise<{
    size: number;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
};

export function isObjectStorage(storage: string | null | undefined): boolean {
  return storage === "blob" || storage === "r2";
}

export async function putObject(
  bucket: ObjectBucket,
  pathname: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await bucket.put(pathname, bytes, {
    httpMetadata: { contentType },
  });
}

export async function getObject(
  bucket: ObjectBucket,
  pathname: string,
): Promise<StoredObject | null> {
  const object = await bucket.get(pathname);
  if (!object) return null;
  const body = new Uint8Array(await object.arrayBuffer());
  return {
    body,
    contentType: object.httpMetadata?.contentType || "application/octet-stream",
    size: object.size || body.byteLength,
  };
}

export async function deleteObject(
  bucket: ObjectBucket,
  pathname: string,
): Promise<void> {
  await bucket.delete(pathname);
}
