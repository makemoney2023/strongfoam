import { afterEach, describe, expect, it, vi } from "vitest";
import { buildJobEvidencePack } from "@/lib/ops/ai-evidence";
import { requestJobAi } from "@/lib/ops/ai-gateway";

const pack = buildJobEvidencePack({
  job: { id: "job-1", name: "Podium", status: "in_progress" },
  tasks: [
    {
      id: "task-1",
      title: "Prepare podium deck",
      status: "open",
      dueAt: null,
      plannedEndAt: null,
      createdAt: new Date("2026-09-19T12:00:00.000Z"),
    },
  ],
  fieldNotes: [],
  voiceNotes: [],
  planMarks: [],
  events: [],
  now: new Date("2026-09-19T16:00:00.000Z"),
});

const ORG = "6f1c2a3b-4d5e-4f60-8a1b-2c3d4e5f6a7b";
const JOB = "0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d";
const uuidPack = { ...pack, job: { ...pack.job, id: JOB } };

describe("job AI gateway", () => {
  const previous = {
    demo: process.env.OPS_DEMO,
    key: process.env.AI_GATEWAY_API_KEY,
    model: process.env.AI_GATEWAY_MODEL,
  };

  afterEach(() => {
    if (previous.demo === undefined) delete process.env.OPS_DEMO;
    else process.env.OPS_DEMO = previous.demo;
    if (previous.key === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previous.key;
    if (previous.model === undefined) delete process.env.AI_GATEWAY_MODEL;
    else process.env.AI_GATEWAY_MODEL = previous.model;
  });

  it("stays disabled without a gateway key and does not call the network", async () => {
    delete process.env.OPS_DEMO;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_GATEWAY_MODEL;
    const fetchImpl = vi.fn();
    const result = await requestJobAi({ pack, organizationId: ORG, purpose: "summary", fetchImpl });
    expect(result).toEqual({ status: "disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses a deterministic demo draft whose citations are in the pack", async () => {
    process.env.OPS_DEMO = "1";
    const fetchImpl = vi.fn();
    const result = await requestJobAi({ pack, organizationId: ORG, purpose: "daily_report", fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.status).toBe("demo");
    if (result.status !== "demo") return;
    expect(result.provider).toBe("demo");
    expect(result.bullets[0]?.citations).toEqual([{ kind: "task", id: "task-1" }]);
  });

  it("drops citations the evidence pack does not contain", async () => {
    delete process.env.OPS_DEMO;
    process.env.AI_GATEWAY_API_KEY = "test-key";
    process.env.AI_GATEWAY_MODEL = "test-model";
    let requestBody = "";
    const fetchImpl = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  paragraph: "Podium is moving.",
                  bullets: [
                    {
                      text: "Real task.",
                      citations: [{ kind: "task", id: "task-1" }],
                    },
                    {
                      text: "Invented.",
                      citations: [{ kind: "task", id: "nope" }],
                    },
                  ],
                  sections: { completed: [], held: [], material: [], next: [] },
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });
    const result = await requestJobAi({
      pack,
      organizationId: ORG,
      purpose: "summary",
      fetchImpl,
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.bullets.map((bullet) => bullet.text)).toEqual(["Real task."]);
    expect(result.provider).toBe("cloudflare-ai-gateway");
    expect(result.model).toBe("test-model");
    const body = JSON.parse(requestBody);
    expect(body.messages[0].content).toContain("what is missing");
  });

  it("asks the named job instance of the Strongfoam agent and keeps only cited text", async () => {
    delete process.env.OPS_DEMO;
    process.env.AI_GATEWAY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const fetchImpl = vi.fn();
    const draft = vi.fn(async () =>
      JSON.stringify({
        paragraph: "Podium is moving.",
        bullets: [
          { text: "Real task.", citations: [{ kind: "task", id: "task-1" }] },
          { text: "Invented.", citations: [{ kind: "task", id: "nope" }] },
        ],
        sections: { completed: [], held: [], material: [], next: [] },
      }),
    );
    const stub = { __unsafe_ensureInitialized: vi.fn(async () => undefined), draft };
    const agentNamespace = {
      idFromName: vi.fn((name: string) => name),
      get: vi.fn(() => stub),
    };
    const result = await requestJobAi({
      pack: { ...uuidPack },
      organizationId: ORG,
      purpose: "summary",
      fetchImpl,
      agentNamespace,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(agentNamespace.idFromName).toHaveBeenCalledWith(`org:${ORG}:job:${JOB}`);
    expect(draft).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "summary",
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        json: true,
        runId: expect.any(String),
      }),
    );
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.provider).toBe("cloudflare-agent");
    expect(result.bullets.map((bullet) => bullet.text)).toEqual(["Real task."]);
  });

  it("never uses one shared instance name", async () => {
    delete process.env.OPS_DEMO;
    process.env.AI_GATEWAY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const agentNamespace = { idFromName: vi.fn(), get: vi.fn() };
    const result = await requestJobAi({
      pack,
      organizationId: "not-a-uuid",
      purpose: "summary",
      agentNamespace,
    });
    expect(result.status).toBe("failed");
    expect(agentNamespace.idFromName).not.toHaveBeenCalled();
  });

  it("returns a failed draft when the agent reports the model is unavailable", async () => {
    delete process.env.OPS_DEMO;
    process.env.AI_GATEWAY_MODEL = "openai/gpt-5-mini";
    const stub = {
      __unsafe_ensureInitialized: vi.fn(async () => undefined),
      draft: vi.fn(async () => {
        throw new Error("model-unavailable: openai/gpt-5-mini");
      }),
    };
    const result = await requestJobAi({
      pack: uuidPack,
      organizationId: ORG,
      purpose: "daily_report",
      agentNamespace: { idFromName: (name: string) => name, get: () => stub },
    });
    expect(result).toEqual({
      status: "failed",
      message: "The daily report could not be drafted.",
    });
  });

  it("returns a failed draft when the gateway cannot be reached", async () => {
    delete process.env.OPS_DEMO;
    process.env.AI_GATEWAY_API_KEY = "test-key";
    process.env.AI_GATEWAY_MODEL = "test-model";
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await requestJobAi({
      pack,
      organizationId: ORG,
      purpose: "daily_report",
      fetchImpl,
    });
    expect(result).toEqual({
      status: "failed",
      message: "The daily report could not be drafted.",
    });
  });
});
