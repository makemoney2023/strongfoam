import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SiteHeaderHomeLink,
  SiteHeaderNavigation,
} from "@/components/site-header";
import { navLinks } from "@/content/nav";

describe("site header navigation", () => {
  it("exposes the dedicated public routes in their approved order", () => {
    expect(navLinks.map((link) => link.label)).toEqual([
      "About",
      "Services",
      "Projects",
      "Partners",
      "Locations",
      "Contact",
      "Request Estimate",
    ]);
    expect(navLinks.map((link) => link.href)).toEqual([
      "/about",
      "/services",
      "/projects",
      "/partners",
      "/locations",
      "/contact",
      "/request-estimate",
    ]);
  });

  it.each(["desktop", "mobile"] as const)(
    "renders every %s target once without duplicating Request Estimate",
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(SiteHeaderNavigation, { variant }),
      );

      for (const link of navLinks) {
        expect(html).toContain(`href="${link.href}"`);
        expect(html).toContain(link.label);
      }
      expect(html.match(/Request Estimate/g)).toHaveLength(1);
      expect(html.match(/href="\/request-estimate"/g)).toHaveLength(1);
    },
  );

  it("renders a descriptive home link", () => {
    const html = renderToStaticMarkup(createElement(SiteHeaderHomeLink));

    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Strong Foam home"');
  });
});
