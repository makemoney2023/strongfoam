import { describe, expect, it, vi } from "vitest";
import {
  TURNSTILE_SCRIPT_URL,
  TURNSTILE_SITEVERIFY_URL,
  turnstileSiteKey,
  verifyTurnstileToken,
} from "@/lib/leads/turnstile";

describe("Turnstile", () => {
  it("skips verification when the secret is absent", async () => {
    const fetchImpl = vi.fn();
    await expect(
      verifyTurnstileToken({ token: "", secret: "", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a failed Siteverify response", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
    );
    await expect(
      verifyTurnstileToken({
        token: "bad",
        secret: "secret",
        ip: "1.1.1.1",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe(false);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(String(init.body)).toContain("response=bad");
  });

  it("uses the official widget script and omits a missing site key", () => {
    expect(TURNSTILE_SCRIPT_URL).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js");
    expect(turnstileSiteKey({})).toBe("");
    expect(turnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " site-key " })).toBe("site-key");
  });
});
