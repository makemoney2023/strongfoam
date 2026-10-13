import { recordAiUsage, type AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import { gatewayMetadata } from "@/lib/cloudflare/model-routing";

export const CLOUDFLARE_ACCOUNT_ID = "6f6959ecba86d1de4d6cf6aa0b34528d";
export const AI_GATEWAY_ID = "strongfoam";
export const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type GatewayEnv = Record<string, string | undefined>;

export type GatewayCache =
  | { ttlSeconds: number; key: string }
  | { skip: true };

export type GatewayPolicy = {
  metadata?: Record<string, string | number | boolean | undefined>;
  cache?: GatewayCache;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  backoff?: "constant" | "linear" | "exponential";
  fallbackModel?: string;
};

export type GatewayUsage = {
  dataset?: AiUsageDataset;
  organizationId: string;
  purpose: string;
};

export function cloudflareChatCompletionsUrl(env: GatewayEnv): string {
  const accountId =
    env.AI_GATEWAY_ACCOUNT_ID?.trim() ||
    env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
    CLOUDFLARE_ACCOUNT_ID;
  const gatewayId = env.AI_GATEWAY_ID?.trim() || AI_GATEWAY_ID;
  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;
}

export function compatModelName(model: string): string {
  if (model.startsWith("@cf/")) return `workers-ai/${model}`;
  return model;
}

export function readModelContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as {
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  if (typeof record.response === "string") return record.response.trim();
  if (record.response && typeof record.response === "object") {
    return JSON.stringify(record.response);
  }
  const content = record.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function cacheHeaders(cache: GatewayCache | undefined): Record<string, string> {
  if (!cache) return {};
  if ("skip" in cache) return { "cf-aig-skip-cache": "true" };
  const ttl = Math.min(2_592_000, Math.max(60, Math.floor(cache.ttlSeconds)));
  return {
    "cf-aig-cache-key": cache.key,
    "cf-aig-cache-ttl": String(ttl),
  };
}

export function gatewayHeaders(env: GatewayEnv, policy?: GatewayPolicy): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = env.AI_GATEWAY_API_KEY?.trim();
  if (apiKey) headers["cf-aig-authorization"] = `Bearer ${apiKey}`;
  if (!policy) return headers;
  const metadata = gatewayMetadata(policy.metadata ?? {});
  if (Object.keys(metadata).length > 0) {
    headers["cf-aig-metadata"] = JSON.stringify(metadata);
  }
  Object.assign(headers, cacheHeaders(policy.cache));
  if (policy.timeoutMs && policy.timeoutMs > 0) {
    headers["cf-aig-request-timeout"] = String(Math.floor(policy.timeoutMs));
  }
  if (policy.maxAttempts && policy.maxAttempts > 0) {
    headers["cf-aig-max-attempts"] = String(Math.min(5, Math.max(1, Math.floor(policy.maxAttempts))));
  }
  if (policy.retryDelayMs != null && policy.retryDelayMs >= 0) {
    headers["cf-aig-retry-delay"] = String(Math.min(60_000, Math.floor(policy.retryDelayMs)));
  }
  if (policy.backoff) headers["cf-aig-backoff"] = policy.backoff;
  return headers;
}

export type WorkersAi = {
  run: (
    model: string,
    input: { messages: ChatMessage[]; response_format?: { type: "json_object" } },
    options: { gateway: Record<string, unknown> },
  ) => Promise<unknown>;
};

export class ModelUnavailableError extends Error {
  constructor(model: string) {
    super(`model-unavailable: ${model || "no model configured"}`);
    this.name = "ModelUnavailableError";
  }
}

function cacheLabel(policy?: GatewayPolicy): "key" | "skip" | "none" {
  if (!policy?.cache) return "none";
  return "skip" in policy.cache ? "skip" : "key";
}

function bindingGateway(env: GatewayEnv, policy?: GatewayPolicy): Record<string, unknown> {
  const gateway: Record<string, unknown> = {
    id: env.AI_GATEWAY_ID?.trim() || AI_GATEWAY_ID,
  };
  if (!policy) return gateway;
  const metadata = gatewayMetadata(policy.metadata ?? {});
  if (Object.keys(metadata).length > 0) gateway.metadata = metadata;
  if (policy.cache && "skip" in policy.cache) gateway.skipCache = true;
  else if (policy.cache) {
    gateway.cacheKey = policy.cache.key;
    gateway.cacheTtl = Math.min(2_592_000, Math.max(60, Math.floor(policy.cache.ttlSeconds)));
  }
  return gateway;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number | undefined): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI Gateway request timed out.")), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function completeThroughGateway(args: {
  ai?: WorkersAi;
  env: GatewayEnv;
  model: string;
  messages: ChatMessage[];
  json?: boolean;
  fetchImpl?: typeof fetch;
  policy?: GatewayPolicy;
  usage?: GatewayUsage;
}): Promise<string> {
  const started = Date.now();
  let attempts = 0;
  let modelUsed = args.model.trim();
  const finish = (status: "ok" | "error", outputChars: number) => {
    if (!args.usage) return;
    recordAiUsage(args.usage.dataset, {
      organizationId: args.usage.organizationId,
      purpose: args.usage.purpose,
      model: modelUsed,
      status,
      cache: cacheLabel(args.policy),
      latencyMs: Date.now() - started,
      attempts,
      inputChars: args.messages.reduce((sum, message) => sum + message.content.length, 0),
      outputChars,
    });
  };

  try {
    const content = await completeWithFallback(args, (model) => {
      modelUsed = model;
      attempts += 1;
    });
    finish("ok", content.length);
    return content;
  } catch (error) {
    finish("error", 0);
    throw error;
  }
}

async function completeWithFallback(
  args: {
    ai?: WorkersAi;
    env: GatewayEnv;
    model: string;
    messages: ChatMessage[];
    json?: boolean;
    fetchImpl?: typeof fetch;
    policy?: GatewayPolicy;
  },
  onAttempt: (model: string) => void,
): Promise<string> {
  const model = args.model.trim();
  if (!model) throw new ModelUnavailableError(model);
  try {
    return await invokeModel(args, model, onAttempt);
  } catch (error) {
    const fallback = args.policy?.fallbackModel?.trim() ?? "";
    if (error instanceof ModelUnavailableError || !fallback || fallback === model) throw error;
    try {
      return await invokeModel(args, fallback, onAttempt);
    } catch {
      throw error;
    }
  }
}

async function invokeModel(
  args: {
    ai?: WorkersAi;
    env: GatewayEnv;
    messages: ChatMessage[];
    json?: boolean;
    fetchImpl?: typeof fetch;
    policy?: GatewayPolicy;
  },
  model: string,
  onAttempt: (model: string) => void,
): Promise<string> {
  const responseFormat = args.json ? { response_format: { type: "json_object" as const } } : {};
  if (model.startsWith("@cf/")) {
    if (!args.ai) throw new ModelUnavailableError(model);
    const attempts = args.policy
      ? Math.min(5, Math.max(1, Math.floor(args.policy.maxAttempts ?? 1)))
      : 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      onAttempt(model);
      try {
        const result = await withTimeout(
          args.ai.run(
            model,
            { messages: args.messages, ...responseFormat },
            { gateway: bindingGateway(args.env, args.policy) },
          ),
          args.policy?.timeoutMs,
        );
        return readModelContent(result);
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        await delay(args.policy?.retryDelayMs ?? 0);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("AI Gateway request failed.");
  }
  if (!args.env.AI_GATEWAY_API_KEY?.trim()) throw new ModelUnavailableError(model);
  onAttempt(model);
  const timeoutMs = args.policy?.timeoutMs;
  const controller = timeoutMs && timeoutMs > 0 ? new AbortController() : undefined;
  const timer =
    controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  try {
    const response = await (args.fetchImpl ?? fetch)(cloudflareChatCompletionsUrl(args.env), {
      method: "POST",
      headers: gatewayHeaders(args.env, args.policy),
      body: JSON.stringify({ model, messages: args.messages, ...responseFormat }),
      signal: controller?.signal,
    });
    if (!response.ok) throw new Error(`AI Gateway returned ${response.status}.`);
    return readModelContent(await response.json());
  } finally {
    if (timer) clearTimeout(timer);
  }
}
