import { describe, expect, it, vi } from "vitest";
import { handleJobUploadPost } from "./route";

const JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AREA_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function request(body: unknown) {
  return new Request("http://localhost/api/ops/job-uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function baseDeps() {
  return {
    handleUpload: vi.fn(),
    getSession: vi.fn(async () => ({ email: "field@strongfoam.com" as const })),
    getJob: vi.fn(async () => ({ id: JOB_ID }) as never),
    listWorkAreas: vi.fn(async () => [{ id: AREA_ID }] as never),
    getBlobMetadata: vi.fn(),
    deleteBlob: vi.fn(),
    recordDocument: vi.fn(),
    blobToken: "blob-token",
  };
}

describe("POST /api/ops/job-uploads", () => {
  it("requires a staff session before issuing an upload token", async () => {
    const deps = baseDeps();
    deps.getSession.mockResolvedValue(null as never);
    const response = await handleJobUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(401);
    expect(deps.handleUpload).not.toHaveBeenCalled();
  });

  it("limits upload tokens to the authenticated job and allowed file policy", async () => {
    const deps = baseDeps();
    deps.handleUpload.mockImplementation(async (options) => {
      const token = await options.onBeforeGenerateToken(
        `jobs/${JOB_ID}/north-elevation.pdf`,
        JSON.stringify({
          jobId: JOB_ID,
          workAreaId: AREA_ID,
          kind: "plan",
          filename: "north-elevation.pdf",
        }),
        false,
      );
      return {
        type: "blob.generate-client-token",
        clientToken: "token",
        ...token,
      };
    });

    const response = await handleJobUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      allowedContentTypes: string[];
      maximumSizeInBytes: number;
      tokenPayload: string;
    };
    expect(payload.allowedContentTypes).toContain("application/pdf");
    expect(payload.maximumSizeInBytes).toBe(25 * 1024 * 1024);
    expect(JSON.parse(payload.tokenPayload)).toMatchObject({
      jobId: JOB_ID,
      workAreaId: AREA_ID,
      actor: "field@strongfoam.com",
    });
  });

  it("rejects paths outside the selected job", async () => {
    const deps = baseDeps();
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken(
        "jobs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/plan.pdf",
        JSON.stringify({
          jobId: JOB_ID,
          kind: "plan",
          filename: "plan.pdf",
        }),
        false,
      );
      return { type: "blob.generate-client-token", clientToken: "token" };
    });

    const response = await handleJobUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_job_upload" });
  });

  it("records validated Blob metadata from the signed completion callback", async () => {
    const deps = baseDeps();
    const tokenPayload = JSON.stringify({
      jobId: JOB_ID,
      workAreaId: AREA_ID,
      kind: "plan",
      filename: "north-elevation.pdf",
      actor: "field@strongfoam.com",
    });
    deps.getBlobMetadata.mockResolvedValue({
      pathname: `jobs/${JOB_ID}/north-elevation-abc.pdf`,
      contentType: "application/pdf",
      size: 2048,
    });
    deps.recordDocument.mockResolvedValue({ id: "document-1" });
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onUploadCompleted?.({
        blob: {
          pathname: `jobs/${JOB_ID}/north-elevation-abc.pdf`,
          contentType: "application/pdf",
        },
        tokenPayload,
      });
      return { type: "blob.upload-completed", response: "ok" };
    });

    const response = await handleJobUploadPost(
      request({ type: "blob.upload-completed" }),
      deps as never,
    );
    expect(response.status).toBe(200);
    expect(deps.recordDocument).toHaveBeenCalledWith({
      jobId: JOB_ID,
      actor: "field@strongfoam.com",
      input: {
        filename: "north-elevation.pdf",
        contentType: "application/pdf",
        sizeBytes: 2048,
        kind: "plan",
        workAreaId: AREA_ID,
      },
      pathname: `jobs/${JOB_ID}/north-elevation-abc.pdf`,
    });
    expect(deps.deleteBlob).not.toHaveBeenCalled();
  });

  it("deletes the uploaded blob when metadata persistence fails", async () => {
    const deps = baseDeps();
    const pathname = `jobs/${JOB_ID}/north-elevation-abc.pdf`;
    deps.getBlobMetadata.mockResolvedValue({
      pathname,
      contentType: "application/pdf",
      size: 2048,
    });
    deps.recordDocument.mockRejectedValue(new Error("database unavailable"));
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onUploadCompleted?.({
        blob: { pathname, contentType: "application/pdf" },
        tokenPayload: JSON.stringify({
          jobId: JOB_ID,
          workAreaId: null,
          kind: "plan",
          filename: "north-elevation.pdf",
          actor: "field@strongfoam.com",
        }),
      });
      return { type: "blob.upload-completed", response: "ok" };
    });

    const response = await handleJobUploadPost(
      request({ type: "blob.upload-completed" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(deps.deleteBlob).toHaveBeenCalledWith(pathname, {
      token: "blob-token",
    });
  });
});
