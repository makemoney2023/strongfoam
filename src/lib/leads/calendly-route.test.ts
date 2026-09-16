import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { handleCalendlyPost } from "@/app/api/webhooks/calendly/route";
import type { CalendlyLeadStore } from "@/lib/leads/calendly";
import type { StoredLead } from "@/lib/leads/create-lead";

function signatureHeader(payload: string, key: string, t = "1700000000000") {
  const v1 = createHmac("sha256", key).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function fakeStore(overrides: Partial<CalendlyLeadStore> = {}): CalendlyLeadStore {
  return {
    async findLatestByEmailSince() {
      return null;
    },
    async updateBooking() {},
    async insertUnmatched() {},
    ...overrides,
  };
}

describe("POST /api/webhooks/calendly", () => {
  it("returns 401 on a bad signature", async () => {
    const payload = JSON.stringify({
      event: "invitee.created",
      payload: { email: "alex@gc.example", uri: "https://calendly.com/invitees/1" },
    });

    const response = await handleCalendlyPost(
      new Request("http://localhost/api/webhooks/calendly", {
        method: "POST",
        headers: { "calendly-webhook-signature": "t=1700000000000,v1=deadbeef" },
        body: payload,
      }),
      { signingKey: "cal-secret", store: fakeStore() },
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the signature header is missing", async () => {
    const response = await handleCalendlyPost(
      new Request("http://localhost/api/webhooks/calendly", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { signingKey: "cal-secret", store: fakeStore() },
    );

    expect(response.status).toBe(401);
  });

  it("returns 200 and books the matching lead on a valid signature", async () => {
    const signingKey = "cal-secret";
    const lead: StoredLead = {
      id: "lead-1",
      createdAt: 1_700_000_000_000,
      status: "qualified",
      bookingStatus: "offered",
      notifyStatus: "sent",
      email: "alex@gc.example",
      idempotencyKey: "abc",
    };
    const updates: Array<{ id: string; status: string; inviteeUri: string }> = [];
    const payload = JSON.stringify({
      event: "invitee.created",
      payload: { email: lead.email, uri: "https://calendly.com/invitees/1" },
    });

    const response = await handleCalendlyPost(
      new Request("http://localhost/api/webhooks/calendly", {
        method: "POST",
        headers: {
          "calendly-webhook-signature": signatureHeader(payload, signingKey),
        },
        body: payload,
      }),
      {
        signingKey,
        now: 1_700_000_000_000,
        store: fakeStore({
          async findLatestByEmailSince() {
            return lead;
          },
          async updateBooking(id, status, inviteeUri) {
            updates.push({ id, status, inviteeUri });
          },
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      { id: "lead-1", status: "booked", inviteeUri: "https://calendly.com/invitees/1" },
    ]);
  });

  it("returns 200 and records unmatched emails instead of failing", async () => {
    const signingKey = "cal-secret";
    const unmatched: unknown[] = [];
    const payload = JSON.stringify({
      event: "invitee.created",
      payload: { email: "unknown@example.com", uri: "https://calendly.com/invitees/2" },
    });

    const response = await handleCalendlyPost(
      new Request("http://localhost/api/webhooks/calendly", {
        method: "POST",
        headers: {
          "calendly-webhook-signature": signatureHeader(payload, signingKey),
        },
        body: payload,
      }),
      {
        signingKey,
        store: fakeStore({
          async insertUnmatched(p) {
            unmatched.push(p);
          },
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(unmatched).toHaveLength(1);
  });
});
