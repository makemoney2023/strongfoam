import { describe, expect, it } from "vitest";
import { applyImportRetention, planImportRetention } from "@/lib/ops/import-retention";
import { handlers } from "@/worker/registry";
import { handleRetainImport } from "@/worker/handlers/retain-import";

const NOW = new Date("2026-09-22T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe("import retention", () => {
  it("deletes a cancelled source immediately and keeps the batch record", () => {
    expect(
      planImportRetention(
        {
          id: "batch",
          status: "cancelled",
          updatedAt: NOW,
          hasSource: true,
          hasNormalized: true,
        },
        NOW,
      ),
    ).toEqual({ deleteSource: true, deleteNormalized: false });
  });

  it("waits 7 days for a failed source and 30 or 90 days after completion", () => {
    expect(
      planImportRetention(
        {
          id: "failed",
          status: "failed",
          updatedAt: daysAgo(6),
          hasSource: true,
          hasNormalized: false,
        },
        NOW,
      ).deleteSource,
    ).toBe(false);
    expect(
      planImportRetention(
        {
          id: "failed",
          status: "failed",
          updatedAt: daysAgo(7),
          hasSource: true,
          hasNormalized: true,
        },
        NOW,
      ),
    ).toEqual({ deleteSource: true, deleteNormalized: false });
    expect(
      planImportRetention(
        {
          id: "done",
          status: "completed",
          updatedAt: daysAgo(30),
          hasSource: true,
          hasNormalized: true,
        },
        NOW,
      ),
    ).toEqual({ deleteSource: true, deleteNormalized: false });
    expect(
      planImportRetention(
        {
          id: "done",
          status: "completed",
          updatedAt: daysAgo(90),
          hasSource: false,
          hasNormalized: true,
        },
        NOW,
      ),
    ).toEqual({ deleteSource: false, deleteNormalized: true });
  });

  it("checkpoints each deletion and ignores a retry after the object is gone", async () => {
    const events: string[] = [];
    const subjects = [
      {
        id: "batch-1",
        status: "cancelled",
        updatedAt: NOW,
        hasSource: true,
        hasNormalized: false,
      },
    ];
    const first = await applyImportRetention(subjects, NOW, async (subject, plan) => {
      events.push(`${subject.id}:${plan.deleteSource}`);
      subject.hasSource = false;
    });
    const second = await applyImportRetention(subjects, NOW, async () => {
      throw new Error("retry should not persist");
    });
    expect(first).toBe(1);
    expect(second).toBe(0);
    expect(events).toEqual(["batch-1:true"]);
  });

  it("registers the retention job", () => {
    expect(handlers["data-import.retain"]).toBe(handleRetainImport);
  });
});
