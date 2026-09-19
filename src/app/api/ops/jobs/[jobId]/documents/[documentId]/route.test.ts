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
});
