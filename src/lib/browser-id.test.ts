import { describe, expect, it } from "vitest";
import { createBrowserUuid } from "@/lib/browser-id";

describe("createBrowserUuid", () => {
  it("uses randomUUID when the browser exposes it", () => {
    expect(
      createBrowserUuid({
        randomUUID: () => "11111111-1111-4111-8111-111111111111",
        getRandomValues: (value: Uint8Array) => value,
      }),
    ).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("generates an RFC 4122 v4 id when randomUUID is unavailable", () => {
    const id = createBrowserUuid({
      getRandomValues: (value: Uint8Array) => {
        value.fill(0xab);
        return value;
      },
    });
    expect(id).toBe("abababab-abab-4bab-abab-abababababab");
  });
});
