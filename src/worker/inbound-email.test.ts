import { describe, expect, it, vi } from "vitest";
import { handleRoutingEmail, type RoutingMessage } from "@/worker/inbound-email";
import type { InboundProposal, InboundRepository } from "@/lib/leads/inbound-mail";

function message() {
  const raw = [
    "From: Ada Lovelace <ada@example.com>",
    "To: estimates@strongfoam.com",
    "Subject: Warehouse roof",
    "Message-ID: <abc@mail>",
    "",
    "Please quote the warehouse roof.",
  ].join("\n");
  const reply = vi.fn();
  const forward = vi.fn();
  const setReject = vi.fn();
  const inbound: RoutingMessage = {
    from: "ada@example.com",
    to: "estimates@strongfoam.com",
    headers: { get: () => null },
    raw,
    reply,
    forward,
    setReject,
  };
  return { inbound, reply, forward, setReject };
}

function repo(): InboundRepository {
  const rows = new Map<string, InboundProposal>();
  return {
    async findProposal(_organizationId, dedupeKey) {
      return rows.get(dedupeKey) ?? null;
    },
    async insertProposal(proposal) {
      if (rows.has(proposal.dedupeKey)) return "duplicate";
      rows.set(proposal.dedupeKey, proposal);
      return "created";
    },
    async saveProposal(proposal) {
      rows.set(proposal.dedupeKey, proposal);
    },
    async findLead() {
      return null;
    },
    async insertLead() {
      return { id: "lead-1" };
    },
  };
}

describe("routing email handler", () => {
  it("stores the proposal and does not reply, forward, reject, or send", async () => {
    const { inbound, reply, forward, setReject } = message();
    const send = vi.fn();
    const stored = await handleRoutingEmail(inbound, { repo: repo(), send });
    expect(stored?.fromEmail).toBe("ada@example.com");
    expect(stored?.sendsToCustomer).toBe(false);
    expect(reply).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
    expect(setReject).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("enqueues metadata after the bytes are stored and does not send", async () => {
    const { inbound, reply } = message();
    const send = vi.fn();
    const enqueue = vi.fn(async (proposal: InboundProposal) => {
      expect(proposal.attachments.every((file) => !("bytes" in file))).toBe(true);
      return true;
    });
    const putObject = vi.fn(async () => undefined);
    await handleRoutingEmail(
      {
        ...inbound,
        raw: [
          "From: Ada Lovelace <ada@example.com>",
          "To: estimates@strongfoam.com",
          "Subject: Drawings",
          "Message-ID: <draw@mail>",
          'Content-Type: multipart/mixed; boundary="line"',
          "",
          "--line",
          "Content-Type: text/plain",
          "",
          "Please quote the roof.",
          "--line",
          "Content-Type: application/pdf",
          'Content-Disposition: attachment; filename="plan.pdf"',
          "Content-Transfer-Encoding: base64",
          "",
          Buffer.from("pdf").toString("base64"),
          "--line--",
        ].join("\n"),
      },
      { repo: repo(), enqueue, putObject, send },
    );
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
});
