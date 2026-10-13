import type { AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import type { AgentNamespace } from "@/lib/cloudflare/agent-session";
import type { WorkersAi } from "@/lib/cloudflare/gateway";
import type { ObjectBucket } from "@/lib/cloudflare/objects";
import type { RateLimitDb } from "@/lib/cloudflare/rate-limit";
import type { FollowupBinding } from "@/lib/ops/proposal-followups";

export type MarkdownConversion = {
  toMarkdown?: (files: Array<{ name: string; blob: Blob }>) => Promise<
    Array<{ data?: string; error?: string }>
  >;
};

export type JobQueueBinding = {
  send(message: { kind: string; data?: Record<string, unknown> }): Promise<void>;
};

export type EmailBinding = {
  send(message: {
    to: string[];
    from: string;
    subject: string;
    text: string;
  }): Promise<{ messageId?: string } | void>;
};

export type CloudflareBindings = {
  DB?: RateLimitDb;
  FILES?: ObjectBucket;
  JOBS?: JobQueueBinding;
  EMAIL?: EmailBinding;
  EMAIL_FROM?: string;
  STRONGFOAM_AGENT?: AgentNamespace;
  AI?: WorkersAi & MarkdownConversion;
  AI_USAGE?: AiUsageDataset;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_MODEL?: string;
  AI_GATEWAY_SMALL_MODEL?: string;
  AI_GATEWAY_FALLBACK_MODEL?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  PROPOSAL_FOLLOWUPS?: FollowupBinding;
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
