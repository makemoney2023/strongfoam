import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PhotoReportLine = {
  takenOn: string;
  area: string;
  caption: string;
};

const REPORT_ZONE = "America/Toronto";

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function photoReportLines(input: {
  from: string;
  to: string;
  areaId: string;
  documents: Array<{
    id: string;
    createdAt: Date;
    workAreaId: string | null;
    kind: string;
  }>;
  areas: Array<{ id: string; name: string }>;
  drafts: Array<{
    status: string;
    kind: string;
    body: string;
    documentId: string | null;
    workAreaId: string | null;
  }>;
}): PhotoReportLine[] {
  const from = input.from.trim();
  const to = input.to.trim();
  const areaId = input.areaId.trim();
  const areaName = new Map(input.areas.map((area) => [area.id, area.name]));
  return input.documents
    .filter((document) => document.kind === "photo")
    .map((document) => {
      const takenOn = dayKey(document.createdAt);
      if (from && takenOn < from) return null;
      if (to && takenOn > to) return null;
      const captions = input.drafts.filter(
        (draft) =>
          draft.status === "confirmed" &&
          draft.kind === "caption" &&
          draft.documentId === document.id &&
          draft.body.trim(),
      );
      if (captions.length === 0) return null;
      const tag = input.drafts.find(
        (draft) =>
          draft.status === "confirmed" &&
          draft.kind === "area_tag" &&
          draft.documentId === document.id,
      );
      const resolvedArea = tag?.workAreaId || document.workAreaId || "";
      if (areaId && resolvedArea !== areaId) return null;
      return {
        takenOn,
        area: (tag?.body || areaName.get(resolvedArea) || "").trim(),
        caption: captions.map((draft) => draft.body.trim()).join(" "),
      };
    })
    .filter((line): line is PhotoReportLine => line !== null);
}

export async function jobPhotoReportPdf(input: {
  jobName: string;
  from: string;
  to: string;
  lines: PhotoReportLine[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  const title = `${input.jobName} photo report`;
  page.drawText(title.slice(0, 80), { x: 48, y: 740, size: 16, font, color: rgb(0.05, 0.07, 0.09) });
  page.drawText(`${input.from || "start"} to ${input.to || "today"}`.slice(0, 80), {
    x: 48,
    y: 718,
    size: 10,
    font,
  });
  let y = 690;
  const lines = input.lines.length
    ? input.lines
    : [{ takenOn: "", area: "", caption: "No confirmed captions in this range." }];
  for (const line of lines) {
    if (y < 72) break;
    const text = [line.takenOn, line.area, line.caption].filter(Boolean).join(" — ").slice(0, 110);
    page.drawText(text, { x: 48, y, size: 11, font });
    y -= 18;
  }
  page.drawText("Captions are drafts a person confirmed. Thickness is not certified.", {
    x: 48,
    y: 48,
    size: 9,
    font,
  });
  return pdf.save();
}
