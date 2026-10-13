import { describe, expect, it } from "vitest";
import { assertMarketingClaimsSafe } from "./claims";

describe("assertMarketingClaimsSafe", () => {
  it("recursively rejects canonical and equivalent absolute claims with their surface and path", () => {
    const safeValue = {
      hero: "Insulation systems help control air movement.",
      sections: [{ copy: "Installed for the specified assembly." }],
      metadata: null,
    };

    expect(() =>
      assertMarketingClaimsSafe(safeValue, "marketing fixture"),
    ).not.toThrow();

    const unsafeValues = [
      ["greenest", { hero: "The greenest option." }, "$.hero"],
      ["unrivalled", { hero: "Unrivalled workmanship." }, "$.hero"],
      ["best", { sections: [{ copy: "The best system." }] }, "$.sections[0].copy"],
      ["guaranteed", { hero: "Guaranteed performance." }, "$.hero"],
      ["always", { hero: "Always prevents heat loss." }, "$.hero"],
      [
        "equivalent environmental",
        { hero: "The most environmentally friendly insulation." },
        "$.hero",
      ],
      [
        "equivalent performance",
        { hero: "100% effective in every assembly." },
        "$.hero",
      ],
      [
        "equivalent safety",
        { hero: "Completely safe in all conditions." },
        "$.hero",
      ],
      [
        "equivalent superiority",
        { hero: "Superior to all competing systems." },
        "$.hero",
      ],
      ["never fails", { hero: "This system never fails." }, "$.hero"],
      ["zero risk", { hero: "Zero risk for every project." }, "$.hero"],
      ["number one", { hero: "Ontario's number one installer." }, "$.hero"],
    ] as const;

    for (const [label, value, path] of unsafeValues) {
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(
        () => assertMarketingClaimsSafe(value, "marketing fixture"),
        label,
      ).toThrowError(
        new RegExp(`marketing fixture.*${escapedPath}`, "i"),
      );
    }
  });
});
