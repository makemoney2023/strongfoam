import type { ChatMessage } from "@/lib/cloudflare/gateway";
import type { ObjectBucket } from "@/lib/cloudflare/objects";
import type { RateLimitDb } from "@/lib/cloudflare/rate-limit";

export type JobQueueBinding = {
  send(message: { kind: string; data?: Record<string, unknown> }): Promise<void>;
};

export type StrongfoamAgentBinding = {
  idFromName(name: string): unknown;
  get(id: unknown): {
    draft(input: { model: string; messages: ChatMessage[] }): Promise<string>;
  };
};

export type CloudflareBindings = {
  DB?: RateLimitDb;
  FILES?: ObjectBucket;
  JOBS?: JobQueueBinding;
  STRONGFOAM_AGENT?: StrongfoamAgentBinding;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_MODEL?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};

export async function getPlatform(): Promise<CloudflareBindings | null> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return env as CloudflareBindings;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") return null;
    throw error instanceof Error
      ? error
      : new Error("Cloudflare bindings are unavailable.");
  }
}

export async function publishQueuedJob(message: {
  kind: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const platform = await getPlatform();
  if (!platform?.JOBS) return;
  await platform.JOBS.send(message);
}
