import { describe, expect, it, vi } from "vitest";
import {
  acceptInboundProposal,
  attachmentDecision,
  decideReplySend,
  firstReplyDraft,
  inboundDedupeKey,
  keepGroundedReply,
  parseRawEmail,
  prepareInboundProposal,
  triageInbound,
  type InboundProposal,
  type InboundRepository,
  type ParsedInboundMail,
} from "@/lib/leads/inbound-mail";

const receivedAt = "2026-10-13T15:00:00.000Z";

function mail(overrides: Partial<ParsedInboundMail> = {}): ParsedInboundMail {
  return {
    messageId: "abc@mail",
    fromEmail: "ada@example.com",
    fromName: "Ada Lovelace",
    to: "estimates@strongfoam.com",
    subject: "Warehouse roof",
    text: "Please quote the spray foam for a warehouse in Windsor.",
    receivedAt,
    attachments: [],
    ...overrides,
  };
}

function memoryRepo(): InboundRepository & { leads: Array<Record<string, unknown>>; puts: string[] } {
  const proposals = new Map<string, InboundProposal>();
  const leads: Array<Record<string, unknown>> = [];
  return {
    leads,
    puts: [],
    async findProposal(_organizationId, dedupeKey) {
      return proposals.get(dedupeKey) ?? null;
    },
    async insertProposal(proposal) {
      if (proposals.has(proposal.dedupeKey)) return "duplicate";
      proposals.set(proposal.dedupeKey, proposal);
      return "created";
    },
    async saveProposal(proposal) {
      proposals.set(proposal.dedupeKey, proposal);
    },
    async findLead(idempotencyKey) {
      const lead = leads.find((item) => item.idempotencyKey === idempotencyKey);
      return lead ? { id: String(lead.id) } : null;
    },
    async insertLead(values) {
      const id = `lead-${leads.length + 1}`;
      leads.push({ ...values, id });
      return { id };
    },
  };
}

describe("inbound mail", () => {
  it("dedupes a message id and, without one, the sender subject and body", () => {
    expect(inboundDedupeKey(mail())).toBe(inboundDedupeKey(mail({ text: "different" })));
    const first = inboundDedupeKey(mail({ messageId: "" }));
    const second = inboundDedupeKey(mail({ messageId: "  ", text: "Please quote the spray foam for a warehouse in Windsor." }));
    const third = inboundDedupeKey(mail({ messageId: "", text: "A different question." }));
    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  it("stores pdf and image files and skips executables", () => {
    expect(attachmentDecision({ filename: "plan.pdf", contentType: "application/pdf", sizeBytes: 12 }).store).toBe(true);
    expect(attachmentDecision({ filename: "photo.PNG", contentType: "image/png", sizeBytes: 12 }).store).toBe(true);
    expect(attachmentDecision({ filename: "run.exe", contentType: "application/octet-stream", sizeBytes: 12 })).toEqual({
      store: false,
      reason: "type",
    });
  });

  it("keeps model facts only when the message contains them", () => {
    const triage = triageInbound(mail(), {
      intent: "estimate",
      company: "North Pier",
      phone: "(519) 555-0100",
      city: "Toronto",
      price: 1800,
      firstName: "Mallory",
    });
    expect(triage.company).toBe("");
    expect(triage.city).toBe("");
    expect(triage.phone).toBe("");
    expect(triage.firstName).toBe("Ada");
    expect(triage).not.toHaveProperty("price");
    const grounded = triageInbound(
      mail({ text: "North Pier in Windsor, call 519-555-0100, please quote the roof." }),
      { intent: "estimate", company: "North Pier", phone: "519-555-0100", city: "Windsor", price: 1800 },
    );
    expect(grounded.company).toBe("North Pier");
    expect(grounded.city).toBe("Windsor");
    expect(grounded.phone).toBe("519-555-0100");
    expect(grounded).not.toHaveProperty("price");
  });

  it("drafts a reply without a price or an approval", () => {
    const draft = firstReplyDraft({
      fromName: "Ada Lovelace",
      fromEmail: "ada@example.com",
      subject: "Warehouse roof",
      attachmentCount: 1,
    });
    expect(draft).toContain("Ada Lovelace");
    expect(draft).toContain("Warehouse roof");
    expect(draft.toLowerCase()).not.toContain("approved");
    expect(draft).not.toContain("$");
    const paraphrased = keepGroundedReply(
      `${draft.trim()} The price is $10 and the job is approved.`,
      draft,
    );
    expect(paraphrased).not.toContain("$10");
    expect(paraphrased.toLowerCase()).not.toContain("approved");
  });

  it("writes an attachment once and accepts one held lead", async () => {
    const repo = memoryRepo();
    const putObject = vi.fn(async (key: string) => {
      repo.puts.push(key);
    });
    const bytes = new Uint8Array([1, 2, 3]);
    const first = await prepareInboundProposal(
      mail({
        attachments: [{ filename: "plan.pdf", contentType: "application/pdf", bytes }],
      }),
      { repo, putObject },
    );
    expect(first.outcome).toBe("ready");
    if (first.outcome !== "ready") return;
    expect(await repo.insertProposal(first.proposal)).toBe("created");
    const second = await prepareInboundProposal(
      mail({ attachments: [{ filename: "plan.pdf", contentType: "application/pdf", bytes }] }),
      { repo, putObject },
    );
    expect(second.outcome).toBe("duplicate");
    expect(putObject).toHaveBeenCalledTimes(1);
    const accepted = await acceptInboundProposal(first.proposal, repo);
    const again = await acceptInboundProposal(
      { ...first.proposal, leadId: accepted.leadId, status: "accepted" },
      repo,
    );
    expect(again).toEqual({ leadId: accepted.leadId, created: false });
    expect(repo.leads).toHaveLength(1);
    expect(repo.leads[0]).toEqual(
      expect.objectContaining({
        notifyStatus: "held",
        sourcePath: `email:${first.proposal.dedupeKey}`,
      }),
    );
    expect(repo.leads[0]?.files).toEqual([
      { pathname: expect.stringContaining("plan.pdf") },
    ]);
  });

  it("sends the stored draft only after an administrator confirms", () => {
    const proposal = {
      ...mail(),
      organizationId: "00000000-0000-4000-8000-000000000001",
      dedupeKey: "k",
      attachments: [],
      triage: triageInbound(mail()),
      replyDraft: firstReplyDraft({
        fromName: "Ada Lovelace",
        fromEmail: "ada@example.com",
        subject: "Warehouse roof",
        attachmentCount: 0,
      }),
      status: "accepted" as const,
      leadId: "lead-1",
      sendsToCustomer: false as const,
      setsPrice: false as const,
      approves: false as const,
      requiresConfirmation: true as const,
    };
    expect(decideReplySend({ proposal, role: "administrator", confirmSend: false, from: "Strong Foam <estimates@strongfoam.com>" }).send).toBe(false);
    expect(decideReplySend({ proposal, role: "office", confirmSend: true, from: "Strong Foam <estimates@strongfoam.com>" }).send).toBe(false);
    const sent = decideReplySend({
      proposal,
      role: "administrator",
      confirmSend: true,
      from: "Strong Foam <estimates@strongfoam.com>",
    });
    expect(sent).toEqual({
      send: true,
      message: {
        to: ["ada@example.com"],
        from: "Strong Foam <estimates@strongfoam.com>",
        subject: "Re: Warehouse roof",
        text: proposal.replyDraft.trim(),
      },
    });
  });

  it("parses a plain message and a pdf part", () => {
    const raw = [
      "From: Ada Lovelace <ada@example.com>",
      "To: estimates@strongfoam.com",
      "Subject: Warehouse roof",
      "Message-ID: <abc@mail>",
      "MIME-Version: 1.0",
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
      "",
    ].join("\n");
    const parsed = parseRawEmail(raw, receivedAt);
    expect(parsed.fromEmail).toBe("ada@example.com");
    expect(parsed.text).toContain("Please quote the roof.");
    expect(parsed.attachments[0]?.filename).toBe("plan.pdf");
    expect(new TextDecoder().decode(parsed.attachments[0]?.bytes)).toBe("pdf");
  });
});
