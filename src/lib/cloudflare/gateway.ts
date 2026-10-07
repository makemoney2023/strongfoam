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

type WorkersAi = {
  run: (
    model: string,
    input: { messages: ChatMessage[] },
    options: { gateway: { id: string } },
  ) => Promise<unknown>;
};

export async function completeWithWorkersAi(args: {
  ai: WorkersAi;
  model: string;
  messages: ChatMessage[];
  gatewayId?: string;
}): Promise<string> {
  const model = args.model.startsWith("@cf/") ? args.model : WORKERS_AI_MODEL;
  const result = await args.ai.run(
    model,
    { messages: args.messages },
    { gateway: { id: args.gatewayId?.trim() || AI_GATEWAY_ID } },
  );
  return readModelContent(result);
}
