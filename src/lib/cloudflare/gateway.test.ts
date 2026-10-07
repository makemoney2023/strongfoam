import { describe, expect, it, vi } from "vitest";
import {
  AI_GATEWAY_ID,
  CLOUDFLARE_ACCOUNT_ID,
  WORKERS_AI_MODEL,
  cloudflareChatCompletionsUrl,
  compatModelName,
  completeWithWorkersAi,
  readModelContent,
} from "@/lib/cloudflare/gateway";

describe("Cloudflare AI Gateway", () => {
  it("builds the Abracadabra gateway URL", () => {
    expect(cloudflareChatCompletionsUrl({})).toBe(
      `https://gateway.ai.cloudflare.com/v1/${CLOUDFLARE_ACCOUNT_ID}/${AI_GATEWAY_ID}/compat/chat/completions`,
    );
  });

  it("prefixes Workers AI models for the compat endpoint", () => {
    expect(compatModelName("@cf/meta/llama")).toBe("workers-ai/@cf/meta/llama");
    expect(compatModelName("test-model")).toBe("test-model");
  });

  it("reads chat content from Workers AI and OpenAI-shaped payloads", () => {
    expect(readModelContent({ response: "  hello " })).toBe("hello");
    expect(
      readModelContent({ choices: [{ message: { content: "json" } }] }),
    ).toBe("json");
    expect(readModelContent(null)).toBe("");
  });

  it("sends the draft through the named gateway", async () => {
    const run = vi.fn(async () => ({ response: "{\"ok\":true}" }));
    const content = await completeWithWorkersAi({
      ai: { run },
      model: "test-model",
      messages: [{ role: "user", content: "summarize" }],
    });
    expect(content).toBe("{\"ok\":true}");
    expect(run).toHaveBeenCalledWith(
      WORKERS_AI_MODEL,
      { messages: [{ role: "user", content: "summarize" }] },
      { gateway: { id: AI_GATEWAY_ID } },
    );
  });
});
