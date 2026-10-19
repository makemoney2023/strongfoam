import type { JobEvidencePack } from "@/lib/ops/ai-evidence";
import type { BidCitation, BidEstimateProposal } from "@/lib/ops/commercial-ai";
import type { CommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";
import type { PhotoContext } from "@/lib/ops/photo-caption";

export const GOLDEN_VOICE_TRANSCRIPT =
  "Sprayed 2400 square feet on the warehouse roof deck. The east wall is blocked until the electrician moves the conduit. Need 12 bags of closed-cell for the west bay.";

export const GOLDEN_PHOTO_CAPTION = "Closed-cell foam on the warehouse roof deck, studs covered in the bay.";
export const GOLDEN_LOT = "Drum lot SF-2400-A";
export const GOLDEN_GAUGE = "Gauge reads 2 inches on this pass.";

export function demoAiFixturesEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const enabled = env.DEMO_AI_FIXTURES === "1" || (env.OPS_DEMO === "1" && env.DEMO_GOLDEN === "1");
  if (!enabled) return false;
  if (env.DEMO_AI_LIVE === "1") return false;
  if (env.AI_GATEWAY_API_KEY?.trim()) return false;
  if (env.DEEPGRAM_API_KEY?.trim()) return false;
  return true;
}

export function jobAiFixture(pack: JobEvidencePack): unknown {
  const task = pack.tasks[0];
  const voice = pack.voiceNotes.find((note) => note.transcript?.trim());
  const bullets = [
    task
      ? {
          text: `Open task: ${task.title}.`,
          citations: [{ kind: "task", id: task.id }],
        }
      : null,
    voice?.transcript
      ? {
          text: voice.transcript,
          citations: [{ kind: "voice_note", id: voice.id }],
        }
      : null,
  ].filter((item) => item !== null);
  const paragraph = task
    ? `${pack.job.name} is ${pack.job.status.replaceAll("_", " ")}. ${task.title} is the open task.`
    : "There is not enough field evidence to summarize this job yet.";
  return {
    paragraph,
    bullets,
    sections: {
      completed: task
        ? [{ text: task.title, citations: [{ kind: "task", id: task.id }] }]
        : [],
      held: [],
      material: [],
      next: voice?.transcript
        ? [{ text: voice.transcript, citations: [{ kind: "voice_note", id: voice.id }] }]
        : [],
    },
  };
}

type PackChunk = {
  documentVersionId: string;
  pageNumber: number;
  sheetLabel: string | null;
  id: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
  text: string;
};

function packChunks(pack: CommercialEvidencePack): PackChunk[] {
  return pack.documents.flatMap((document) =>
    document.pages.flatMap((page) =>
      page.chunks.map((chunk) => ({
        documentVersionId: document.documentVersionId,
        pageNumber: page.pageNumber,
        sheetLabel: page.sheetLabel,
        ...chunk,
      })),
    ),
  );
}

export function bidDraftFixture(pack: CommercialEvidencePack): BidEstimateProposal {
  const chunks = packChunks(pack);
  const lines: BidEstimateProposal["lines"] = [];
  for (const chunk of chunks) {
    const citation: BidCitation = {
      documentVersionId: chunk.documentVersionId,
      pageNumber: chunk.pageNumber,
      sheetLabel: chunk.sheetLabel,
      chunkId: chunk.id,
      contentHash: chunk.contentHash,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      bbox: null,
    };
    const matches = [
      ...chunk.text.matchAll(
        /(\d+(?:\.\d+)?)\s*(inches|inch|board feet|board-feet|bf|sf|sq\.?\s*ft|m2|each|lf)\b/gi,
      ),
    ];
    if (matches.length === 0) {
      lines.push({
        category: "material",
        description: chunk.text.trim() || "Takeoff required",
        trade: pack.services[0] ?? "spray-foam",
        location: chunk.sheetLabel,
        candidatePriceBookItemIds: [],
        quantity: null,
        quantitySource: "manual_required",
        citations: [citation],
      });
      continue;
    }
    for (const match of matches) {
      lines.push({
        category: "material",
        description: `Scope line from the document, ${match[1]} ${match[2]}.`,
        trade: pack.services[0] ?? "spray-foam",
        location: chunk.sheetLabel,
        candidatePriceBookItemIds: [],
        quantity: { value: match[1] ?? "", unit: (match[2] ?? "").toLowerCase() },
        quantitySource: "explicit_written",
        citations: [citation],
      });
    }
  }
  const citations = lines[0]?.citations ?? [];
  return {
    summary: `Draft for ${pack.opportunityName}. Written quantities stay cited. Missing quantities stay takeoff required.`,
    jobPackages: citations.length
      ? [
          {
            name: pack.opportunityName,
            trade: pack.services[0] ?? "spray-foam",
            scope: "Scope follows the selected documents.",
            workAreas: [{ name: "Roof deck", kind: "area" }],
            tasks: [{ title: "Spray the roof deck", workAreaName: "Roof deck" }],
            citations,
          },
        ]
      : [],
    lines,
    inclusions: [],
    exclusions: [],
    alternates: [],
    questions: lines.some((line) => line.quantitySource === "manual_required")
      ? [
          {
            text: "Takeoff required where the documents do not state a quantity.",
            citations,
          },
        ]
      : [],
  };
}

export function inboundTriageModel(): {
  intent: "estimate";
  company: string;
  phone: string;
  city: string;
} {
  return {
    intent: "estimate",
    company: "Riverside Logistics",
    phone: "519-555-2400",
    city: "Cambridge",
  };
}

export function voiceExtractionFixture(transcript: string): unknown {
  return {
    cards: [
      {
        kind: "quantity",
        quote: "Sprayed 2400 square feet on the warehouse roof deck.",
        quantity: 2400,
        unit: "sq_ft",
      },
      {
        kind: "blocker",
        quote: "The east wall is blocked until the electrician moves the conduit.",
        quantity: null,
        unit: null,
      },
      {
        kind: "material_request",
        quote: "Need 12 bags of closed-cell for the west bay.",
        quantity: null,
        unit: null,
      },
      {
        kind: "daily_report",
        quote: transcript.trim(),
        quantity: null,
        unit: null,
      },
    ],
  };
}

export function photoCaptionFixture(context: PhotoContext): {
  caption: string;
  areaId: string;
  lot: string;
  gauge: string;
  coverage: string;
  safety: string;
} {
  return {
    caption: GOLDEN_PHOTO_CAPTION,
    areaId: context.areaIds[0] ?? "",
    lot: GOLDEN_LOT,
    gauge: GOLDEN_GAUGE,
    coverage: "The roof deck bay looks covered on this pass.",
    safety: "Crew is tied off at the roof edge.",
  };
}

export function keepGroundedSentences(fixture: string, grounded: string): string {
  const allowed = grounded
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const kept = fixture
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => allowed.some((item) => item === sentence));
  return kept.length > 0 ? `${kept.join(" ")}\n` : grounded;
}

export function keepGroundedLines(fixture: string, grounded: string): string {
  const kept = fixture
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && grounded.includes(line));
  return kept.length > 0 ? kept.join("\n") : grounded;
}
