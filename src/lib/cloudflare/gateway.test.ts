import { describe, expect, it, vi } from "vitest";
import {
  AI_GATEWAY_ID,
  CLOUDFLARE_ACCOUNT_ID,
  ModelUnavailableError,
  WORKERS_AI_MODEL,
  cloudflareChatCompletionsUrl,
  compatModelName,
  completeThroughGateway,
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

  const messages = [{ role: "user" as const, content: "summarize" }];

  it("runs a Workers AI model through the named gateway in JSON mode", async () => {
    const run = vi.fn(async () => ({ response: "{\"ok\":true}" }));
    const content = await completeThroughGateway({
      ai: { run },
      env: {},
      model: WORKERS_AI_MODEL,
      messages,
      json: true,
    });
    expect(content).toBe("{\"ok\":true}");
    expect(run).toHaveBeenCalledWith(
      WORKERS_AI_MODEL,
      { messages, response_format: { type: "json_object" } },
      { gateway: { id: AI_GATEWAY_ID } },
    );
  });

  it("reads a structured Workers AI JSON response", async () => {
    const run = vi.fn(async () => ({ response: { ok: true } }));
    const content = await completeThroughGateway({
      ai: { run },
      env: {},
      model: WORKERS_AI_MODEL,
      messages,
      json: true,
    });
    expect(JSON.parse(content)).toEqual({ ok: true });
  });

  it("sends another provider's model to the gateway without swapping it", async () => {
    const run = vi.fn();
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    const content = await completeThroughGateway({
      ai: { run },
      env: { AI_GATEWAY_API_KEY: "gateway-token" },
      model: "openai/gpt-5-mini",
      messages,
      json: true,
      fetchImpl,
    });
    expect(content).toBe("{}");
    expect(run).not.toHaveBeenCalled();
    const [, init] = vi.mocked(fetchImpl).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("openai/gpt-5-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("fails with model-unavailable instead of using another model", async () => {
    const run = vi.fn();
    await expect(
      completeThroughGateway({ ai: { run }, env: {}, model: "openai/gpt-5-mini", messages }),
    ).rejects.toBeInstanceOf(ModelUnavailableError);
    await expect(
      completeThroughGateway({ ai: { run }, env: {}, model: " ", messages }),
    ).rejects.toBeInstanceOf(ModelUnavailableError);
    expect(run).not.toHaveBeenCalled();
  });

  it("fails when the gateway rejects the request", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 502 })) as unknown as typeof fetch;
    await expect(
      completeThroughGateway({
        ai: { run: vi.fn() },
        env: { AI_GATEWAY_API_KEY: "gateway-token" },
        model: "openai/gpt-5-mini",
        messages,
        fetchImpl,
      }),
    ).rejects.toThrow();
  });
});
