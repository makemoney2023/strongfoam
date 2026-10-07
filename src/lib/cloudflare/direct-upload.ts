export type DirectUpload = {
  pathname: string;
  clientPayload: string;
  bytes: Uint8Array;
  contentType: string;
};

export async function readDirectUpload(
  request: Request,
): Promise<DirectUpload | { error: string }> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: "invalid_upload" };
  }
  const pathname = form.get("pathname");
  const clientPayload = form.get("clientPayload");
  const file = form.get("file");
  if (typeof pathname !== "string" || pathname.length === 0) {
    return { error: "invalid_upload" };
  }
  if (typeof clientPayload !== "string") return { error: "invalid_upload" };
  if (!(file instanceof File)) return { error: "invalid_upload" };
  return {
    pathname,
    clientPayload,
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type || "application/octet-stream",
  };
}

export function isDirectUpload(
  value: DirectUpload | { error: string },
): value is DirectUpload {
  return !("error" in value);
}
