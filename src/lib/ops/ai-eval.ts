import { demoAiResult, type AiGatewayResult } from "@/lib/ops/ai-gateway";
import {
  buildJobEvidencePack,
  filterCitations,
  type Citation,
  type JobEvidencePack,
} from "@/lib/ops/ai-evidence";

const FORBIDDEN_KEYS = ["price", "unitprice", "total", "send", "approve", "markup"];

export type GoldenCase = {
  name: string;
  pack: JobEvidencePack;
};

export type GoldenFailure = {
  name: string;
  reason: string;
};

export type GoldenReport = {
  passed: number;
  failed: number;
  citationValidity: number;
  failures: GoldenFailure[];
};

export type GoldenRunner = (pack: JobEvidencePack) => Promise<AiGatewayResult> | AiGatewayResult;

function pack(name: string, notes: Array<{ id: string; kind: string; body: string }> = []): JobEvidencePack {
  return buildJobEvidencePack({
    job: { id: `job-${name}`, name, status: "in_progress" },
    tasks: [
      {
        id: `task-${name}`,
        title: `${name} task`,
        status: "open",
        dueAt: null,
        plannedEndAt: null,
        createdAt: new Date("2026-10-13T12:00:00.000Z"),
      },
    ],
    fieldNotes: notes.map((note) => ({
      id: note.id,
      kind: note.kind,
      body: note.body,
      quantity: null,
      unit: null,
      taskId: null,
      workAreaId: null,
      createdAt: new Date("2026-10-13T12:00:00.000Z"),
    })),
    voiceNotes: [],
    planMarks: [],
    events: [],
    now: new Date("2026-10-13T15:00:00.000Z"),
  });
}

export const GOLDEN_CASES: GoldenCase[] = [
  { name: "open-task", pack: pack("Podium") },
  {
    name: "blocker",
    pack: pack("East wall", [{ id: "note-east", kind: "blocker", body: "Lift is down." }]),
  },
  {
    name: "material",
    pack: pack("Roof", [{ id: "note-roof", kind: "material_request", body: "Need more bags." }]),
  },
];

function forbiddenKey(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.some((word) => key.toLowerCase().includes(word))) return key;
    const nested = forbiddenKey(child);
    if (nested) return nested;
  }
  return null;
}

function citationsOf(result: Extract<AiGatewayResult, { status: "demo" | "ready" }>): Citation[] {
  return [
    ...result.bullets.flatMap((item) => item.citations),
    ...result.sections.completed.flatMap((item) => item.citations),
    ...result.sections.held.flatMap((item) => item.citations),
    ...result.sections.material.flatMap((item) => item.citations),
    ...result.sections.next.flatMap((item) => item.citations),
  ];
}

export function offlineGoldenRunner(packToRun: JobEvidencePack): AiGatewayResult {
  return demoAiResult(packToRun);
}

export async function evaluateGoldenSet(runner: GoldenRunner): Promise<GoldenReport> {
  const failures: GoldenFailure[] = [];
  let citationChecks = 0;
  let citationPasses = 0;
  for (const item of GOLDEN_CASES) {
    const result = await runner(item.pack);
    if (result.status !== "demo" && result.status !== "ready") {
      failures.push({ name: item.name, reason: result.status === "failed" ? result.message : "disabled" });
      continue;
    }
    const forbidden = forbiddenKey(result);
    if (forbidden) {
      failures.push({ name: item.name, reason: `forbidden field ${forbidden}` });
      continue;
    }
    if (!result.paragraph.trim() || !result.sections) {
      failures.push({ name: item.name, reason: "missing paragraph or sections" });
      continue;
    }
    const citations = citationsOf(result);
    citationChecks += Math.max(citations.length, 1);
    const kept = filterCitations(citations, item.pack);
    citationPasses += kept.length;
    if (kept.length !== citations.length) {
      failures.push({ name: item.name, reason: "citation outside the evidence pack" });
      continue;
    }
  }
  return {
    passed: GOLDEN_CASES.length - failures.length,
    failed: failures.length,
    citationValidity: citationChecks === 0 ? 1 : citationPasses / citationChecks,
    failures,
  };
}

export async function liveGoldenRunner(packToRun: JobEvidencePack): Promise<AiGatewayResult> {
  if (process.env.AI_EVAL_LIVE !== "1") {
    throw new Error("AI_EVAL_LIVE is not set.");
  }
  const { requestJobAi } = await import("@/lib/ops/ai-gateway");
  return requestJobAi({
    pack: packToRun,
    organizationId: "00000000-0000-4000-8000-000000000001",
    purpose: "summary",
  });
}
