import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decideEstimateVersion,
  defaultApprovalRule,
  evaluateApprovalRules,
  type EstimateApproval,
} from "@/lib/ops/estimate-approvals";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const NOW = new Date("2026-09-22T12:00:00.000Z");
const OTHER_ORG = "11111111-1111-4111-8111-111111111199";
const VERSION_ID = "22222222-2222-4222-8222-222222222211";
const HASH = "hash-current";

const admin = {
  email: "admin@strongfoam.demo",
  role: "administrator" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};

function loaded(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    estimateId: "22222222-2222-4222-8222-222222222201",
    versionId: VERSION_ID,
    versionNumber: 1,
    latestVersionNumber: 1,
    contentHash: HASH,
    totalCents: 97265,
    ...overrides,
  };
}

function decide(
  overrides: Partial<Parameters<typeof decideEstimateVersion>[0]> = {},
  existing: EstimateApproval[] = [],
) {
  return decideEstimateVersion({
    actor: admin,
    expected: { estimateVersionId: VERSION_ID, contentHash: HASH },
    decision: "approved",
    comment: "Ready to propose",
    now: NOW,
    loaded: loaded(),
    rules: [],
    existing,
    claimedRuleId: "browser-rule",
    ...overrides,
  });
}

describe("estimate approvals", () => {
  it("requires an administrator and ignores a browser-supplied rule", () => {
    const denied = decide({
      actor: { ...admin, role: "office" },
    });
    expect(denied.ok).toBe(false);
    const decided = decide();
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;
    expect(decided.approval.ruleId).toBe(defaultApprovalRule(STRONG_FOAM_ORGANIZATION_ID).id);
    expect(decided.approval.ruleId).not.toBe("browser-rule");
    expect(decided.approval.actorEmail).toBe(admin.email);
    const evaluated = evaluateApprovalRules({
      now: NOW,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      versionId: VERSION_ID,
      contentHash: HASH,
      totalCents: 97265,
      rules: [],
      decisions: [decided.approval],
    });
    expect(evaluated.requiredApprovals).toBe(1);
    expect(evaluated.satisfied).toBe(true);
  });

  it("rejects a decision from another organization", () => {
    const result = decide({ loaded: loaded({ organizationId: OTHER_ORG }) });
    expect(result).toEqual({
      ok: false,
      error: "That record is outside this organization.",
    });
  });

  it("rejects a stale content hash", () => {
    const result = decide({
      expected: { estimateVersionId: VERSION_ID, contentHash: "old-hash" },
    });
    expect(result).toEqual({ ok: false, error: "stale-hash" });
  });

  it("rejects a superseded version", () => {
    const result = decide({
      loaded: loaded({ versionNumber: 1, latestVersionNumber: 2 }),
    });
    expect(result).toEqual({ ok: false, error: "superseded" });
  });

  it("ignores an expired approval", () => {
    const expired: EstimateApproval = {
      id: "approval-expired",
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      estimateId: "22222222-2222-4222-8222-222222222201",
      estimateVersionId: VERSION_ID,
      versionNumber: 1,
      contentHash: HASH,
      ruleId: defaultApprovalRule(STRONG_FOAM_ORGANIZATION_ID).id,
      actorEmail: admin.email,
      decision: "approved",
      comment: "Old",
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    };
    const evaluated = evaluateApprovalRules({
      now: NOW,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      versionId: VERSION_ID,
      contentHash: HASH,
      totalCents: 1000,
      rules: [],
      decisions: [expired],
    });
    expect(evaluated.satisfied).toBe(false);
    expect(evaluated.approvals).toEqual([]);
  });

  it("records a rejection without treating it as approval", () => {
    const rejected = decide({ decision: "rejected", comment: "Quantity is wrong" });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    const evaluated = evaluateApprovalRules({
      now: NOW,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      versionId: VERSION_ID,
      contentHash: HASH,
      totalCents: 97265,
      rules: [],
      decisions: [rejected.approval],
    });
    expect(evaluated.status).toBe("rejected");
    expect(evaluated.satisfied).toBe(false);
  });

  it("requires a second approver when the total crosses the rule", () => {
    const rule = {
      ...defaultApprovalRule(STRONG_FOAM_ORGANIZATION_ID),
      id: "rule-threshold",
      secondApproverTotalCents: 50000,
    };
    const first = decide({ rules: [rule] });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const pending = evaluateApprovalRules({
      now: NOW,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      versionId: VERSION_ID,
      contentHash: HASH,
      totalCents: 97265,
      rules: [rule],
      decisions: [first.approval],
    });
    expect(pending.requiredApprovals).toBe(2);
    expect(pending.satisfied).toBe(false);
    const second = decide(
      {
        rules: [rule],
        actor: { ...admin, email: "second@strongfoam.demo" },
      },
      [first.approval],
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const satisfied = evaluateApprovalRules({
      now: NOW,
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      versionId: VERSION_ID,
      contentHash: HASH,
      totalCents: 97265,
      rules: [rule],
      decisions: [first.approval, second.approval],
    });
    expect(satisfied.satisfied).toBe(true);
  });

  it("replays the same decision instead of inserting another", () => {
    const first = decide();
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = decide({}, [first.approval]);
    expect(again).toEqual({ ok: true, approval: first.approval, replayed: true });
  });

  it("keeps approval rows immutable in SQL", () => {
    const sql = readFileSync("drizzle/0023_estimate_approvals_proposals.sql", "utf8");
    expect(sql).toContain("RAISE EXCEPTION 'immutable'");
    expect(sql).toContain("commercial_approval_rules");
    expect(sql).toContain("estimate_approvals");
  });
});
