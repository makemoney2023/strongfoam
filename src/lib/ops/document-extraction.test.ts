import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { DEMO_OPEN_OPPORTUNITY_ID } from "@/lib/ops/demo-data";
import {
  correctDemoBidDocumentPage,
  listDemoBidPackage,
  listDemoJobs,
  listDemoProjects,
  processDemoBidDocument,
  recordDemoQuarantinedBidDocument,
} from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  CHUNK_MAX_CHARS,
  CHUNK_MIN_CHARS,
  bidDocumentProgress,
  chunkPageText,
  correctExtractedPage,
  extractEmbeddedPdfPages,
  extractPagesWithCheckpoint,
  hashChunkText,
  resolvePageText,
  validateDocumentCitation,
} from "@/lib/ops/document-extraction";

async function textPdf(text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 48, y: 720, size: 12, font });
  return pdf.save();
}

describe("bid document extraction", () => {
  it("reads embedded text and a sheet label from a PDF", async () => {
    const bytes = await textPdf("Sheet A-201 podium plan closed cell");
    const extracted = await extractEmbeddedPdfPages(bytes);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.pages[0]?.text).toContain("A-201");
    expect(extracted.pages[0]?.sheetLabel).toBe("A-201");
  });

  it("sends an image-only page to OCR and keeps a citation", async () => {
    const ocr = vi.fn(async () => ({
      pageNumber: 1,
      text: "Image only floor plan",
      sheetLabel: "A-101",
      bbox: null,
    }));
    const page = await resolvePageText({
      pageNumber: 1,
      embeddedText: "",
      ocr,
    });
    expect(ocr).toHaveBeenCalledOnce();
    expect(page).toMatchObject({
      text: "Image only floor plan",
      sheetLabel: "A-101",
      source: "ocr",
    });
  });

  it("rejects an encrypted or corrupt PDF", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 this is not a document");
    const extracted = await extractEmbeddedPdfPages(bytes);
    expect(extracted).toEqual({ ok: false, error: "encrypted_or_corrupt" });
  });

  it("resumes after the last checkpointed page", async () => {
    const seen: number[] = [];
    const pages = [
      { pageNumber: 1, text: "one", sheetLabel: null },
      { pageNumber: 2, text: "two", sheetLabel: null },
      { pageNumber: 3, text: "three", sheetLabel: null },
    ];
    await expect(
      extractPagesWithCheckpoint({
        pages,
        checkpoint: null,
        onPage: (page) => {
          seen.push(page.pageNumber);
          if (page.pageNumber === 1) {
            throw Object.assign(new Error("stopped"), {
              checkpoint: { pageProgress: 1 },
            });
          }
        },
      }),
    ).rejects.toMatchObject({ checkpoint: { pageProgress: 1 } });
    await extractPagesWithCheckpoint({
      pages,
      checkpoint: { pageProgress: 1 },
      onPage: (page) => {
        seen.push(page.pageNumber);
      },
    });
    expect(seen).toEqual([1, 2, 3]);
  });

  it("keeps machine text when a person corrects the page", () => {
    const corrected = correctExtractedPage(
      {
        pageNumber: 2,
        sheetLabel: "A-201",
        machineText: "machine sheet",
        correctedText: null,
      },
      { sheetLabel: "A-202", correctedText: "human sheet" },
    );
    expect(corrected.machineText).toBe("machine sheet");
    expect(corrected.correctedText).toBe("human sheet");
    expect(corrected.sheetLabel).toBe("A-202");
  });

  it("splits a page into stable bounded chunks", () => {
    const text = `${"alpha ".repeat(400)}tail`;
    const first = chunkPageText(text);
    const second = chunkPageText(text);
    expect(first.length).toBeGreaterThan(1);
    expect(first.every((chunk) => chunk.text.length <= CHUNK_MAX_CHARS)).toBe(true);
    expect(first.slice(0, -1).every((chunk) => chunk.text.length >= CHUNK_MIN_CHARS)).toBe(
      true,
    );
    expect(first.map((chunk) => chunk.text).join("")).toBe(text);
    expect(first.map((chunk) => hashChunkText(chunk.text))).toEqual(
      second.map((chunk) => hashChunkText(chunk.text)),
    );
    expect(first[0]?.endOffset).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    expect(first[1]?.startOffset).toBe(first[0]?.endOffset);
  });

  it("rejects a citation from another organization", () => {
    const chunk = {
      id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      documentVersionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
      pageNumber: 1,
      contentHash: hashChunkText("podium"),
      startOffset: 0,
      endOffset: 6,
    };
    expect(
      validateDocumentCitation(
        {
          documentVersionId: chunk.documentVersionId,
          pageNumber: 1,
          sheetLabel: "A-201",
          chunkId: chunk.id,
          contentHash: chunk.contentHash,
          startOffset: 0,
          endOffset: 6,
          bbox: null,
        },
        {
          organizationId: "11111111-1111-4111-8111-111111111111",
          version: {
            id: chunk.documentVersionId,
            organizationId: STRONG_FOAM_ORGANIZATION_ID,
          },
          chunk,
        },
      ).ok,
    ).toBe(false);
  });

  it("moves a demo PDF from scanning to ready without creating a job", async () => {
    const projects = listDemoProjects().length;
    const jobs = listDemoJobs().length;
    const bytes = await textPdf("Sheet A-201 podium plan closed cell");
    const recorded = recordDemoQuarantinedBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      documentId: null,
      actor: "office@strongfoam.demo",
      input: {
        filename: "podium-plan.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.length,
        kind: "plan",
        revisionLabel: "Rev A",
      },
      pathname: `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${DEMO_OPEN_OPPORTUNITY_ID}/podium-plan.pdf`,
      bytes,
    });
    expect(recorded?.versionId).toBeTruthy();
    const scanning = listDemoBidPackage(
      STRONG_FOAM_ORGANIZATION_ID,
      DEMO_OPEN_OPPORTUNITY_ID,
    ).find((item) => item.version.id === recorded?.versionId);
    expect(
      bidDocumentProgress({ versionStatus: scanning?.version.status ?? "" }),
    ).toBe("Scanning");
    const extracting = await processDemoBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      versionId: recorded?.versionId ?? "",
    });
    expect(extracting).toEqual({ ok: true, progress: "Extracting" });
    const ready = await processDemoBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      versionId: recorded?.versionId ?? "",
    });
    expect(ready).toEqual({ ok: true, progress: "Ready" });
    const listed = listDemoBidPackage(
      STRONG_FOAM_ORGANIZATION_ID,
      DEMO_OPEN_OPPORTUNITY_ID,
    ).find((item) => item.version.id === recorded?.versionId);
    expect(listed?.pages[0]?.machineText).toContain("A-201");
    expect(listed?.pages[0]?.sheetLabel).toBe("A-201");
    expect(listed?.chunks[0]?.contentHash).toBe(
      hashChunkText(listed?.pages[0]?.machineText ?? ""),
    );
    const pageId = listed?.pages[0]?.id ?? "";
    expect(
      correctDemoBidDocumentPage({
        organizationId: STRONG_FOAM_ORGANIZATION_ID,
        opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
        versionId: recorded?.versionId ?? "",
        pageId,
        sheetLabel: "A-202",
        correctedText: "Corrected podium note",
      }).ok,
    ).toBe(true);
    const corrected = listDemoBidPackage(
      STRONG_FOAM_ORGANIZATION_ID,
      DEMO_OPEN_OPPORTUNITY_ID,
    ).find((item) => item.version.id === recorded?.versionId);
    expect(corrected?.pages[0]?.machineText).toContain("A-201");
    expect(corrected?.pages[0]?.sheetLabel).toBe("A-202");
    expect(corrected?.pages[0]?.correctedText).toBe("Corrected podium note");
    expect(listDemoProjects()).toHaveLength(projects);
    expect(listDemoJobs()).toHaveLength(jobs);
  });

  it("keeps a corrupt PDF failed and retryable", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 this is not a document");
    const recorded = recordDemoQuarantinedBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      documentId: null,
      actor: "office@strongfoam.demo",
      input: {
        filename: "corrupt-plan.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.length,
        kind: "plan",
        revisionLabel: null,
      },
      pathname: `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${DEMO_OPEN_OPPORTUNITY_ID}/corrupt-plan.pdf`,
      bytes,
    });
    await processDemoBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      versionId: recorded?.versionId ?? "",
    });
    const failed = await processDemoBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      versionId: recorded?.versionId ?? "",
    });
    expect(failed).toEqual({ ok: true, progress: "Failed" });
    const retried = await processDemoBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      versionId: recorded?.versionId ?? "",
    });
    expect(retried).toEqual({ ok: true, progress: "Failed" });
  });

  it("names the visible extraction states", () => {
    expect(bidDocumentProgress({ versionStatus: "quarantined" })).toBe("Scanning");
    expect(
      bidDocumentProgress({
        versionStatus: "clean",
        extractionStatus: "running",
        pageProgress: 2,
        pageCount: 5,
      }),
    ).toBe("Extracting 2/5");
    expect(
      bidDocumentProgress({ versionStatus: "clean", extractionStatus: "ready" }),
    ).toBe("Ready");
    expect(
      bidDocumentProgress({ versionStatus: "clean", extractionStatus: "failed" }),
    ).toBe("Failed");
  });
});
