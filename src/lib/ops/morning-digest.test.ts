import { describe, expect, it } from "vitest";
import {
  assertInternalRecipient,
  buildMorningDigest,
  optedInStaffEmails,
  staffDigestMessage,
  type DigestDraft,
  type DigestJob,
  type DigestLead,
  type DigestQuote,
} from "@/lib/ops/morning-digest";

const NOW = new Date("2026-10-13T14:00:00Z");

function lead(overrides: Partial<DigestLead> = {}): DigestLead {
  return {
    id: "lead-1",
    label: "Acme",
    workflowStatus: "new",
    nextActionDueAt: null,
    updatedAt: NOW,
    href: "/app/requests/lead-1",
    ...overrides,
  };
}

describe("morning digest", () => {
  it("collects stale leads, open quotes, at-risk jobs, and pending drafts", () => {
    const leads: DigestLead[] = [
      lead({ nextActionDueAt: new Date(NOW.getTime() - 60_000) }),
      lead({
        id: "lead-2",
        label: "Quiet",
        updatedAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000),
      }),
      lead({ id: "lead-3", label: "Fresh", updatedAt: NOW }),
      lead({ id: "lead-4", label: "Won", workflowStatus: "won", nextActionDueAt: new Date(NOW.getTime() - 60_000) }),
    ];
    const quotes: DigestQuote[] = [
      { id: "q1", estimateNumber: "E-100", status: "delivered", href: "/app/opportunities/o/estimates/e" },
      { id: "q2", estimateNumber: "E-200", status: "viewed", href: "/app/opportunities/o/estimates/e2" },
      { id: "q3", estimateNumber: "E-300", status: "accepted", href: "/app/opportunities/o/estimates/e3" },
    ];
    const jobs: DigestJob[] = [
      { id: "j1", name: "East", status: "blocked", missingDailyLog: false, href: "/app/jobs/j1" },
      { id: "j2", name: "West", status: "in_progress", missingDailyLog: true, href: "/app/jobs/j2" },
      { id: "j3", name: "North", status: "in_progress", missingDailyLog: false, href: "/app/jobs/j3" },
    ];
    const drafts: DigestDraft[] = [{ id: "d1", title: "Morning brief", kind: "morning_brief" }];
    const digest = buildMorningDigest({ now: NOW, leads, quotes, jobs, drafts });
    expect(digest.staleLeads.map((row) => row.id)).toEqual(["lead-1", "lead-2"]);
    expect(digest.quotesAwaitingDecision.map((row) => row.estimateNumber)).toEqual(["E-100", "E-200"]);
    expect(digest.atRiskJobs.map((row) => row.name)).toEqual(["East", "West"]);
    expect(digest.pendingDrafts).toEqual(drafts);
  });

  it("emails only an opted-in staff address and includes no price", () => {
    const digest = buildMorningDigest({
      now: NOW,
      leads: [lead({ nextActionDueAt: new Date(NOW.getTime() - 1000) })],
      quotes: [],
      jobs: [],
      drafts: [],
    });
    const opted = ["owner@strongfoam.com"];
    expect(assertInternalRecipient("Owner@StrongFoam.com", opted)).toBe(true);
    expect(assertInternalRecipient("customer@example.com", opted)).toBe(false);
    expect(staffDigestMessage(digest, "customer@example.com", opted)).toBeNull();
    const message = staffDigestMessage(digest, "owner@strongfoam.com", opted);
    expect(message?.to).toEqual(["owner@strongfoam.com"]);
    expect(message?.text).toContain("Stale leads");
    expect(message?.text).toContain("Quotes awaiting a decision");
    expect(message?.text).toContain("At-risk jobs");
    expect(message?.text).toContain("Pending automation drafts");
    expect(message?.text).not.toMatch(/\$\d/);
    expect(message?.text.toLowerCase()).not.toContain("customer@example.com");
    expect(
      optedInStaffEmails(
        [
          { email: "owner@strongfoam.com", optedIn: true },
          { email: "customer@example.com", optedIn: true },
          { email: "off@strongfoam.com", optedIn: false },
        ],
        ["owner@strongfoam.com", "off@strongfoam.com"],
      ),
    ).toEqual(["owner@strongfoam.com"]);
  });
});
