import { Agent } from "agents";
import {
  completeThroughGateway,
  type WorkersAi,
} from "@/lib/cloudflare/gateway";
import {
  finishAgentRun,
  startAgentRun,
  type AgentDraftInput,
  type StrongfoamAgentState,
} from "@/lib/cloudflare/agent-session";

type AgentEnv = {
  AI: WorkersAi;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_API_KEY?: string;
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
        },
        model: input.model,
        messages: input.messages,
        json: input.json,
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
