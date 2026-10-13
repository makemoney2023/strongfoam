import { describe, expect, it } from "vitest";
import {
  initialSiteHeaderState,
  siteHeaderReducer,
} from "@/components/site-header-model";

describe("siteHeaderReducer", () => {
  it("opens the mobile navigation", () => {
    expect(siteHeaderReducer(initialSiteHeaderState, { type: "open" })).toEqual({
      mobileOpen: true,
    });
  });

  it("closes the mobile navigation", () => {
    expect(
      siteHeaderReducer({ mobileOpen: true }, { type: "close" }),
    ).toEqual({
      mobileOpen: false,
    });
  });

  it("closes the mobile navigation when a destination is selected", () => {
    expect(
      siteHeaderReducer({ mobileOpen: true }, { type: "navigate" }),
    ).toEqual({
      mobileOpen: false,
    });
  });
});
