export const DEFAULT_LARGE_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const DEFAULT_SMALL_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export const AI_TASKS = [
  "classify",
  "triage",
  "summary",
  "daily_report",
  "morning_brief",
  "stale_sweep",
  "revision_explanation",
  "commercial_proposal",
  "scope_outline",
  "eval",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

const SMALL_TASKS = new Set<AiTask>(["classify", "triage", "morning_brief", "stale_sweep"]);
const UNCACHED_TASKS = new Set<AiTask>([
  "classify",
  "triage",
  "commercial_proposal",
  "scope_outline",
  "eval",
]);

type ModelEnv = Record<string, string | undefined>;

export type ModelRoute = {
  task: AiTask;
  tier: "small" | "large";
  model: string;
  fallbackModel: string;
  cache: boolean;
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  backoff: "exponential";
};

export function isAiTask(value: string): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value);
}

export function gatewayMetadata(
  input: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    if (entries.length >= 5) break;
    if (value === undefined || value === "") continue;
    if (key.startsWith("cf.")) continue;
    if (/prompt|message|content|evidence/i.test(key)) continue;
    entries.push([key, String(value).slice(0, 256)]);
  }
  return Object.fromEntries(entries);
}

export function modelForTask(task: AiTask, env: ModelEnv = {}): ModelRoute {
  const tier = SMALL_TASKS.has(task) ? "small" : "large";
  const large = env.AI_GATEWAY_MODEL?.trim() || DEFAULT_LARGE_MODEL;
  const small = env.AI_GATEWAY_SMALL_MODEL?.trim() || DEFAULT_SMALL_MODEL;
  const other = tier === "large" ? small : large;
  return {
    task,
    tier,
    model: tier === "small" ? small : large,
    fallbackModel: fallbackModel(env, other),
    cache: !UNCACHED_TASKS.has(task),
    timeoutMs: tier === "small" ? 20_000 : 45_000,
    maxAttempts: 2,
    retryDelayMs: 250,
    backoff: "exponential",
  };
}

function fallbackModel(env: ModelEnv, other: string): string {
  if (env.AI_GATEWAY_FALLBACK_MODEL === undefined) return other;
  const explicit = env.AI_GATEWAY_FALLBACK_MODEL.trim();
  if (!explicit || explicit === "off") return "";
  return explicit;
}
