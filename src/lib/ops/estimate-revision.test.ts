import { describe, expect, it } from "vitest";
import type { EstimateDiff } from "@/lib/ops/estimates";
import { explainEstimateRevision, keepGroundedParaphrase } from "@/lib/ops/estimate-revision";

const diff: EstimateDiff = {
  lines: {
    added: ["Closed cell roof"],
    removed: ["Open cell wall"],
    changed: ["Podium deck"],
  },
  clauses: { added: [], removed: [], changed: [] },
  alternates: { added: [], removed: [], changed: [] },
  jobPackages: { added: [], removed: [], changed: [] },
  totals: { fromCents: 100_000, toCents: 250_000, deltaCents: 150_000 },
};

describe("estimate revision explanation", () => {
  it("names only lines from the diff and the total delta", () => {
    const explanation = explainEstimateRevision({
      fromVersion: 1,
      toVersion: 2,
      diff,
      ruleName: "Administrator approval",
      secondApproverTotalCents: 200_000,
    });
    expect(explanation.text).toContain("Added line: Closed cell roof.");
    expect(explanation.text).toContain("Removed line: Open cell wall.");
    expect(explanation.text).toContain("Changed quantity or price on line: Podium deck.");
    expect(explanation.text).toContain("150000 cents");
    expect(explanation.text).not.toContain("Invented line");
    expect(explanation.crossesSecondApprover).toBe(true);
    expect(explanation.text).toContain("second-approver threshold");
    expect(explanation.text.toLowerCase()).not.toMatch(/\bapproved\b|\brejected\b|\bsent\b/);
  });

  it("does not claim a new threshold when the total stays under it", () => {
    const explanation = explainEstimateRevision({
      fromVersion: 2,
      toVersion: 3,
      diff: { ...diff, totals: { fromCents: 100, toCents: 120, deltaCents: 20 } },
      ruleName: "Administrator approval",
      secondApproverTotalCents: 200_000,
    });
    expect(explanation.crossesSecondApprover).toBe(false);
    expect(explanation.text).toContain("does not cross a new approval threshold");
  });

  it("keeps only model sentences that match the grounded explanation", () => {
    const explanation = explainEstimateRevision({
      fromVersion: 1,
      toVersion: 2,
      diff,
      ruleName: "Administrator approval",
      secondApproverTotalCents: null,
    });
    const paraphrased = keepGroundedParaphrase(
      `${explanation.sentences[0]?.text} The customer was sent a revised total.`,
      explanation.sentences,
    );
    expect(paraphrased).toContain("Added line: Closed cell roof.");
    expect(paraphrased).not.toContain("sent a revised");
  });
});
