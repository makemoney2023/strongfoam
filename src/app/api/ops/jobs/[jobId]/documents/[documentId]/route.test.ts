import { describe, expect, it } from "vitest";
import { handleJobDocumentGet } from "./route";

describe("GET /api/ops/jobs/:jobId/documents/:documentId", () => {
  it("requires a staff session and returns the file bytes", async () => {
    const denied = await handleJobDocumentGet(
      { jobId: "job-1", documentId: "doc-1" },
      {
        getSession: async () => null,
        getDocument: async () => ({
          filename: "plan.pdf",
          contentType: "application/pdf",
          kind: "bytes",
          bytes: new Uint8Array([1, 2, 3]),
        }),
      },
    );
    expect(denied.status).toBe(401);

    const missing = await handleJobDocumentGet(
      { jobId: "job-1", documentId: "missing" },
      {
        getSession: async () => ({ email: "estimating@strongfoam.com" }),
        getDocument: async () => null,
      },
    );
    expect(missing.status).toBe(404);

    const allowed = await handleJobDocumentGet(
      { jobId: "job-1", documentId: "doc-1" },
      {
        getSession: async () => ({ email: "estimating@strongfoam.com" }),
        getDocument: async (jobId, documentId) => {
          expect(jobId).toBe("job-1");
          expect(documentId).toBe("doc-1");
          return {
            filename: "plan.pdf",
            contentType: "application/pdf",
            kind: "bytes",
            bytes: new Uint8Array([37, 80, 68, 70]),
          };
        },
      },
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("content-type")).toBe("application/pdf");
    expect(allowed.headers.get("content-disposition")).toContain("plan.pdf");
    expect(Buffer.from(await allowed.arrayBuffer()).equals(Buffer.from([37, 80, 68, 70]))).toBe(
      true,
    );
  });

  it("redirects database-backed files to a short-lived private Blob URL", async () => {
    const response = await handleJobDocumentGet(
      { jobId: "job-1", documentId: "doc-1" },
      {
        getSession: async () => ({ email: "estimating@strongfoam.com" }),
        getDocument: async () => ({
          filename: "plan.pdf",
          contentType: "application/pdf",
          kind: "redirect",
          url: "https://blob.example/private-plan?token=signed",
        }),
      },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://blob.example/private-plan?token=signed",
    );
  });
});
