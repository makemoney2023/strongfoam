import { describe, expect, it } from "vitest";
import { handleLeadPost } from "@/app/api/leads/route";

describe("POST /api/leads", () => {
  it("returns 429 when rate limited", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async () => ({ ok: false, error: "rate_limited" }),
      },
    );
    expect(response.status).toBe(429);
  });

  it("returns 400 on spam or invalid payloads", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async () => ({ ok: false, error: "invalid" }),
      },
    );
    expect(response.status).toBe(400);
  });

  it("returns thanksPath on success", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async () => ({
          ok: true,
          leadId: "lead-1",
          thanksPath: "/request-estimate/thanks?lid=lead-1&k=abc",
          duplicate: false,
        }),
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      thanksPath: "/request-estimate/thanks?lid=lead-1&k=abc",
    });
  });

  it("passes the parsed body and forwarded IP through to createLead", async () => {
    const calls: Array<{ body: unknown; ip: string }> = [];
    await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "x-forwarded-for": "9.9.9.9" },
        body: JSON.stringify({ hello: "world" }),
      }),
      {
        createLead: async (args) => {
          calls.push({ body: args.body, ip: args.ip });
          return { ok: false, error: "invalid" };
        },
      },
    );

    expect(calls).toEqual([{ body: { hello: "world" }, ip: "9.9.9.9" }]);
  });

  it("falls back to 127.0.0.1 when there is no forwarded-for header", async () => {
    const calls: string[] = [];
    await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      {
        createLead: async (args) => {
          calls.push(args.ip);
          return { ok: false, error: "invalid" };
        },
      },
    );

    expect(calls).toEqual(["127.0.0.1"]);
  });

  it("treats an unparsable body as null rather than throwing", async () => {
    const calls: unknown[] = [];
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: "not json",
      }),
      {
        createLead: async (args) => {
          calls.push(args.body);
          return { ok: false, error: "invalid" };
        },
      },
    );

    expect(calls).toEqual([null]);
    expect(response.status).toBe(400);
  });
});
