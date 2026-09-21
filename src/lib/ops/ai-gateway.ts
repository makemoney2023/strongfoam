import "server-only";
import {
  filterCitations,
  isCitationKind,
  type Citation,
  type JobEvidencePack,
} from "@/lib/ops/ai-evidence";

export type AiCitedText = {
  text: string;
  citations: Citation[];
};

export type AiDraftSections = {
  completed: AiCitedText[];
  held: AiCitedText[];
  material: AiCitedText[];
  next: AiCitedText[];
};

export type AiGatewayResult =
  | { status: "disabled" }
  | { status: "failed"; message: string }
  | {
      status: "demo" | "ready";
      provider: string;
      model: string;
      paragraph: string;
      bullets: AiCitedText[];
      sections: AiDraftSections;
    };

type GatewayPurpose = "summary" | "daily_report";

function keepCited(items: AiCitedText[], pack: JobEvidencePack): AiCitedText[] {
  return items
    .map((item) => ({
      text: item.text.trim(),
      citations: filterCitations(item.citations, pack),
    }))
    .filter((item) => item.text && item.citations.length > 0);
}

function cite(
  pack: JobEvidencePack,
  kind: Citation["kind"],
  id: string,
  text: string,
): AiCitedText | null {
  const citations = filterCitations([{ kind, id }], pack);
  if (!citations.length || !text.trim()) return null;
  return { text: text.trim(), citations };
}

export function demoAiResult(pack: JobEvidencePack): AiGatewayResult {
  const task = pack.tasks[0];
  const blocker = pack.fieldNotes.find((note) => note.kind === "blocker");
  const voice = pack.voiceNotes.find(
    (note) => note.status === "completed" && note.transcript?.trim(),
  );
  const bullets = [
    task ? cite(pack, "task", task.id, `Open task: ${task.title}.`) : null,
    blocker ? cite(pack, "field_note", blocker.id, blocker.body) : null,
    voice?.transcript
      ? cite(pack, "voice_note", voice.id, voice.transcript)
      : null,
  ].filter((item): item is AiCitedText => Boolean(item));
  const completed = task
    ? [cite(pack, "task", task.id, task.title)].filter(
        (item): item is AiCitedText => Boolean(item),
      )
    : [];
  const held = blocker
    ? [cite(pack, "field_note", blocker.id, blocker.body)].filter(
        (item): item is AiCitedText => Boolean(item),
      )
    : [];
  const material = pack.fieldNotes
    .filter((note) => note.kind === "material_request")
    .slice(0, 3)
    .map((note) => cite(pack, "field_note", note.id, note.body))
    .filter((item): item is AiCitedText => Boolean(item));
  const next = voice?.transcript
    ? [cite(pack, "voice_note", voice.id, voice.transcript)].filter(
        (item): item is AiCitedText => Boolean(item),
      )
    : [];
  const paragraph = bullets.length
    ? `${pack.job.name} is ${pack.job.status.replaceAll("_", " ")}.`
    : "There is not enough field evidence to summarize this job yet.";
  return {
    status: "demo",
    provider: "demo",
    model: "strongfoam-demo-ai",
    paragraph,
    bullets,
    sections: { completed, held, material, next },
  };
}

function readCited(value: unknown, pack: JobEvidencePack): AiCitedText[] {
  if (!Array.isArray(value)) return [];
  const items: AiCitedText[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const text = (entry as { text?: unknown }).text;
    const raw = (entry as { citations?: unknown }).citations;
    if (typeof text !== "string") continue;
    const citations: Citation[] = [];
    if (Array.isArray(raw)) {
      for (const citation of raw) {
        if (!citation || typeof citation !== "object") continue;
        const kind = (citation as { kind?: unknown }).kind;
        const id = (citation as { id?: unknown }).id;
        if (typeof kind === "string" && isCitationKind(kind) && typeof id === "string") {
          citations.push({ kind, id });
        }
      }
    }
    items.push({ text, citations });
  }
  return keepCited(items, pack);
}

function failureMessage(purpose: GatewayPurpose): string {
  return purpose === "daily_report"
    ? "The daily report could not be drafted."
    : "The job summary could not be completed.";
}

function readSections(value: unknown, pack: JobEvidencePack): AiDraftSections {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    completed: readCited(source.completed, pack),
    held: readCited(source.held, pack),
    material: readCited(source.material, pack),
    next: readCited(source.next, pack),
  };
}

export async function requestJobAi(args: {
  pack: JobEvidencePack;
  purpose: GatewayPurpose;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<AiGatewayResult> {
  const env = args.env ?? process.env;
  if (env.OPS_DEMO === "1") return demoAiResult(args.pack);
  const apiKey = env.AI_GATEWAY_API_KEY?.trim();
  const model = env.AI_GATEWAY_MODEL?.trim();
  if (!apiKey || !model) return { status: "disabled" };

  const fetchImpl = args.fetchImpl ?? fetch;
  try {
  const response = await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You summarize one construction job from the JSON evidence pack. Return JSON with paragraph, bullets, and sections.completed, sections.held, sections.material, and sections.next. Each bullet and section item is {text, citations:[{kind,id}]}. Citation kinds are task, field_note, voice_note, plan_mark, and job_event. Use only ids present in the pack. When the pack is thin, the paragraph must say what is missing. Do not invent prices or records.",
        },
        {
          role: "user",
          content: JSON.stringify({
            purpose: args.purpose,
            workingDay: args.pack.workingDay,
            evidence: args.pack,
          }),
        },
      ],
    }),
  });
  if (!response.ok) {
    return { status: "failed", message: failureMessage(args.purpose) };
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  const json = content.replace(/^```json\s*/i, "").replace(/```$/, "");
  try {
    const parsed = JSON.parse(json) as {
      paragraph?: unknown;
      bullets?: unknown;
      sections?: unknown;
    };
    const bullets = readCited(parsed.bullets, args.pack);
    const sections = readSections(parsed.sections, args.pack);
    const paragraph =
      typeof parsed.paragraph === "string" && parsed.paragraph.trim()
        ? parsed.paragraph.trim()
        : bullets.length
          ? `${args.pack.job.name} summary.`
          : "There is not enough field evidence to summarize this job yet.";
    return {
      status: "ready",
      provider: "vercel-ai-gateway",
      model,
      paragraph,
      bullets,
      sections,
    };
  } catch {
    return { status: "failed", message: failureMessage(args.purpose) };
  }
  } catch {
    return { status: "failed", message: failureMessage(args.purpose) };
  }
}
