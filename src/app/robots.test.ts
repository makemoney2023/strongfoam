import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { site } from "@/content/site";

describe("robots policy", () => {
  it("permits public marketing routes and advertises the canonical sitemap", () => {
    const result = robots();

    expect(result.sitemap).toBe(`${site.url}/sitemap.xml`);
    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
    });
  });

  it("protects nonpublic, tokenized, API, and confirmation surfaces", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        "/app",
        "/field",
        "/proposals",
        "/api",
        "/request-estimate/thanks",
      ]),
    );
  });
});
