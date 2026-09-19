import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_SCHEDULE_NOW } from "@/lib/ops/demo-data";
import { getOpsNow } from "@/lib/ops/ops-now";

describe("getOpsNow", () => {
  it("uses the deterministic Schedule clock in demo mode", () => {
    expect(
      getOpsNow({ OPS_DEMO: "1", DATABASE_URL: "postgres://example" }),
    ).toEqual(new Date(DEMO_SCHEDULE_NOW));
    expect(getOpsNow({})).toEqual(new Date(DEMO_SCHEDULE_NOW));
  });

  it("uses a fresh wall-clock Date in production mode", () => {
    const wallClock = new Date("2032-04-05T06:07:08.009Z");
    const result = getOpsNow(
      { DATABASE_URL: "postgres://example" },
      () => wallClock,
    );

    expect(result).toEqual(wallClock);
    expect(result).not.toBe(wallClock);
  });

  it("returns fresh Dates that isolate caller mutations", () => {
    const first = getOpsNow({});
    first.setUTCFullYear(1999);

    expect(getOpsNow({})).toEqual(new Date(DEMO_SCHEDULE_NOW));
  });
});

describe("date-sensitive operations routes", () => {
  const home = readFileSync(
    new URL("../../app/app/page.tsx", import.meta.url),
    "utf8",
  );
  const portfolio = readFileSync(
    new URL("../../app/app/projects/schedule/page.tsx", import.meta.url),
    "utf8",
  );
  const project = readFileSync(
    new URL("../../app/app/projects/[id]/page.tsx", import.meta.url),
    "utf8",
  );

  it("uses one operations clock for both Home summaries", () => {
    expect(home).toContain("const opsNow = getOpsNow();");
    expect(home).toMatch(
      /buildHomeSummary\(\s*\{ requests, opportunities, projects, jobs \},\s*opsNow\.getTime\(\),?\s*\)/,
    );
    expect(home).toMatch(
      /buildPortfolioScheduleSummary\(\s*serializePortfolioSchedule\(portfolioScheduleResult\),\s*opsNow,?\s*\)/,
    );
  });

  it("uses the operations clock for portfolio and project Schedule props", () => {
    expect(portfolio).toContain("const now = getOpsNow().toISOString();");
    expect(portfolio).toContain("now={now}");
    expect(project).toContain("const scheduleNow = getOpsNow().toISOString();");
    expect(project).toContain("now={scheduleNow}");
    expect(project).not.toContain("now={new Date().toISOString()}");
  });
});
