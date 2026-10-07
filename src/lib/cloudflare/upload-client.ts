export async function uploadPrivateFile(
  pathname: string,
  file: File,
  options: { handleUploadUrl: string; clientPayload: string },
): Promise<{ pathname: string }> {
  const body = new FormData();
  body.set("pathname", pathname);
  body.set("clientPayload", options.clientPayload);
  body.set("file", file);
  const response = await fetch(options.handleUploadUrl, {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as {
    pathname?: string;
    error?: string;
  } | null;
  if (!response.ok || !payload?.pathname) {
    throw new Error(payload?.error || "Could not store the file.");
  }
  return { pathname: payload.pathname };
}
