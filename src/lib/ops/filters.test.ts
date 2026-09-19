import { describe, expect, it } from "vitest";
import {
  dateInputValue,
  dateRangeForPreset,
  datetimeLocalValue,
  isInDateRange,
  matchesQuery,
  parseDateParam,
  parseDateRange,
  startOfWeek,
} from "@/lib/ops/filters";

describe("date and list filters", () => {
  it("parses YYYY-MM-DD values and rejects invalid dates", () => {
    expect(parseDateParam("2026-09-19")?.toISOString().startsWith("2026-09-19")).toBe(
      true,
    );
    expect(parseDateParam("09/19/2026")).toBeNull();
    expect(parseDateParam("2026-13-40")).toBeNull();
    expect(parseDateRange({ from: "2026-09-01", to: "2026-09-19" }).from).toBeInstanceOf(
      Date,
    );
  });

  it("includes dates on the range boundaries", () => {
    const mid = new Date("2026-09-10T15:00:00");
    expect(isInDateRange(mid, { from: "2026-09-10", to: "2026-09-10" })).toBe(true);
    expect(isInDateRange(mid, { from: "2026-09-11" })).toBe(false);
    expect(isInDateRange(null, { from: "2026-09-01" })).toBe(false);
    expect(isInDateRange(mid, {})).toBe(true);
  });

  it("formats local date and datetime inputs", () => {
    const value = new Date("2026-09-19T14:30:00");
    expect(dateInputValue(value)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(datetimeLocalValue(value)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(dateInputValue(null)).toBe("");
  });

  it("matches search queries across record fields", () => {
    expect(matchesQuery("acme", ["Acme Construction", "Kitchener"])).toBe(true);
    expect(matchesQuery("toronto", ["Acme Construction", "Kitchener"])).toBe(false);
    expect(matchesQuery("", ["Anything"])).toBe(true);
  });

  it("builds date-range presets from a fixed instant", () => {
    const wednesday = new Date("2026-09-16T15:00:00");
    expect(dateInputValue(startOfWeek(wednesday))).toBe("2026-09-14");
    expect(dateRangeForPreset("today", wednesday)).toEqual({
      from: "2026-09-16",
      to: "2026-09-16",
    });
    expect(dateRangeForPreset("this_week", wednesday)).toEqual({
      from: "2026-09-14",
      to: "2026-09-16",
    });
    expect(dateRangeForPreset("overdue", wednesday)).toEqual({
      from: "",
      to: "2026-09-15",
    });
    expect(dateRangeForPreset("last_30", wednesday)).toEqual({
      from: "2026-08-18",
      to: "2026-09-16",
    });
  });
});
