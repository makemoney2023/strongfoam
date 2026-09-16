import { describe, expect, it } from "vitest";
import {
  getServicesPinDistance,
  getServicesScrollTrigger,
  shouldPinServicesRail,
} from "./scroll-triggers";

describe("services horizontal pin", () => {
  it("uses only the leftover track width as scroll distance", () => {
    expect(getServicesPinDistance(4000, 1440)).toBe(2560);
    expect(getServicesPinDistance(800, 1440)).toBe(0);
    expect(getServicesPinDistance(2375, 390)).toBe(1985);
  });

  it("pins the rail on phone viewports so vertical scroll can move it", () => {
    expect(shouldPinServicesRail(390)).toBe(true);
    expect(shouldPinServicesRail(1440)).toBe(true);
  });

  it("pins the section with spacing so the next chapter cannot slide underneath", () => {
    const trigger = getServicesScrollTrigger(2560);
    expect(trigger.pin).toBe(true);
    expect(trigger.pinSpacing).toBe(true);
    expect(trigger.end).toBe("+=2560");
    expect(trigger.start).toBe("top top");
  });
});
