import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyCalendlyEvent,
  verifyCalendlySignature,
  type CalendlyLeadStore,
} from "@/lib/leads/calendly";
import type { StoredLead } from "@/lib/leads/create-lead";

function signatureHeader(payload: string, key: string, t = "1700000000000") {
  const v1 = createHmac("sha256", key).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyCalendlySignature", () => {
  it("accepts a valid v1 signature", () => {
    const payload = "{\"ok\":true}";
    const signingKey = "cal-secret";

    expect(
      verifyCalendlySignature({
        payload,
        header: signatureHeader(payload, signingKey),
        signingKey,
      }),
    ).toBe(true);
  });

  it("rejects malformed and invalid signatures without throwing", () => {
    const args = {
      payload: "{\"ok\":true}",
      signingKey: "cal-secret",
    };

    expect(verifyCalendlySignature({ ...args, header: "" })).toBe(false);
    expect(
      verifyCalendlySignature({
        ...args,
        header: "t=1700000000000,v1=deadbeef",
      }),
    ).toBe(false);
  });
});

describe("applyCalendlyEvent", () => {
  it("maps created and canceled events onto the latest matching lead", async () => {
    const lead: StoredLead = {
      id: "lead-1",
      createdAt: 1_700_000_000_000,
      status: "qualified",
      bookingStatus: "offered",
      notifyStatus: "sent",
      email: "alex@gc.example",
      idempotencyKey: "abc",
    };
    const lookups: Array<{ email: string; sinceMs: number }> = [];
    const updates: Array<{
      id: string;
      status: "booked" | "canceled";
      inviteeUri: string;
    }> = [];
    const store: CalendlyLeadStore = {
      async findLatestByEmailSince(email, sinceMs) {
        lookups.push({ email, sinceMs });
        return lead;
      },
      async updateBooking(id, status, inviteeUri) {
        updates.push({ id, status, inviteeUri });
      },
      async insertUnmatched() {},
    };
    const now = 1_700_000_000_000;

    await applyCalendlyEvent({
      event: "invitee.created",
      email: lead.email,
      inviteeUri: "https://calendly.com/invitees/1",
      store,
      now,
    });
    await applyCalendlyEvent({
      event: "invitee.canceled",
      email: lead.email,
      inviteeUri: "https://calendly.com/invitees/1",
      store,
      now,
    });

    expect(lookups).toEqual([
      { email: lead.email, sinceMs: now - 30 * 24 * 60 * 60 * 1000 },
      { email: lead.email, sinceMs: now - 30 * 24 * 60 * 60 * 1000 },
    ]);
    expect(updates).toEqual([
      {
        id: lead.id,
        status: "booked",
        inviteeUri: "https://calendly.com/invitees/1",
      },
      {
        id: lead.id,
        status: "canceled",
        inviteeUri: "https://calendly.com/invitees/1",
      },
    ]);
  });

  it("records unknown emails as unmatched instead of throwing", async () => {
    const unmatched: unknown[] = [];
    const store: CalendlyLeadStore = {
      async findLatestByEmailSince() {
        return null;
      },
      async updateBooking() {
        throw new Error("should not update an unmatched event");
      },
      async insertUnmatched(payload) {
        unmatched.push(payload);
      },
    };

    await expect(
      applyCalendlyEvent({
        event: "invitee.created",
        email: "unknown@example.com",
        inviteeUri: "https://calendly.com/invitees/2",
        store,
        now: 1_700_000_000_000,
      }),
    ).resolves.toBeUndefined();
    expect(unmatched).toEqual([
      {
        event: "invitee.created",
        email: "unknown@example.com",
        inviteeUri: "https://calendly.com/invitees/2",
      },
    ]);
  });

  it("ignores unrelated event names", async () => {
    let touchedStore = false;
    const store: CalendlyLeadStore = {
      async findLatestByEmailSince() {
        touchedStore = true;
        return null;
      },
      async updateBooking() {
        touchedStore = true;
      },
      async insertUnmatched() {
        touchedStore = true;
      },
    };

    await applyCalendlyEvent({
      event: "routing_form_submission.created",
      email: "alex@gc.example",
      inviteeUri: "https://calendly.com/invitees/3",
      store,
      now: 1_700_000_000_000,
    });

    expect(touchedStore).toBe(false);
  });
});
