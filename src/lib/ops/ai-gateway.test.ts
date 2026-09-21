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
    const result = await requestJobAi({ pack, purpose: "summary", fetchImpl });
    expect(result).toEqual({ status: "disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses a deterministic demo draft whose citations are in the pack", async () => {
    process.env.OPS_DEMO = "1";
    const fetchImpl = vi.fn();
    const result = await requestJobAi({ pack, purpose: "daily_report", fetchImpl });
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
    const fetchImpl = vi.fn(async () =>
      new Response(
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
      ),
    );
    const result = await requestJobAi({
      pack,
      purpose: "summary",
      fetchImpl,
    });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.bullets.map((bullet) => bullet.text)).toEqual(["Real task."]);
    expect(result.provider).toBe("vercel-ai-gateway");
    expect(result.model).toBe("test-model");
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.messages[0].content).toContain("what is missing");
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
      purpose: "daily_report",
      fetchImpl,
    });
    expect(result).toEqual({
      status: "failed",
      message: "The daily report could not be drafted.",
    });
  });
});
