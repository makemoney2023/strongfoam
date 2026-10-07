export const CLOUDFLARE_ACCOUNT_ID = "6f6959ecba86d1de4d6cf6aa0b34528d";
export const AI_GATEWAY_ID = "strongfoam";
export const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type GatewayEnv = Record<string, string | undefined>;

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

export function gatewayHeaders(env: GatewayEnv): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = env.AI_GATEWAY_API_KEY?.trim();
  if (apiKey) headers["cf-aig-authorization"] = `Bearer ${apiKey}`;
  return headers;
}

export type WorkersAi = {
  run: (
    model: string,
    input: { messages: ChatMessage[]; response_format?: { type: "json_object" } },
    options: { gateway: { id: string } },
  ) => Promise<unknown>;
};

export class ModelUnavailableError extends Error {
  constructor(model: string) {
    super(`model-unavailable: ${model || "no model configured"}`);
    this.name = "ModelUnavailableError";
  }
}

export async function completeThroughGateway(args: {
  ai?: WorkersAi;
  env: GatewayEnv;
  model: string;
  messages: ChatMessage[];
  json?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const model = args.model.trim();
  if (!model) throw new ModelUnavailableError(model);
  const responseFormat = args.json ? { response_format: { type: "json_object" as const } } : {};
  if (model.startsWith("@cf/")) {
    if (!args.ai) throw new ModelUnavailableError(model);
    const result = await args.ai.run(
      model,
      { messages: args.messages, ...responseFormat },
      { gateway: { id: args.env.AI_GATEWAY_ID?.trim() || AI_GATEWAY_ID } },
    );
    return readModelContent(result);
  }
  if (!args.env.AI_GATEWAY_API_KEY?.trim()) throw new ModelUnavailableError(model);
  const response = await (args.fetchImpl ?? fetch)(cloudflareChatCompletionsUrl(args.env), {
    method: "POST",
    headers: gatewayHeaders(args.env),
    body: JSON.stringify({ model, messages: args.messages, ...responseFormat }),
  });
  if (!response.ok) throw new Error(`AI Gateway returned ${response.status}.`);
  return readModelContent(await response.json());
}
