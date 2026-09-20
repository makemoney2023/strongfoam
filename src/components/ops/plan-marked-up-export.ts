import { buildPlanCloseout, type PlanExportMark } from "@/lib/ops/plan-export";
import { PLAN_ANNOTATION_STATUS_STROKES } from "@/lib/ops/plan-markup";
import { arrowHeadPoints, polygonPath } from "@/lib/ops/plan-geometry";

export async function downloadMarkedUpPlan(args: {
  jobLabel: string;
  sheetName: string;
  revision: number;
  marks: PlanExportMark[];
  sheetPng: string | null;
}): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const closeout = buildPlanCloseout({
    jobLabel: args.jobLabel,
    sheetName: args.sheetName,
    revision: args.revision,
    exportedAt: new Date(),
    marks: args.marks,
  });

  if (args.sheetPng) {
    const composite = await compositeMarks(args.sheetPng, args.marks);
    const image = await pdf.embedPng(dataUrlToBytes(composite));
    const page = pdf.addPage([612, 792]);
    const maxWidth = 560;
    const maxHeight = 640;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawText(closeout.heading, {
      x: 26,
      y: 760,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.12, 0.16),
    });
    page.drawText(closeout.subtitle, {
      x: 26,
      y: 742,
      size: 9,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });
    page.drawImage(image, {
      x: (612 - width) / 2,
      y: 792 - 88 - height,
      width,
      height,
    });
  }

  const table = pdf.addPage([612, 792]);
  table.drawText(closeout.heading, {
    x: 26,
    y: 760,
    size: 14,
    font: bold,
    color: rgb(0.1, 0.12, 0.16),
  });
  table.drawText("Selected annotations", {
    x: 26,
    y: 742,
    size: 9,
    font,
    color: rgb(0.35, 0.38, 0.42),
  });

  let y = 718;
  if (closeout.rows.length === 0) {
    table.drawText("No marks matched the current filters.", {
      x: 26,
      y,
      size: 10,
      font,
    });
  }
  for (const row of closeout.rows) {
    if (y < 64) break;
    table.drawText(`${row.title} · ${row.kind} · ${row.status} · ${row.trade}`.slice(0, 92), {
      x: 26,
      y,
      size: 10,
      font: bold,
    });
    y -= 14;
    table.drawText(
      `Page ${row.page} · ${row.author} · ${row.crew}${row.note ? ` · ${row.note}` : ""}`.slice(
        0,
        110,
      ),
      {
        x: 26,
        y,
        size: 9,
        font,
        color: rgb(0.32, 0.35, 0.4),
      },
    );
    y -= 22;
  }

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(args.jobLabel)}-plan-closeout.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

async function compositeMarks(
  sheetPng: string,
  marks: PlanExportMark[],
): Promise<string> {
  const image = await loadImage(sheetPng);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return sheetPng;
  context.drawImage(image, 0, 0);
  for (const mark of marks) {
    const color = PLAN_ANNOTATION_STATUS_STROKES[mark.status];
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(2, canvas.width * 0.003);
    const x = mark.x * canvas.width;
    const y = mark.y * canvas.height;
    const geometry = mark.geometry;
    if (geometry.type === "circle" || geometry.type === "ellipse") {
      context.globalAlpha = 0.18;
      context.beginPath();
      context.ellipse(
        x,
        y,
        geometry.rx * canvas.width,
        geometry.ry * canvas.height,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.globalAlpha = 1;
      context.stroke();
    } else if (geometry.type === "polygon") {
      const path = new Path2D(
        `${polygonPath(
          geometry.points.map((point) => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          })),
        )} Z`,
      );
      context.globalAlpha = 0.16;
      context.fill(path);
      context.globalAlpha = 1;
      context.stroke(path);
    } else if (geometry.type === "arrow") {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(geometry.x2 * canvas.width, geometry.y2 * canvas.height);
      context.stroke();
      const [left, , right] = arrowHeadPoints(
        { x: mark.x, y: mark.y },
        { x: geometry.x2, y: geometry.y2 },
      )
        .split(" ")
        .map((pair) => pair.split(",").map(Number));
      context.beginPath();
      context.moveTo(left[0] * canvas.width, left[1] * canvas.height);
      context.lineTo(geometry.x2 * canvas.width, geometry.y2 * canvas.height);
      context.lineTo(right[0] * canvas.width, right[1] * canvas.height);
      context.closePath();
      context.fill();
    } else {
      context.beginPath();
      context.arc(x, y, Math.max(6, canvas.width * 0.01), 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ffffff";
      context.stroke();
    }
    context.globalAlpha = 1;
    context.fillStyle = "#0f172a";
    context.font = `${Math.max(11, canvas.width * 0.014)}px sans-serif`;
    context.fillText(mark.title.slice(0, 36), x + 10, y - 8);
    context.restore();
  }
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("sheet image failed"));
    image.src = src;
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, encoded = ""] = dataUrl.split(",");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "job";
}
