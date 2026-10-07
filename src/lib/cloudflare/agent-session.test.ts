import { describe, expect, it, vi } from "vitest";
import {
  agentInstanceName,
  finishAgentRun,
  namedAgent,
  startAgentRun,
  type StrongfoamAgentState,
} from "@/lib/cloudflare/agent-session";

const ORG = "6f1c2a3b-4d5e-4f60-8a1b-2c3d4e5f6a7b";
const JOB = "0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d";

describe("agent instance name", () => {
  it("names an instance by organization and record", () => {
    expect(agentInstanceName("job", ORG, JOB)).toBe(`org:${ORG}:job:${JOB}`);
    expect(agentInstanceName("opportunity", ORG, JOB)).toBe(`org:${ORG}:opportunity:${JOB}`);
    expect(agentInstanceName("estimate", ORG, JOB)).toBe(`org:${ORG}:estimate:${JOB}`);
    expect(agentInstanceName("project", ORG, JOB)).toBe(`org:${ORG}:project:${JOB}`);
  });

  it("normalizes case so one record has one instance", () => {
    expect(agentInstanceName("job", ORG.toUpperCase(), JOB)).toBe(`org:${ORG}:job:${JOB}`);
  });

  it("rejects ids that are not UUIDs", () => {
    expect(() => agentInstanceName("job", "strongfoam", JOB)).toThrow();
    expect(() => agentInstanceName("job", ORG, "job:1")).toThrow();
    expect(() => agentInstanceName("job", ORG, "")).toThrow();
  });
});

describe("agent run state", () => {
  const empty: StrongfoamAgentState = { runs: [] };

  it("tracks runs on one instance without overwriting each other", () => {
    const started = startAgentRun(
      startAgentRun(empty, { runId: "a", purpose: "summary", at: "t1" }),
      { runId: "b", purpose: "daily_report", at: "t2" },
    );
    const finished = finishAgentRun(started, "a", "completed", "t3");
    expect(finished.runs).toEqual([
      { runId: "a", purpose: "summary", status: "completed", updatedAt: "t3" },
      { runId: "b", purpose: "daily_report", status: "running", updatedAt: "t2" },
    ]);
  });

  it("stores no prompt or content", () => {
    const state = startAgentRun(empty, { runId: "a", purpose: "summary", at: "t1" });
    expect(JSON.stringify(state)).not.toMatch(/prompt|content|messages/);
  });

  it("keeps only the most recent runs", () => {
    let state = empty;
    for (let index = 0; index < 30; index += 1) {
      state = startAgentRun(state, { runId: String(index), purpose: "summary", at: "t" });
    }
    expect(state.runs).toHaveLength(20);
    expect(state.runs[0].runId).toBe("10");
  });
});

describe("named agent", () => {
  it("gets the stub by instance name and initializes it", async () => {
    const stub = { __unsafe_ensureInitialized: vi.fn(async () => undefined), draft: vi.fn() };
    const binding = {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn(() => stub),
    };
    const agent = await namedAgent(binding, "job", ORG, JOB);
    expect(binding.idFromName).toHaveBeenCalledWith(`org:${ORG}:job:${JOB}`);
    expect(stub.__unsafe_ensureInitialized).toHaveBeenCalled();
    expect(agent).toBe(stub);
  });
});
