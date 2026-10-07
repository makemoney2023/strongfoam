import {
  getLeadFilesById,
  readStoredFile,
  requireEnv,
  resolveFileUrl,
} from "@/lib/leads/adapters";
import { verifyLeadId } from "@/lib/leads/hmac";

export type FileLookup = { pathname: string };

export type FilesGetDeps = {
  getLead: (leadId: string) => Promise<{ files: FileLookup[] } | null>;
  resolveFileUrl: (pathname: string) => Promise<string>;
  readStoredFile?: (
    pathname: string,
  ) => Promise<{ body: Uint8Array; contentType: string } | null>;
  secret: string;
};

export async function handleFilesGet(
  request: Request,
  params: { leadId: string; fileIndex: string },
  deps: FilesGetDeps,
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const key = `${params.leadId}:${params.fileIndex}`;

  if (!token || !verifyLeadId(key, token, deps.secret)) {
    return new Response(null, { status: 401 });
  }

  const index = Number.parseInt(params.fileIndex, 10);
  if (!Number.isInteger(index) || index < 0) {
    return new Response(null, { status: 400 });
  }

  const lead = await deps.getLead(params.leadId);
  const file = lead?.files[index];
  if (!file) {
    return new Response(null, { status: 404 });
  }

  const signedUrl = await deps.resolveFileUrl(file.pathname);
  if (signedUrl.startsWith("r2:")) {
    const stored = await deps.readStoredFile?.(signedUrl.slice(3));
    if (!stored) return new Response(null, { status: 404 });
    return new Response(Buffer.from(stored.body), {
      headers: { "content-type": stored.contentType },
    });
  }
  return Response.redirect(signedUrl, 302);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string; fileIndex: string }> },
): Promise<Response> {
  const params = await context.params;
  return handleFilesGet(request, params, {
    getLead: getLeadFilesById,
    resolveFileUrl,
    readStoredFile,
    secret: requireEnv("LEAD_THANKS_SECRET"),
  });
}
