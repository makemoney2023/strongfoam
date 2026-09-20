import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/app/app/jobs/actions", () => ({
  uploadJobDocument: vi.fn(),
}));

import { JobDocumentUploader } from "@/components/ops/job-document-uploader";

describe("JobDocumentUploader", () => {
  it("includes revision metadata in the production Blob form", () => {
    const markup = renderToStaticMarkup(
      createElement(JobDocumentUploader, {
        jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        areas: [],
        storageMode: "blob",
        returnTo:
          "/app/jobs/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/plan",
        replacesDocumentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      }),
    );

    expect(markup).toContain('name="replacesDocumentId"');
    expect(markup).toContain(
      'value="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"',
    );
    expect(markup).toContain('name="returnTo"');
    expect(markup).not.toContain(" multiple");
    expect(markup).toContain("One file, up to 25 MB.");
  });
});
