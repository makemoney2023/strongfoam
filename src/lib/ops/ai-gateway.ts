import "server-only";
import {
  cloudflareChatCompletionsUrl,
  compatModelName,
  gatewayHeaders,
  readModelContent,
  type ChatMessage,
} from "@/lib/cloudflare/gateway";
import { namedAgent, type AgentNamespace } from "@/lib/cloudflare/agent-session";
import { getPlatform } from "@/lib/cloudflare/platform";
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

const JOB_AI_SYSTEM =
  "You summarize one construction job from the JSON evidence pack. Return JSON with paragraph, bullets, and sections.completed, sections.held, sections.material, and sections.next. Each bullet and section item is {text, citations:[{kind,id}]}. Citation kinds are task, field_note, voice_note, plan_mark, and job_event. Use only ids present in the pack. When the pack is thin, the paragraph must say what is missing. Do not invent prices or records.";

function jobMessages(purpose: GatewayPurpose, pack: JobEvidencePack): ChatMessage[] {
  return [
    { role: "system", content: JOB_AI_SYSTEM },
    {
      role: "user",
      content: JSON.stringify({ purpose, workingDay: pack.workingDay, evidence: pack }),
    },
  ];
}

function parseJobDraft(
  content: string,
  pack: JobEvidencePack,
  purpose: GatewayPurpose,
  provider: string,
  model: string,
): AiGatewayResult {
  const json = content.replace(/^```json\s*/i, "").replace(/```$/, "");
  try {
    const parsed = JSON.parse(json) as {
      paragraph?: unknown;
      bullets?: unknown;
      sections?: unknown;
    };
    const bullets = readCited(parsed.bullets, pack);
    const sections = readSections(parsed.sections, pack);
    const paragraph =
      typeof parsed.paragraph === "string" && parsed.paragraph.trim()
        ? parsed.paragraph.trim()
        : bullets.length
          ? `${pack.job.name} summary.`
          : "There is not enough field evidence to summarize this job yet.";
    return { status: "ready", provider, model, paragraph, bullets, sections };
  } catch {
    return { status: "failed", message: failureMessage(purpose) };
  }
}

export async function requestJobAi(args: {
  pack: JobEvidencePack;
  organizationId: string;
  purpose: GatewayPurpose;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  agentNamespace?: AgentNamespace;
}): Promise<AiGatewayResult> {
  const env = args.env ?? process.env;
  if (env.OPS_DEMO === "1") return demoAiResult(args.pack);
  const model = env.AI_GATEWAY_MODEL?.trim();
  if (!model) return { status: "disabled" };

  const messages = jobMessages(args.purpose, args.pack);
  try {
    const namespace =
      args.agentNamespace ??
      (args.fetchImpl ? undefined : (await getPlatform())?.STRONGFOAM_AGENT);
    if (namespace) {
      const agent = await namedAgent(namespace, "job", args.organizationId, args.pack.job.id);
      const content = await agent.draft({
        runId: crypto.randomUUID(),
        purpose: args.purpose,
        model,
        messages,
        json: true,
      });
      return parseJobDraft(content, args.pack, args.purpose, "cloudflare-agent", model);
    }
    const fetchImpl = args.fetchImpl ?? fetch;
    const response = await fetchImpl(cloudflareChatCompletionsUrl(env), {
      method: "POST",
      headers: gatewayHeaders(env),
      body: JSON.stringify({
        model: compatModelName(model),
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!response.ok) {
      return { status: "failed", message: failureMessage(args.purpose) };
    }
    const content = readModelContent(await response.json());
    return parseJobDraft(content, args.pack, args.purpose, "cloudflare-ai-gateway", model);
  } catch {
    return { status: "failed", message: failureMessage(args.purpose) };
  }
}
