import { describe, expect, it } from "vitest";
import { requestOrigin } from "@/lib/ops/request-origin";

describe("requestOrigin", () => {
  it("keeps a normal request origin", () => {
    expect(
      requestOrigin(new Request("http://localhost:3000/api/ops/login")),
    ).toBe("http://localhost:3000");
  });

  it("rewrites a 0.0.0.0 bind address using the Host header", () => {
    expect(
      requestOrigin(
        new Request("http://0.0.0.0:3000/api/ops/login", {
          headers: { host: "127.0.0.1:3000" },
        }),
      ),
    ).toBe("http://127.0.0.1:3000");
  });

  it("ignores a Host header that is not a simple host:port", () => {
    expect(
      requestOrigin(
        new Request("http://0.0.0.0:3000/api/ops/login", {
          headers: { host: "evil.example/phish" },
        }),
      ),
    ).toBe("http://0.0.0.0:3000");
  });

  it("does not trust a public or invalid loopback Host header", () => {
    for (const host of ["attacker.example", "localhost:99999"]) {
      expect(
        requestOrigin(
          new Request("http://0.0.0.0:3000/api/ops/login", {
            headers: { host },
          }),
        ),
      ).toBe("http://0.0.0.0:3000");
    }
  });
});
