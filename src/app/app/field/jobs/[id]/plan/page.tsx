import { notFound, redirect } from "next/navigation";
import { JobPlanBoard } from "@/components/ops/job-plan-board";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { RealtimeRefresh } from "@/components/ops/realtime-refresh";
import { Button } from "@/components/ui/button";
import { setFieldPlanAnnotationStatus } from "@/app/field/actions";
import { getFieldSession } from "@/lib/ops/field-auth";
import { formatJobNumber } from "@/lib/ops/jobs";
import { fieldJobDocumentHref } from "@/lib/ops/job-workspace";
import {
  canMarkupPlanDocument,
  fieldPlanHref,
  isCurrentPlanDocument,
} from "@/lib/ops/plan-markup";
import {
  canFieldUserAccessJob,
  getJob,
  listJobAssignments,
  listJobDocuments,
  listJobPlanAnnotations,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function FieldJobPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ documentId?: string }>;
}) {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();
  if (!(await canFieldUserAccessJob(session.userId, job.id))) {
    redirect("/field");
  }

  const [documents, areas, allTasks, assignments] = await Promise.all([
    listJobDocuments(job.id, { kind: "plan" }),
    listWorkAreas(job.id),
    listJobTasks(job.id),
    listJobAssignments(job.id),
  ]);
  const hasJobAssignment = assignments.some(
    (assignment) => assignment.userId === session.userId,
  );
  const tasks = hasJobAssignment
    ? allTasks
    : allTasks.filter((task) => task.assigneeUserId === session.userId);
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
  const returnTo = selected
    ? fieldPlanHref(job.id, selected.id)
    : fieldPlanHref(job.id);
  const imageUrl = selected
    ? fieldJobDocumentHref(job.id, selected.id)
    : null;

  return (
    <div className="space-y-5">
      <RealtimeRefresh url="/api/field/events" />
      <PageHeader
        crumbs={[
          { href: "/field", label: "Field" },
          { href: `/field/jobs/${job.id}`, label: formatJobNumber(job.id) },
          { label: "Plan" },
        ]}
        title="Mark completed work"
        description={
          selected
            ? `${selected.filename} · revision ${selected.versionNumber}`
            : "The office has not uploaded a plan sheet yet."
        }
      />

      {documents.length > 1 ? (
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-2">
            <label className="text-sm font-medium" htmlFor="fieldPlanSheet">
              Sheet
            </label>
            <NativeSelect
              id="fieldPlanSheet"
              name="documentId"
              defaultValue={selected?.id ?? ""}
              className="h-11"
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.filename}
                  {document.supersededAt ? " · previous" : " · current"}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" className="min-h-11">
            Open sheet
          </Button>
        </form>
      ) : null}

      {selected && imageUrl && canMarkupPlanDocument(selected) ? (
        <JobPlanBoard
          jobId={job.id}
          documentId={selected.id}
          imageUrl={imageUrl}
          mode="field"
          returnTo={returnTo}
          highlightedTaskIds={tasks
            .filter((task) => task.assigneeUserId === session.userId)
            .map((task) => task.id)}
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
          statusAction={setFieldPlanAnnotationStatus}
        />
      ) : selected && imageUrl ? (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            This file is a PDF. Open it to view, then ask the office for an
            image sheet if you need to tap completed work.
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            nativeButton={false}
            render={<a href={imageUrl} />}
          >
            Open {selected.filename}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No plan set has been uploaded yet.
        </p>
      )}
    </div>
  );
}
