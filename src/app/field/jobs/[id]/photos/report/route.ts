import { getFieldSession } from "@/lib/ops/field-auth";
import { photoReportLines, jobPhotoReportPdf } from "@/lib/ops/job-photo-report";
import { listFieldDrafts } from "@/lib/ops/field-draft-store";
import {
  canFieldUserAccessJob,
  getJob,
  listJobDocuments,
  listWorkAreas,
} from "@/lib/ops/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getFieldSession();
  if (!session) {
    return new Response("Sign in to print this photo report.", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const { id } = await params;
  const job = await getJob(id);
  if (!job || job.organizationId !== session.organizationId) {
    return new Response("That job was not found.", { status: 404 });
  }
  if (!(await canFieldUserAccessJob(session.userId, job.id))) {
    return new Response("That job was not found.", { status: 404 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const areaId = url.searchParams.get("area") ?? "";
  const [documents, areas, drafts] = await Promise.all([
    listJobDocuments(job.id),
    listWorkAreas(job.id),
    listFieldDrafts(session.organizationId, job.id),
  ]);
  const lines = photoReportLines({ from, to, areaId, documents, areas, drafts });
  const bytes = await jobPhotoReportPdf({ jobName: job.name, from, to, lines });
  const filename = `${job.name.replace(/[^\w.-]+/g, "_").slice(0, 40) || "job"}-photos.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
