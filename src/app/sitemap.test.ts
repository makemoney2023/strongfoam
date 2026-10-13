import { describe, expect, it } from "vitest";
import { publicRoutes, site } from "@/content/site";
import sitemap from "@/app/sitemap";

describe("marketing sitemap", () => {
  it("contains every indexable marketing route as a canonical URL", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(
      publicRoutes.map(({ path }) => `${site.url}${path === "/" ? "" : path}`),
    );
  });

  it("excludes nonpublic, tokenized, API, and confirmation routes", () => {
    const serialized = JSON.stringify(sitemap());

    for (const path of [
      "/request-estimate/thanks",
      "/app",
      "/field",
      "/proposals/",
      "/api/",
    ]) {
      expect(serialized).not.toContain(path);
    }
  });
});
