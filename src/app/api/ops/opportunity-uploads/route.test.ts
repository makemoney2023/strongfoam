import { describe, expect, it, vi } from "vitest";
import { handleOpportunityUploadPost } from "./route";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999991";
const OTHER_OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999992";

function request(body: unknown) {
  return new Request("http://localhost/api/ops/opportunity-uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function officeSession() {
  return {
    email: "office@strongfoam.demo",
    role: "office" as const,
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
  };
}

function baseDeps() {
  return {
    handleUpload: vi.fn(),
    getSession: vi.fn(async () => officeSession()),
    getOpportunity: vi.fn(async () => ({ id: OPPORTUNITY_ID }) as never),
    getBlobMetadata: vi.fn(),
    deleteBlob: vi.fn(),
    recordDocument: vi.fn(async () => ({
      documentId: "document-1",
      versionId: "version-1",
    })),
    blobToken: "blob-token",
  };
}

describe("POST /api/ops/opportunity-uploads", () => {
  it("rejects an unauthenticated token request", async () => {
    const deps = baseDeps();
    deps.getSession.mockResolvedValue(null as never);
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(401);
    expect(deps.handleUpload).not.toHaveBeenCalled();
    expect(deps.recordDocument).not.toHaveBeenCalled();
  });

  it("rejects a field session", async () => {
    const deps = baseDeps();
    deps.getSession.mockResolvedValue({
      email: "field@strongfoam.demo",
      role: "field_worker",
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
    } as never);
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(403);
    expect(deps.recordDocument).not.toHaveBeenCalled();
  });

  it("rejects a path for a different opportunity", async () => {
    const deps = baseDeps();
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken(
        `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${OTHER_OPPORTUNITY_ID}/plan.pdf`,
        JSON.stringify({
          opportunityId: OPPORTUNITY_ID,
          kind: "plan",
          filename: "plan.pdf",
        }),
        false,
      );
      return { type: "blob.generate-client-token", clientToken: "token" };
    });
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_opportunity_upload" });
    expect(deps.recordDocument).not.toHaveBeenCalled();
  });

  it("rejects a missing opportunity", async () => {
    const deps = baseDeps();
    deps.getOpportunity.mockResolvedValue(null as never);
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken(
        `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${OPPORTUNITY_ID}/plan.pdf`,
        JSON.stringify({
          opportunityId: OPPORTUNITY_ID,
          kind: "plan",
          filename: "plan.pdf",
        }),
        false,
      );
      return { type: "blob.generate-client-token", clientToken: "token" };
    });
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.generate-client-token" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "opportunity_not_found" });
    expect(deps.recordDocument).not.toHaveBeenCalled();
  });

  it("rejects an oversize or mismatched file without a document row", async () => {
    const deps = baseDeps();
    const pathname = `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${OPPORTUNITY_ID}/plan.pdf`;
    deps.getBlobMetadata.mockResolvedValue({
      pathname,
      contentType: "text/plain",
      size: 100,
    });
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onUploadCompleted?.({
        blob: { pathname, contentType: "text/plain" },
        tokenPayload: JSON.stringify({
          organizationId: STRONG_FOAM_ORGANIZATION_ID,
          opportunityId: OPPORTUNITY_ID,
          documentId: null,
          kind: "plan",
          revisionLabel: null,
          filename: "plan.pdf",
          actor: "office@strongfoam.demo",
        }),
      });
      return { type: "blob.upload-completed", response: "ok" };
    });
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.upload-completed" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(deps.recordDocument).not.toHaveBeenCalled();
    expect(deps.deleteBlob).toHaveBeenCalled();
  });

  it("rejects a forged actor and deletes the blob", async () => {
    const deps = baseDeps();
    const pathname = `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${OPPORTUNITY_ID}/plan.pdf`;
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onUploadCompleted?.({
        blob: { pathname, contentType: "application/pdf" },
        tokenPayload: JSON.stringify({
          organizationId: STRONG_FOAM_ORGANIZATION_ID,
          opportunityId: OPPORTUNITY_ID,
          documentId: null,
          kind: "plan",
          revisionLabel: null,
          filename: "plan.pdf",
          actor: "someone-else@example.com",
        }),
      });
      return { type: "blob.upload-completed", response: "ok" };
    });
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.upload-completed" }),
      deps as never,
    );
    expect(response.status).toBe(400);
    expect(deps.recordDocument).not.toHaveBeenCalled();
  });

  it("records a quarantined version for an owned upload", async () => {
    const deps = baseDeps();
    const pathname = `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${OPPORTUNITY_ID}/plan-abc.pdf`;
    deps.getBlobMetadata.mockResolvedValue({
      pathname,
      contentType: "application/pdf",
      size: 2048,
    });
    deps.handleUpload.mockImplementation(async (options) => {
      await options.onUploadCompleted?.({
        blob: { pathname, contentType: "application/pdf" },
        tokenPayload: JSON.stringify({
          organizationId: STRONG_FOAM_ORGANIZATION_ID,
          opportunityId: OPPORTUNITY_ID,
          documentId: null,
          kind: "plan",
          revisionLabel: "Rev A",
          filename: "plan.pdf",
          actor: "office@strongfoam.demo",
        }),
      });
      return { type: "blob.upload-completed", response: "ok" };
    });
    const response = await handleOpportunityUploadPost(
      request({ type: "blob.upload-completed" }),
      deps as never,
    );
    expect(response.status).toBe(200);
    expect(deps.recordDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: STRONG_FOAM_ORGANIZATION_ID,
        opportunityId: OPPORTUNITY_ID,
        pathname,
        input: expect.objectContaining({
          filename: "plan.pdf",
          kind: "plan",
          revisionLabel: "Rev A",
        }),
      }),
    );
    expect(deps.deleteBlob).not.toHaveBeenCalled();
  });
});
