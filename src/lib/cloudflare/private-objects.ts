import { getPlatform } from "@/lib/cloudflare/platform";
import { deleteObject, getObject, putObject } from "@/lib/cloudflare/objects";

export async function writePrivateObject(
  pathname: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<"r2" | "blob" | null> {
  const platform = await getPlatform();
  if (platform?.FILES) {
    await putObject(platform.FILES, pathname, bytes, contentType);
    return "r2";
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const { put } = await import("@vercel/blob");
  await put(pathname, Buffer.from(bytes), {
    access: "private",
    contentType,
    token,
  });
  return "blob";
}

export async function readPrivateObject(
  pathname: string,
): Promise<Uint8Array | null> {
  const platform = await getPlatform();
  if (platform?.FILES) {
    const stored = await getObject(platform.FILES, pathname);
    return stored?.body ?? null;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const { get } = await import("@vercel/blob");
  const result = await get(pathname, { access: "private", token });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

export async function deletePrivateObject(pathname: string): Promise<void> {
  const platform = await getPlatform();
  if (platform?.FILES) {
    await deleteObject(platform.FILES, pathname);
    return;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  const { del } = await import("@vercel/blob");
  await del(pathname, { token });
}
