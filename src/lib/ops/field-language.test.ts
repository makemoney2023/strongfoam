import { describe, expect, it } from "vitest";
import { fieldLanguage, languageIdempotencyKey } from "@/lib/ops/field-language";

describe("field language", () => {
  it("accepts english, french, and spanish", () => {
    expect(fieldLanguage("en")).toBe("en");
    expect(fieldLanguage("fr-CA")).toBe("fr");
    expect(fieldLanguage("es")).toBe("es");
    expect(fieldLanguage("de")).toBe("en");
    expect(fieldLanguage(null)).toBe("en");
  });

  it("keys the preference by user", () => {
    expect(languageIdempotencyKey("user-1")).toBe("staff.language:user-1");
  });
});
