import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import { getBidDocumentDownload } from "@/lib/ops/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ opportunityId: string; versionId: string }> },
): Promise<Response> {
  const session = await getOpsSession();
  if (!session) return new Response(null, { status: 401 });
  const access = resolveCommercialAccess(session, "estimate.read");
  if (!access.ok) return new Response(null, { status: 403 });
  const { opportunityId, versionId } = await context.params;
  const document = await getBidDocumentDownload(
    access.organizationId,
    opportunityId,
    versionId,
  );
  if (!document) return new Response(null, { status: 404 });
  if (document.kind === "redirect") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: document.url,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const filename = document.filename.replace(/"/g, "");
  return new Response(Buffer.from(document.bytes), {
    status: 200,
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
