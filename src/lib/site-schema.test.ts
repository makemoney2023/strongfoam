import { describe, expect, it } from "vitest";
import { faqItems } from "@/content/site";
import { homeGraph } from "@/lib/site-schema";

describe("site schema claims policy", () => {
  it("builds the current homepage graph from claims-safe visible copy", () => {
    expect(() => homeGraph(faqItems)).not.toThrow();
  });

  it("rejects unsafe copy before a completed graph can be published", () => {
    expect(() =>
      homeGraph([
        {
          question: "What does the system do?",
          answer: "It is guaranteed to be the best option.",
        },
      ]),
    ).toThrow(/json-ld/i);
  });
});
