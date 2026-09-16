import { getLeadFilesById, requireEnv, resolveFileUrl } from "@/lib/leads/adapters";
import { verifyLeadId } from "@/lib/leads/hmac";

export type FileLookup = { pathname: string };

export type FilesGetDeps = {
  getLead: (leadId: string) => Promise<{ files: FileLookup[] } | null>;
  resolveFileUrl: (pathname: string) => Promise<string>;
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
    secret: requireEnv("LEAD_THANKS_SECRET"),
  });
}
