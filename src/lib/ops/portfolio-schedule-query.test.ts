import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_SCHEDULE_WIDGETS,
  parsePortfolioScheduleQuery,
  portfolioScheduleHref,
} from "@/lib/ops/portfolio-schedule-query";

describe("parsePortfolioScheduleQuery", () => {
  it("returns defaults when no filters are supplied", () => {
    expect(parsePortfolioScheduleQuery({})).toEqual({
      q: "",
      projectStatus: "active",
      projectManager: "",
      state: "all",
      attention: "all",
      view: "work",
      zoom: "week",
      anchor: null,
      from: null,
      to: null,
      baseline: "latest",
      hideCompleted: false,
    });
  });

  it("falls back for invalid enum, date, and array values", () => {
    expect(
      parsePortfolioScheduleQuery({
        q: ["accepted", "not-accepted"],
        projectStatus: ["complete"],
        projectManager: ["Ada"],
        state: " overdue ",
        attention: "urgent",
        view: "people",
        zoom: "day",
        anchor: ["2026-09-01"],
        from: "2026-09",
        to: "2026-09-19T00:00:00Z",
        baseline: "oldest",
        hideCompleted: ["1"],
      }),
    ).toEqual({
      q: "",
      projectStatus: "active",
      projectManager: "",
      state: "all",
      attention: "all",
      view: "work",
      zoom: "week",
      anchor: null,
      from: null,
      to: null,
      baseline: "latest",
      hideCompleted: false,
    });
  });

  it("rejects impossible calendar dates", () => {
    const parsed = parsePortfolioScheduleQuery({
      anchor: "2026-02-30",
      from: "2025-02-29",
      to: "2026-13-01",
    });

    expect(parsed.anchor).toBeNull();
    expect(parsed.from).toBeNull();
    expect(parsed.to).toBeNull();
  });

  it("trims scalar text filters", () => {
    const parsed = parsePortfolioScheduleQuery({
      q: "  steel frame  ",
      projectStatus: "  on-hold  ",
      projectManager: "  Ada Lovelace  ",
    });

    expect(parsed.q).toBe("steel frame");
    expect(parsed.projectStatus).toBe("on-hold");
    expect(parsed.projectManager).toBe("Ada Lovelace");
  });

  it("accepts hideCompleted only as the exact scalar value 1", () => {
    expect(parsePortfolioScheduleQuery({ hideCompleted: "1" }).hideCompleted).toBe(
      true,
    );
    expect(parsePortfolioScheduleQuery({ hideCompleted: "true" }).hideCompleted).toBe(
      false,
    );
    expect(parsePortfolioScheduleQuery({ hideCompleted: " 1 " }).hideCompleted).toBe(
      false,
    );
    expect(parsePortfolioScheduleQuery({ hideCompleted: ["1"] }).hideCompleted).toBe(
      false,
    );
  });

  it("swaps a reversed valid date range", () => {
    const parsed = parsePortfolioScheduleQuery({
      from: "2026-09-30",
      to: "2026-09-01",
    });

    expect(parsed.from).toBe("2026-09-01");
    expect(parsed.to).toBe("2026-09-30");
  });

  it("does not mutate its input", () => {
    const input = {
      q: "  crane  ",
      from: "2026-09-30",
      to: "2026-09-01",
      state: ["overdue"],
    };
    const snapshot = structuredClone(input);

    parsePortfolioScheduleQuery(input);

    expect(input).toEqual(snapshot);
  });

  it("exports canonical count-to-link widget definitions", () => {
    expect(PORTFOLIO_SCHEDULE_WIDGETS).toEqual({
      overdueTasks: {
        label: "Overdue tasks",
        href:
          "/app/projects/schedule?projectStatus=active&attention=overdue-tasks",
      },
      unscheduledActiveWork: {
        label: "Unscheduled active work",
        href:
          "/app/projects/schedule?projectStatus=active&attention=unscheduled-active-work",
      },
      projectsBehindBaseline: {
        label: "Projects behind baseline",
        href:
          "/app/projects/schedule?projectStatus=active&attention=behind-baseline",
      },
      peopleWithPotentialOverlap: {
        label: "Potential resource overlaps",
        href:
          "/app/projects/schedule?projectStatus=active&attention=resource-overlap&view=resources",
      },
    });

    const counts = {
      overdueTasks: 1,
      unscheduledActiveWork: 2,
      projectsBehindBaseline: 3,
      peopleWithPotentialOverlap: 4,
    };
    expect(
      Object.entries(PORTFOLIO_SCHEDULE_WIDGETS).map(
        ([key, widget]) => [
          widget.label,
          counts[key as keyof typeof counts],
          widget.href,
        ],
      ),
    ).toEqual([
      [
        "Overdue tasks",
        1,
        "/app/projects/schedule?projectStatus=active&attention=overdue-tasks",
      ],
      [
        "Unscheduled active work",
        2,
        "/app/projects/schedule?projectStatus=active&attention=unscheduled-active-work",
      ],
      [
        "Projects behind baseline",
        3,
        "/app/projects/schedule?projectStatus=active&attention=behind-baseline",
      ],
      [
        "Potential resource overlaps",
        4,
        "/app/projects/schedule?projectStatus=active&attention=resource-overlap&view=resources",
      ],
    ]);
  });

  it("keeps every widget href in sync with the parser", () => {
    for (const widget of Object.values(PORTFOLIO_SCHEDULE_WIDGETS)) {
      const url = new URL(widget.href, "https://example.test");
      const parsed = parsePortfolioScheduleQuery(
        Object.fromEntries(url.searchParams),
      );

      expect(
        portfolioScheduleHref({
          projectStatus: parsed.projectStatus,
          state: parsed.state === "all" ? undefined : parsed.state,
          attention:
            parsed.attention === "all" ? undefined : parsed.attention,
          view: parsed.view === "work" ? undefined : parsed.view,
        }),
      ).toBe(widget.href);
    }
  });
});

describe("portfolioScheduleHref", () => {
  it("uses canonical key order and URLSearchParams encoding", () => {
    expect(
      portfolioScheduleHref({
        q: "steel & glass",
        projectStatus: "in progress",
        projectManager: "Ada/Linus",
        state: "blocked",
        attention: "behind-baseline",
        view: "resources",
        zoom: "month",
        anchor: "2026-09-15",
        from: "2026-09-01",
        to: "2026-09-30",
        baseline: "none",
        hideCompleted: true,
      }),
    ).toBe(
      "/app/projects/schedule?q=steel+%26+glass&projectStatus=in+progress&projectManager=Ada%2FLinus&state=blocked&attention=behind-baseline&view=resources&zoom=month&anchor=2026-09-15&from=2026-09-01&to=2026-09-30&baseline=none&hideCompleted=1",
    );
  });

  it("does not add defaults for omitted or rejected values", () => {
    expect(portfolioScheduleHref({})).toBe("/app/projects/schedule");
    expect(
      portfolioScheduleHref({
        q: "   ",
        projectStatus: "",
        projectManager: " ",
        state: "invalid" as never,
        attention: "invalid" as never,
        view: "invalid" as never,
        zoom: "invalid" as never,
        anchor: "2026-02-30",
        from: null,
        to: "2026-09",
        baseline: "invalid" as never,
        hideCompleted: false,
      }),
    ).toBe("/app/projects/schedule");
  });

  it("builds canonical widget-style links", () => {
    expect(
      portfolioScheduleHref({
        projectStatus: "active",
        attention: "overdue-tasks",
      }),
    ).toBe(
      "/app/projects/schedule?projectStatus=active&attention=overdue-tasks",
    );
    expect(
      portfolioScheduleHref({
        projectStatus: "active",
        attention: "unscheduled-active-work",
      }),
    ).toBe(
      "/app/projects/schedule?projectStatus=active&attention=unscheduled-active-work",
    );
    expect(
      portfolioScheduleHref({
        projectStatus: "active",
        attention: "resource-overlap",
        view: "resources",
      }),
    ).toBe(
      "/app/projects/schedule?projectStatus=active&attention=resource-overlap&view=resources",
    );
  });

  it("swaps a reversed valid date range", () => {
    expect(
      portfolioScheduleHref({
        from: "2026-09-30",
        to: "2026-09-01",
      }),
    ).toBe("/app/projects/schedule?from=2026-09-01&to=2026-09-30");
  });

  it("does not mutate its input", () => {
    const input = {
      q: "  crane  ",
      from: "2026-09-30",
      to: "2026-09-01",
    };
    const snapshot = structuredClone(input);

    portfolioScheduleHref(input);

    expect(input).toEqual(snapshot);
  });
});
