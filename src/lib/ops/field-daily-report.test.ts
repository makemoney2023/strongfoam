import { describe, expect, it } from "vitest";
import { confirmedDailyReport } from "@/lib/ops/field-daily-report";

describe("confirmed daily report", () => {
  it("uses confirmed rows and skips dismissed ones", () => {
    const text = confirmedDailyReport({
      jobName: "Maple",
      workingDay: "2026-10-13",
      doneTasks: ["North wall"],
      drafts: [
        { status: "confirmed", kind: "quantity", body: "40 bags" },
        { status: "dismissed", kind: "blocker", body: "Lift is down." },
      ],
    });
    expect(text).toContain("Maple daily report");
    expect(text).toContain("Done: North wall.");
    expect(text).toContain("quantity: 40 bags");
    expect(text).not.toContain("Lift is down");
  });

  it("stays empty until something is confirmed", () => {
    expect(
      confirmedDailyReport({
        jobName: "Maple",
        workingDay: "2026-10-13",
        doneTasks: ["North wall"],
        drafts: [],
      }),
    ).toBeNull();
  });
});
