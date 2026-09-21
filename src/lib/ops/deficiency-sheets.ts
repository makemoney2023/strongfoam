export type DeficiencySheetGroup = {
  key: string;
  filename: string;
  pageNumber: number | null;
  href: string;
  items: Array<{ id: string; label: string }>;
};

export function groupDeficienciesBySheet(input: {
  jobId: string;
  documents: Array<{ id: string; filename: string }>;
  marks: Array<{
    id: string;
    title: string;
    status: string;
    pageNumber: number;
    documentId: string;
    voidedAt: Date | null;
  }>;
  notes: Array<{
    id: string;
    kind: string;
    body: string;
    annotationId: string | null;
  }>;
}): DeficiencySheetGroup[] {
  const documents = new Map(
    input.documents.map((document) => [document.id, document.filename]),
  );
  const marks = new Map(input.marks.map((mark) => [mark.id, mark]));
  const groups = new Map<string, DeficiencySheetGroup>();

  function groupFor(documentId: string | null, pageNumber: number | null) {
    const filename = documentId
      ? (documents.get(documentId) ?? "Plan sheet")
      : "No sheet";
    const key = `${documentId ?? "none"}:${pageNumber ?? "none"}`;
    const existing = groups.get(key);
    if (existing) return existing;
    const created: DeficiencySheetGroup = {
      key,
      filename,
      pageNumber,
      href: documentId
        ? `/app/jobs/${input.jobId}/plan?documentId=${documentId}`
        : `/app/jobs/${input.jobId}#field-log`,
      items: [],
    };
    groups.set(key, created);
    return created;
  }

  for (const mark of input.marks) {
    if (mark.voidedAt || mark.status !== "deficiency") continue;
    groupFor(mark.documentId, mark.pageNumber).items.push({
      id: mark.id,
      label: mark.title,
    });
  }

  for (const note of input.notes) {
    if (note.kind !== "deficiency" || !note.body.trim()) continue;
    const mark = note.annotationId ? marks.get(note.annotationId) : undefined;
    const target =
      mark && !mark.voidedAt
        ? groupFor(mark.documentId, mark.pageNumber)
        : groupFor(null, null);
    target.items.push({ id: note.id, label: note.body.trim() });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.filename === "No sheet") return 1;
    if (b.filename === "No sheet") return -1;
    return (
      a.filename.localeCompare(b.filename) ||
      (a.pageNumber ?? 0) - (b.pageNumber ?? 0)
    );
  });
}
