import { describe, expect, it, vi } from "vitest";
import {
  createLead,
  type LeadStore,
  type Mailer,
  type StoredLead,
} from "@/lib/leads/create-lead";
import { MemoryRateLimiter, type RateLimiter } from "@/lib/leads/rate-limit";

class MemoryStore implements LeadStore {
  rows: StoredLead[] = [];

  constructor(private readonly now = Date.now()) {}

  async findByIdempotencyKey(key: string) {
    return this.rows.find((row) => row.idempotencyKey === key) ?? null;
  }

  async insert(
    lead: Omit<StoredLead, "id" | "createdAt"> & { payload: unknown },
  ) {
    const row: StoredLead = {
      ...lead,
      id: `lead-${this.rows.length + 1}`,
      createdAt: this.now,
    };
    this.rows.push(row);
    return row;
  }

  async updateNotifyStatus(
    id: string,
    status: StoredLead["notifyStatus"],
  ) {
    const row = this.rows.find((item) => item.id === id);
    if (row) row.notifyStatus = status;
  }
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    projectType: "commercial_ici",
    city: "Kitchener",
    province: "ON",
    services: ["spray-foam"],
    role: "gc",
    timeline: "0_3_months",
    drawingsReady: "no",
    company: "Acme",
    companyWebsite: "",
    startedAt: Date.now() - 9000,
    draftId: "11111111-1111-4111-8111-111111111111",
    uploadPaths: [],
    firstName: "Alex",
    lastName: "Lee",
    email: "alex@gc.example",
    phone: "519-555-0100",
    consent: true,
    ...overrides,
  };
}

function mailer(): Mailer {
  return {
    sendEstimating: vi.fn().mockResolvedValue(undefined),
    sendVisitor: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createLead", () => {
  it("inserts a qualified lead, mails, and returns a signed thanks path", async () => {
    const now = Date.now();
    const store = new MemoryStore(now);
    const messages = mailer();

    const result = await createLead({
      body: body({ startedAt: now - 9000 }),
      ip: "1.1.1.1",
      now,
      limiter: new MemoryRateLimiter(),
      store,
      mailer: messages,
      thanksSecret: "test-secret-test-secret-test-secret",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(false);
    expect(store.rows[0]?.status).toBe("qualified");
    expect(store.rows[0]?.bookingStatus).toBe("offered");
    expect(store.rows[0]?.notifyStatus).toBe("sent");
    expect(result.thanksPath).toMatch(
      /^\/request-estimate\/thanks\?lid=lead-1&k=[a-f0-9]{64}$/,
    );
    expect(messages.sendEstimating).toHaveBeenCalledOnce();
    expect(messages.sendVisitor).toHaveBeenCalledOnce();
  });

  it("keeps the row and returns ok when mail fails", async () => {
    const now = Date.now();
    const store = new MemoryStore(now);
    const messages: Mailer = {
      sendEstimating: vi.fn().mockRejectedValue(new Error("resend down")),
      sendVisitor: vi.fn().mockResolvedValue(undefined),
    };

    const result = await createLead({
      body: body({ startedAt: now - 9000 }),
      ip: "1.1.1.1",
      now,
      limiter: new MemoryRateLimiter(),
      store,
      mailer: messages,
      thanksSecret: "test-secret-test-secret-test-secret",
    });

    expect(result.ok).toBe(true);
    expect(store.rows[0]?.notifyStatus).toBe("failed");
  });

  it("reuses a duplicate within 10 minutes without mailing again", async () => {
    const now = Date.now();
    const store = new MemoryStore(now);
    const messages = mailer();
    const args = {
      body: body({ startedAt: now - 9000 }),
      ip: "1.1.1.1",
      now,
      limiter: new MemoryRateLimiter(),
      store,
      mailer: messages,
      thanksSecret: "test-secret-test-secret-test-secret",
    };

    const first = await createLead(args);
    const second = await createLead(args);

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.leadId).toBe(first.leadId);
    }
    expect(messages.sendEstimating).toHaveBeenCalledOnce();
    expect(messages.sendVisitor).toHaveBeenCalledOnce();
    expect(store.rows).toHaveLength(1);
  });

  it("reads the honeypot from the raw body after parsing", async () => {
    const now = Date.now();
    const store = new MemoryStore(now);
    const messages = mailer();

    const result = await createLead({
      body: body({
        companyWebsite: "https://spam.example",
        startedAt: now - 9000,
      }),
      ip: "1.1.1.1",
      now,
      limiter: new MemoryRateLimiter(),
      store,
      mailer: messages,
      thanksSecret: "test-secret-test-secret-test-secret",
    });

    expect(result).toEqual({ ok: false, error: "spam" });
    expect(store.rows).toHaveLength(0);
  });

  it("rejects unowned upload paths", async () => {
    const now = Date.now();
    const store = new MemoryStore(now);

    const result = await createLead({
      body: body({
        startedAt: now - 9000,
        uploadPaths: ["leads/a-different-draft/plan.pdf"],
      }),
      ip: "1.1.1.1",
      now,
      limiter: new MemoryRateLimiter(),
      store,
      mailer: mailer(),
      thanksSecret: "test-secret-test-secret-test-secret",
    });

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(store.rows).toHaveLength(0);
  });

  it("returns rate_limited before parsing or storing", async () => {
    const limiter: RateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };
    const store = new MemoryStore();

    const result = await createLead({
      body: null,
      ip: "1.1.1.1",
      limiter,
      store,
      mailer: mailer(),
      thanksSecret: "test-secret-test-secret-test-secret",
    });

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(store.rows).toHaveLength(0);
  });
});
