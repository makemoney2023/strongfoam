import { openProposalByToken } from "@/lib/ops/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const opened = await openProposalByToken(token);
  if (!opened.ok) {
    return new Response("This proposal is unavailable.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const bytes = Uint8Array.from(Buffer.from(opened.pdfBase64, "base64"));
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="proposal.pdf"',
      "cache-control": "private, no-store",
    },
  });
}
