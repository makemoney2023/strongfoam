import { describe, expect, it } from "vitest";
import {
  getServicesPinDistance,
  getServicesScrollTrigger,
} from "./scroll-triggers";

describe("services horizontal pin", () => {
  it("uses only the leftover track width as scroll distance", () => {
    expect(getServicesPinDistance(4000, 1440)).toBe(2560);
    expect(getServicesPinDistance(800, 1440)).toBe(0);
  });

  it("pins the section with spacing so the next chapter cannot slide underneath", () => {
    const trigger = getServicesScrollTrigger(2560);
    expect(trigger.pin).toBe(true);
    expect(trigger.pinSpacing).toBe(true);
    expect(trigger.end).toBe("+=2560");
    expect(trigger.start).toBe("top top");
  });
});
