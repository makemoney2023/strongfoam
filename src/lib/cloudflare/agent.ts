import { Agent } from "agents";
import {
  AI_GATEWAY_ID,
  completeWithWorkersAi,
  type ChatMessage,
} from "@/lib/cloudflare/gateway";

export type StrongfoamAgentState = {
  drafts: number;
  lastModel: string;
};

type AgentEnv = {
  AI: {
    run: (
      model: string,
      input: { messages: ChatMessage[] },
      options: { gateway: { id: string } },
    ) => Promise<unknown>;
  };
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_MODEL?: string;
};

export class StrongfoamAgent extends Agent<AgentEnv, StrongfoamAgentState> {
  initialState: StrongfoamAgentState = { drafts: 0, lastModel: "" };

  async draft(input: { model: string; messages: ChatMessage[] }): Promise<string> {
    const content = await completeWithWorkersAi({
      ai: this.env.AI,
      model: input.model || this.env.AI_GATEWAY_MODEL || "",
      messages: input.messages,
      gatewayId: this.env.AI_GATEWAY_ID || AI_GATEWAY_ID,
    });
    this.setState({
      drafts: this.state.drafts + 1,
      lastModel: input.model,
    });
    return content;
  }
}
