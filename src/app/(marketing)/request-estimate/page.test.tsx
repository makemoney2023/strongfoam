import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RequestEstimatePage, { metadata } from "./page";

describe("request-estimate page", () => {
  it("describes both estimate and general-inquiry paths in route metadata", () => {
    expect(metadata.title).toBe("Request an Estimate or Ask a Question");
    expect(metadata.description).toContain("project estimate");
    expect(metadata.description).toContain("general inquiry");
    expect(metadata.alternates?.canonical).toBe("/request-estimate");
  });

  it("does not reuse a project-gallery photograph as the social card", () => {
    expect(metadata.openGraph).toMatchObject({
      title: "Request an Estimate or Ask a Question",
      description: expect.stringContaining("general inquiry"),
      url: "/request-estimate",
      type: "website",
    });
    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "Request an Estimate or Ask a Question",
      description: expect.stringContaining("project estimate"),
    });
    expect(JSON.stringify(metadata.twitter)).not.toContain("/media/projects/");
  });

  it("renders one page-owned main and H1 with accurate branch-introduction copy", () => {
    const html = renderToStaticMarkup(<RequestEstimatePage />);

    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('<main id="main-content"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("<h1>Request an estimate or ask a question</h1>");
    expect(html).toContain("project estimate");
    expect(html).toContain("general inquiry");
    expect(html).toContain('href="tel:+15199006000"');
    expect(html).toContain('href="mailto:estimating@strongfoam.com"');
  });
});
