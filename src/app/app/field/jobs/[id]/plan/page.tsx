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
  toPlanMarkView,
} from "@/lib/ops/plan-markup";
import {
  canFieldUserAccessJob,
  getJob,
  listJobAssignments,
  listJobDocuments,
  listJobPlanAnnotations,
  listJobVoiceNotes,
  listJobTasks,
  listWorkAreas,
} from "@/lib/ops/store";
import { VoiceNotesPanel } from "@/components/ops/voice-notes-panel";
import { voiceConsentCopy } from "@/lib/ops/voice-notes";
import {
  addFieldVoiceNote,
  extractFieldVoiceNote,
  removeFieldVoiceNote,
  saveFieldVoiceTranscript,
} from "@/app/field/actions";

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

  const [documents, areas, allTasks, assignments, voiceNotes] = await Promise.all([
    listJobDocuments(job.id, { kind: "plan" }),
    listWorkAreas(job.id),
    listJobTasks(job.id),
    listJobAssignments(job.id),
    listJobVoiceNotes(job.id),
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
  const selectedIsCurrent = selected
    ? isCurrentPlanDocument(selected)
    : false;
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
            ? `${selected.filename} · revision ${selected.versionNumber}${
                selectedIsCurrent ? "" : " · previous revision"
              }`
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
          contentType={selected.contentType}
          sheetName={selected.filename}
          revision={selected.versionNumber}
          jobLabel={formatJobNumber(job.id)}
          mode="field"
          returnTo={returnTo}
          highlightedTaskIds={tasks
            .filter((task) => task.assigneeUserId === session.userId)
            .map((task) => task.id)}
          editableTaskIds={tasks.map((task) => task.id)}
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
              allTasks.find((task) => task.id === annotation.taskId),
            ),
          )}
          statusAction={
            selectedIsCurrent ? setFieldPlanAnnotationStatus : undefined
          }
        />
      ) : selected && imageUrl ? (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            This file type cannot be marked up. Ask the office for a JPEG, PNG,
            WebP, or PDF sheet.
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

      {selected && !selectedIsCurrent ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          This is a previous revision. Open the current sheet to update work.
        </p>
      ) : null}

      <VoiceNotesPanel
        jobId={job.id}
        notes={voiceNotes.filter(
          (note) =>
            note.source === "annotation" ||
            (note.annotationId &&
              annotations.some((annotation) => annotation.id === note.annotationId)),
        )}
        scope="field"
        returnTo={returnTo}
        sessionEmail={session.email}
        canDeleteAll={false}
        consentCopy={voiceConsentCopy()}
        recordAction={addFieldVoiceNote}
        updateAction={saveFieldVoiceTranscript}
        extractAction={extractFieldVoiceNote}
        deleteAction={removeFieldVoiceNote}
        areas={areas.map(({ id: areaId, name }) => ({ id: areaId, name }))}
        tasks={tasks.map(({ id: taskId, title }) => ({
          id: taskId,
          name: title,
        }))}
        annotations={annotations.map((annotation) => ({
          id: annotation.id,
          name: annotation.title,
        }))}
        documents={documents.map((document) => ({
          id: document.id,
          name: document.filename,
        }))}
        areaName={(workAreaId) =>
          areas.find((area) => area.id === workAreaId)?.name
        }
        taskTitle={(taskId) => tasks.find((task) => task.id === taskId)?.title}
        defaultSource={annotations[0] ? "annotation" : "job"}
        defaultAnnotationId={annotations[0]?.id ?? ""}
        defaultDocumentId={selected?.id ?? ""}
      />
    </div>
  );
}
