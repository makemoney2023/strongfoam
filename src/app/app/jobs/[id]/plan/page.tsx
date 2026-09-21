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
  toPlanMarkView,
} from "@/lib/ops/plan-markup";
import { groupDeficienciesBySheet } from "@/lib/ops/deficiency-sheets";
import {
  getJob,
  listJobDocuments,
  listJobFieldNotes,
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

  const [documents, areas, tasks, notes, marks] = await Promise.all([
    listJobDocuments(job.id, { kind: "plan" }),
    listWorkAreas(job.id),
    listJobTasks(job.id),
    listJobFieldNotes(job.id),
    listJobPlanAnnotations(job.id),
  ]);
  const deficiencyGroups = groupDeficienciesBySheet({
    jobId: job.id,
    documents,
    marks,
    notes,
  });
  const currentPlans = documents.filter((document) =>
    isCurrentPlanDocument(document),
  );
  const selected =
    documents.find((document) => document.id === query.documentId) ??
    currentPlans[0] ??
    documents[0] ??
    null;
  const selectedIsCurrent = selected
    ? isCurrentPlanDocument(selected)
    : false;
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
            : "Upload a plan image or PDF so the crew can tap completed work."
        }
        actions={
          selectedIsCurrent && selected ? (
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
                returnTo={officePlanHref(job.id)}
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

      <section aria-labelledby="deficiencies-by-sheet" className="space-y-3">
        <div>
          <h2 id="deficiencies-by-sheet" className="text-lg font-semibold">
            Deficiencies by sheet
          </h2>
          <p className="text-sm text-muted-foreground">
            Deficiency marks and notes grouped by plan sheet. This does not file a punch list.
          </p>
        </div>
        {deficiencyGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deficiencies on these sheets.</p>
        ) : (
          <ul className="space-y-4">
            {deficiencyGroups.map((group) => (
              <li key={group.key}>
                <a href={group.href} className="text-sm font-medium underline">
                  {group.filename}
                  {group.pageNumber ? ` · page ${group.pageNumber}` : ""}
                </a>
                <ul className="mt-2 space-y-1 text-sm">
                  {group.items.map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          contentType={selected.contentType}
          sheetName={selected.filename}
          revision={selected.versionNumber}
          jobLabel={formatJobNumber(job.id)}
          mode="office"
          returnTo={returnTo}
          areas={areas.map(({ id: areaId, name }) => ({ id: areaId, name }))}
          tasks={tasks.map((task) => ({
            id: task.id,
            name: task.title,
            assigneeUserId: task.assigneeUserId,
            assignee: task.assignee,
          }))}
          pins={annotations.map((annotation) =>
            toPlanMarkView(
              annotation,
              tasks.find((task) => task.id === annotation.taskId),
            ),
          )}
          placeAction={selectedIsCurrent ? placePlanPin : undefined}
          voidAction={selectedIsCurrent ? voidPlanPin : undefined}
        />
      ) : (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            This file type cannot be marked up. Upload a JPEG, PNG, WebP, or
            PDF sheet.
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

      {selected && !selectedIsCurrent ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Previous revisions are read-only. Open the current sheet to place or
          void marks.
        </p>
      ) : null}

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
