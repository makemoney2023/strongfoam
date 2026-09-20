import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { JobDocumentUploader } from "@/components/ops/job-document-uploader";
import { JobPlanBoard } from "@/components/ops/job-plan-board";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { RealtimeRefresh } from "@/components/ops/realtime-refresh";
import { Button } from "@/components/ui/button";
import { placePlanPin, voidPlanPin } from "@/app/app/jobs/actions";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { formatJobNumber } from "@/lib/ops/jobs";
import { jobDocumentHref } from "@/lib/ops/job-workspace";
import {
  canMarkupPlanDocument,
  isCurrentPlanDocument,
  officePlanHref,
} from "@/lib/ops/plan-markup";
import {
  getJob,
  listJobDocuments,
  listJobPlanAnnotations,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function JobPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ documentId?: string }>;
}) {
  if (!(await getOpsSession())) redirect("/app/login");
  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const [documents, areas, tasks] = await Promise.all([
    listJobDocuments(job.id, { kind: "plan" }),
    listWorkAreas(job.id),
    listJobTasks(job.id),
  ]);
  const currentPlans = documents.filter((document) =>
    isCurrentPlanDocument(document),
  );
  const selected =
    documents.find((document) => document.id === query.documentId) ??
    currentPlans[0] ??
    documents[0] ??
    null;
  const annotations = selected
    ? await listJobPlanAnnotations(job.id, selected.id)
    : [];
  const storageMode = isDemoOpsStore()
    ? "demo"
    : process.env.BLOB_READ_WRITE_TOKEN
      ? "blob"
      : "unavailable";
  const returnTo = selected
    ? officePlanHref(job.id, selected.id)
    : officePlanHref(job.id);
  const imageUrl = selected ? jobDocumentHref(job.id, selected.id) : null;

  return (
    <div className="space-y-6">
      <RealtimeRefresh url={`/api/ops/events?jobId=${job.id}`} />
      <PageHeader
        crumbs={[
          { href: "/app/jobs", label: "Jobs" },
          { href: `/app/jobs/${job.id}`, label: formatJobNumber(job.id) },
          { label: "Plan" },
        ]}
        title="Plan marks"
        description={
          selected
            ? `${selected.filename} · revision ${selected.versionNumber}${
                selected.supersededAt ? " · previous revision" : " · current"
              }`
            : "Upload a plan image so the crew can tap completed work."
        }
        actions={
          selected ? (
            <FormDialog
              triggerLabel="Upload revision"
              title="Replace this plan"
              description="The new file becomes current. Existing marks stay on the old revision."
            >
              <JobDocumentUploader
                jobId={job.id}
                areas={areas.map(({ id: areaId, name }) => ({
                  id: areaId,
                  name,
                }))}
                storageMode={storageMode}
                defaultKind="plan"
                replacesDocumentId={selected.id}
                returnTo={returnTo}
              />
            </FormDialog>
          ) : null
        }
      />

      {documents.length > 1 ? (
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-2">
            <label className="text-sm font-medium" htmlFor="planSheet">
              Sheet
            </label>
            <NativeSelect
              id="planSheet"
              name="documentId"
              defaultValue={selected?.id ?? ""}
              className="h-11"
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.filename}
                  {document.supersededAt ? " · previous" : " · current"}
                  {` · v${document.versionNumber}`}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" className="min-h-11">
            Open sheet
          </Button>
        </form>
      ) : null}

      {!selected ? (
        <JobDocumentUploader
          jobId={job.id}
          areas={areas.map(({ id: areaId, name }) => ({ id: areaId, name }))}
          storageMode={storageMode}
          defaultKind="plan"
          returnTo={returnTo}
        />
      ) : selected && imageUrl && canMarkupPlanDocument(selected) ? (
        <JobPlanBoard
          jobId={job.id}
          documentId={selected.id}
          imageUrl={imageUrl}
          mode="office"
          returnTo={returnTo}
          areas={areas.map(({ id: areaId, name }) => ({ id: areaId, name }))}
          tasks={tasks.map(({ id: taskId, title }) => ({
            id: taskId,
            name: title,
          }))}
          pins={annotations.map((annotation) => ({
            id: annotation.id,
            x: annotation.x,
            y: annotation.y,
            title: annotation.title,
            body: annotation.body,
            status: annotation.status as
              | "planned"
              | "in_progress"
              | "completed"
              | "blocked"
              | "deficiency",
            taskId: annotation.taskId,
            workAreaId: annotation.workAreaId,
            createdBy: annotation.createdBy,
          }))}
          placeAction={placePlanPin}
          voidAction={voidPlanPin}
        />
      ) : (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            PDF plans can be opened, but tap-to-complete marks need a JPEG, PNG,
            or WebP sheet.
          </p>
          {imageUrl ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={imageUrl} />}
            >
              Open {selected?.filename}
            </Button>
          ) : null}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Field crews open the same marks at{" "}
        <Link className="underline" href={`/field/jobs/${job.id}/plan`}>
          the field plan
        </Link>
        .
      </p>
    </div>
  );
}
