import { describe, expect, it } from "vitest";
import { countWord } from "@/lib/count-words";

describe("countWord", () => {
  it("spells out small counts", () => {
    expect(countWord(4)).toBe("four");
    expect(countWord(5)).toBe("five");
    expect(countWord(5, { capitalize: true })).toBe("Five");
  });

  it("falls back to digits for large or non-integer counts", () => {
    expect(countWord(13)).toBe("13");
    expect(countWord(2.5)).toBe("2.5");
  });
});
