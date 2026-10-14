import { describe, expect, it } from "vitest";
import { privacyPolicy, termsOfService, PRIVACY_OFFICER_NAME } from "@/content/legal";
import sitemap from "@/app/sitemap";

const text = (doc: typeof privacyPolicy) =>
  [
    doc.effectiveDate,
    ...doc.intro,
    ...doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.after ?? [])]),
  ].join("\n");

describe("legal documents", () => {
  it("privacy policy covers required topics and contact details", () => {
    const body = text(privacyPolicy);
    for (const term of ["PIPEDA", "CASL", "Law 25", "estimating@strongfoam.com", "100 McGovern Drive", "Privacy Commissioner of Canada", "outside Canada", "October 14, 2026"]) {
      expect(body).toContain(term);
    }
    expect(body).toContain(PRIVACY_OFFICER_NAME);
  });

  it("terms cover estimates, warranty, liability and Ontario law", () => {
    const body = text(termsOfService);
    for (const term of ["non-binding", "written contract", "as is", "Limitation of liability", "Indemnity", "Province of Ontario", "Severability"]) {
      expect(body).toContain(term);
    }
  });

  it("section ids are unique", () => {
    for (const doc of [privacyPolicy, termsOfService]) {
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("sitemap lists the legal pages", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://strongfoam.com/privacy");
    expect(urls).toContain("https://strongfoam.com/terms");
  });
});
