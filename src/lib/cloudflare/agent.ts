import { Agent } from "agents";
import type { AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import {
  completeThroughGateway,
  type GatewayPolicy,
  type WorkersAi,
} from "@/lib/cloudflare/gateway";
import { gatewayMetadata, isAiTask, modelForTask } from "@/lib/cloudflare/model-routing";
import {
  finishAgentRun,
  startAgentRun,
  type AgentDraftInput,
  type StrongfoamAgentState,
} from "@/lib/cloudflare/agent-session";

type AgentEnv = {
  AI: WorkersAi;
  AI_USAGE?: AiUsageDataset;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_API_KEY?: string;
  AI_GATEWAY_MODEL?: string;
  AI_GATEWAY_SMALL_MODEL?: string;
  AI_GATEWAY_FALLBACK_MODEL?: string;
};

export class StrongfoamAgent extends Agent<AgentEnv, StrongfoamAgentState> {
  initialState: StrongfoamAgentState = { runs: [] };

  async draft(input: AgentDraftInput): Promise<string> {
    this.setState(
      startAgentRun(this.state, {
        runId: input.runId,
        purpose: input.purpose,
        at: new Date().toISOString(),
      }),
    );
    try {
      const content = await completeThroughGateway({
        ai: this.env.AI,
        env: {
          AI_GATEWAY_ID: this.env.AI_GATEWAY_ID,
          AI_GATEWAY_ACCOUNT_ID: this.env.AI_GATEWAY_ACCOUNT_ID,
          AI_GATEWAY_API_KEY: this.env.AI_GATEWAY_API_KEY,
          AI_GATEWAY_MODEL: this.env.AI_GATEWAY_MODEL,
          AI_GATEWAY_SMALL_MODEL: this.env.AI_GATEWAY_SMALL_MODEL,
          AI_GATEWAY_FALLBACK_MODEL: this.env.AI_GATEWAY_FALLBACK_MODEL,
        },
        model: input.model,
        messages: input.messages,
        json: input.json,
        policy: input.policy ?? defaultDraftPolicy(input, this.env),
        usage: {
          dataset: this.env.AI_USAGE,
          organizationId: input.organizationId ?? "unknown",
          purpose: input.purpose,
        },
      });
      this.setState(
        finishAgentRun(this.state, input.runId, "completed", new Date().toISOString()),
      );
      return content;
    } catch (error) {
      this.setState(
        finishAgentRun(this.state, input.runId, "failed", new Date().toISOString()),
      );
      throw error;
    }
  }
}

function defaultDraftPolicy(
  input: AgentDraftInput,
  env: AgentEnv,
): GatewayPolicy {
  const task = isAiTask(input.purpose) ? input.purpose : "summary";
  const route = modelForTask(task, {
    AI_GATEWAY_MODEL: env.AI_GATEWAY_MODEL,
    AI_GATEWAY_SMALL_MODEL: env.AI_GATEWAY_SMALL_MODEL,
    AI_GATEWAY_FALLBACK_MODEL: env.AI_GATEWAY_FALLBACK_MODEL,
  });
  return {
    metadata: gatewayMetadata({
      purpose: input.purpose,
      org: input.organizationId,
    }),
    cache: { skip: true },
    timeoutMs: route.timeoutMs,
    maxAttempts: route.maxAttempts,
    retryDelayMs: route.retryDelayMs,
    backoff: route.backoff,
    fallbackModel: route.fallbackModel,
  };
}
