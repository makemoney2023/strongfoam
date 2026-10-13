import { completeThroughGateway } from "@/lib/cloudflare/gateway";
import type { AiUsageDataset } from "@/lib/cloudflare/ai-usage";
import type { WorkersAi } from "@/lib/cloudflare/gateway";
import { gatewayMetadata, modelForTask } from "@/lib/cloudflare/model-routing";
import { classifyProposalReply, readReplyLabel, type ReplyClass } from "@/lib/ops/proposal-followups";

type ReplyEnv = {
  AI_GATEWAY_MODEL?: string;
  AI_GATEWAY_SMALL_MODEL?: string;
  AI_GATEWAY_FALLBACK_MODEL?: string;
  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};

export async function classifyInboundReply(input: {
  subject: string;
  text: string;
  ai?: WorkersAi;
  env?: ReplyEnv;
  dataset?: AiUsageDataset;
  organizationId: string;
}): Promise<{ classification: ReplyClass; quote: string }> {
  const suggested = input.ai ? await suggestedLabel(input) : null;
  return classifyProposalReply({
    subject: input.subject,
    text: input.text,
    modelLabel: suggested,
  });
}

async function suggestedLabel(input: {
  subject: string;
  text: string;
  ai?: WorkersAi;
  env?: ReplyEnv;
  dataset?: AiUsageDataset;
  organizationId: string;
}): Promise<string | null> {
  const env = input.env ?? {};
  const route = modelForTask("classify", env);
  try {
    const content = await completeThroughGateway({
      ai: input.ai,
      env,
      model: route.model,
      json: true,
      messages: [
        {
          role: "system",
          content:
            'Classify the customer reply as accepted, question, lost, or other. Return JSON {"label":"accepted"|"question"|"lost"|"other"}.',
        },
        {
          role: "user",
          content: `${input.subject}\n${input.text}`.slice(0, 4000),
        },
      ],
      policy: {
        metadata: gatewayMetadata({ purpose: "classify", org: input.organizationId }),
        cache: { skip: true },
        timeoutMs: route.timeoutMs,
        maxAttempts: route.maxAttempts,
        retryDelayMs: route.retryDelayMs,
        backoff: route.backoff,
        fallbackModel: route.fallbackModel,
      },
      usage: {
        dataset: input.dataset,
        organizationId: input.organizationId,
        purpose: "classify",
      },
    });
    return readReplyLabel(content);
  } catch (error) {
    console.error("Proposal reply classification fell back to keywords.", error);
    return null;
  }
}
