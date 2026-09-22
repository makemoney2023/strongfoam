import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
  validateCitation,
  type DocumentCitation,
} from "@/lib/ops/commercial-documents";

export const DOCUMENT_TEXT_THRESHOLD = 40;
export const CHUNK_MIN_CHARS = 800;
export const CHUNK_MAX_CHARS = 1500;

const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const ocrPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string().min(1).max(20_000),
  sheetLabel: z.string().max(40).nullable(),
  bbox: bboxSchema.nullable().optional(),
});

export type ExtractedPageText = {
  pageNumber: number;
  text: string;
  sheetLabel: string | null;
};

export type PageChunk = {
  startOffset: number;
  endOffset: number;
  text: string;
  contentHash: string;
};

type PdfTextItem = { str?: string };
type PdfjsModule = {
  getDocument: (src: {
    data: Uint8Array;
    disableWorker?: boolean;
    isEvalSupported?: boolean;
    standardFontDataUrl?: string;
  }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: PdfTextItem[] }>;
      }>;
      destroy?: () => Promise<void> | void;
    }>;
  };
};

export function detectSheetLabel(text: string): string | null {
  const match = text.match(/\b([A-Z]{1,3}-\d{2,4})\b/);
  return match?.[1] ?? null;
}

export function hashChunkText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function chunkPageText(text: string): Array<{
  startOffset: number;
  endOffset: number;
  text: string;
}> {
  if (!text) return [];
  const chunks: Array<{ startOffset: number; endOffset: number; text: string }> = [];
  let start = 0;
  while (start < text.length) {
    const remaining = text.length - start;
    if (remaining <= CHUNK_MAX_CHARS) {
      chunks.push({
        startOffset: start,
        endOffset: text.length,
        text: text.slice(start),
      });
      break;
    }
    let end = start + CHUNK_MAX_CHARS;
    const windowStart = start + CHUNK_MIN_CHARS;
    const window = text.slice(windowStart, end);
    const breakAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    if (breakAt >= 0) end = windowStart + breakAt + 1;
    chunks.push({
      startOffset: start,
      endOffset: end,
      text: text.slice(start, end),
    });
    start = end;
  }
  return chunks;
}

export function chunksForText(text: string): PageChunk[] {
  return chunkPageText(text).map((chunk) => ({
    ...chunk,
    contentHash: hashChunkText(chunk.text),
  }));
}

export function parseOcrPage(
  value: unknown,
  pageNumber: number,
): { ok: true; page: z.infer<typeof ocrPageSchema> } | { ok: false; error: string } {
  const parsed = ocrPageSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "The OCR response was not valid page text." };
  if (parsed.data.pageNumber !== pageNumber) {
    return { ok: false, error: "The OCR response was for a different page." };
  }
  return { ok: true, page: parsed.data };
}

export async function resolvePageText(args: {
  pageNumber: number;
  embeddedText: string;
  ocr: ((pageNumber: number) => Promise<unknown>) | null;
}): Promise<{
  text: string;
  sheetLabel: string | null;
  source: "embedded" | "ocr" | "unavailable";
  bbox: { x: number; y: number; width: number; height: number } | null;
}> {
  const embedded = args.embeddedText;
  const sheetLabel = detectSheetLabel(embedded);
  const thin = embedded.trim().length < DOCUMENT_TEXT_THRESHOLD;
  if (!thin || !args.ocr) {
    if (!embedded.trim()) {
      return { text: "OCR unavailable", sheetLabel: null, source: "unavailable", bbox: null };
    }
    return { text: embedded, sheetLabel, source: "embedded", bbox: null };
  }
  const parsed = parseOcrPage(await args.ocr(args.pageNumber), args.pageNumber);
  if (!parsed.ok) {
    return {
      text: embedded.trim() ? embedded : "OCR unavailable",
      sheetLabel,
      source: embedded.trim() ? "embedded" : "unavailable",
      bbox: null,
    };
  }
  return {
    text: parsed.page.text,
    sheetLabel: parsed.page.sheetLabel ?? sheetLabel,
    source: "ocr",
    bbox: parsed.page.bbox ?? null,
  };
}

export async function extractEmbeddedPdfPages(
  bytes: Uint8Array,
): Promise<
  { ok: true; pages: ExtractedPageText[] } | { ok: false; error: "encrypted_or_corrupt" }
> {
  try {
    const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfjsModule;
    const fonts = path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/");
    const document = await pdfjs.getDocument({
      data: bytes,
      disableWorker: true,
      isEvalSupported: false,
      standardFontDataUrl: pathToFileURL(fonts).href,
    }).promise;
    const pages: ExtractedPageText[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => item.str ?? "")
        .join(" ")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
      pages.push({
        pageNumber,
        text,
        sheetLabel: detectSheetLabel(text),
      });
    }
    await document.destroy?.();
    return { ok: true, pages };
  } catch (error) {
    console.error("Bid document text extraction failed.", error);
    return { ok: false, error: "encrypted_or_corrupt" };
  }
}

export async function extractPagesWithCheckpoint(args: {
  pages: ExtractedPageText[];
  checkpoint: { pageProgress: number } | null;
  onPage: (page: ExtractedPageText & { chunks: PageChunk[] }) => void | Promise<void>;
}): Promise<{ pageProgress: number }> {
  let progress = args.checkpoint?.pageProgress ?? 0;
  for (const page of args.pages) {
    if (page.pageNumber <= progress) continue;
    await args.onPage({ ...page, chunks: chunksForText(page.text) });
    progress = page.pageNumber;
  }
  return { pageProgress: progress };
}

export function correctExtractedPage<
  T extends {
    machineText: string;
    correctedText: string | null;
    sheetLabel: string | null;
  },
>(page: T, input: { correctedText?: string | null; sheetLabel?: string | null }): T {
  return {
    ...page,
    machineText: page.machineText,
    correctedText:
      input.correctedText === undefined ? page.correctedText : input.correctedText,
    sheetLabel: input.sheetLabel === undefined ? page.sheetLabel : input.sheetLabel,
  };
}

export function validateDocumentCitation(
  citation: DocumentCitation,
  scope: {
    organizationId: string;
    version: { id: string; organizationId: string } | null;
    chunk: {
      id: string;
      organizationId: string;
      documentVersionId: string;
      pageNumber: number;
      contentHash: string;
      startOffset: number;
      endOffset: number;
    } | null;
  },
): { ok: true } | { ok: false; error: string } {
  return validateCitation(citation, scope);
}

export function bidDocumentProgress(input: {
  versionStatus: string;
  extractionStatus?: string | null;
  pageProgress?: number;
  pageCount?: number | null;
}): "Scanning" | "Extracting" | `Extracting ${number}/${number}` | "Ready" | "Failed" | "Rejected" {
  if (input.versionStatus === "rejected") return "Rejected";
  if (input.versionStatus !== "clean") return "Scanning";
  if (input.extractionStatus === "failed") return "Failed";
  if (input.extractionStatus === "ready") return "Ready";
  if (
    input.extractionStatus === "running" &&
    input.pageCount &&
    input.pageProgress !== undefined
  ) {
    return `Extracting ${input.pageProgress}/${input.pageCount}`;
  }
  return "Extracting";
}
