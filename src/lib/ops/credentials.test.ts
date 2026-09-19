import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let hashPassword: typeof import("@/lib/ops/credentials").hashPassword;
let verifyPassword: typeof import("@/lib/ops/credentials").verifyPassword;

beforeAll(async () => {
  ({ hashPassword, verifyPassword } = await import("@/lib/ops/credentials"));
});

describe("field credentials", () => {
  it("hashes and verifies a password without storing plaintext", async () => {
    const encoded = await hashPassword("StrongField123");
    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain("StrongField123");
    await expect(verifyPassword("StrongField123", encoded)).resolves.toBe(true);
    await expect(verifyPassword("WrongField123", encoded)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("anything", "plaintext")).resolves.toBe(false);
  });
});
