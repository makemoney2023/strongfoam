import { describe, expect, it } from "vitest";
import { handleFilesGet } from "@/app/api/files/[leadId]/[fileIndex]/route";
import { signLeadId } from "@/lib/leads/hmac";

const SECRET = "test-secret-test-secret-test-secret";
const LEAD_ID = "lead-1";
const FILE_INDEX = "0";

function tokenFor(leadId: string, fileIndex: string) {
  return signLeadId(`${leadId}:${fileIndex}`, SECRET);
}

describe("GET /api/files/[leadId]/[fileIndex]", () => {
  it("returns 401 without a valid token", async () => {
    const response = await handleFilesGet(
      new Request(`http://localhost/api/files/${LEAD_ID}/${FILE_INDEX}`),
      { leadId: LEAD_ID, fileIndex: FILE_INDEX },
      {
        getLead: async () => ({ files: [{ pathname: "leads/x/plan.pdf" }] }),
        resolveFileUrl: async () => "https://example.com/signed",
        secret: SECRET,
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the token was signed for a different file index", async () => {
    const token = tokenFor(LEAD_ID, "9");
    const response = await handleFilesGet(
      new Request(`http://localhost/api/files/${LEAD_ID}/${FILE_INDEX}?token=${token}`),
      { leadId: LEAD_ID, fileIndex: FILE_INDEX },
      {
        getLead: async () => ({ files: [{ pathname: "leads/x/plan.pdf" }] }),
        resolveFileUrl: async () => "https://example.com/signed",
        secret: SECRET,
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the file index is out of range", async () => {
    const token = tokenFor(LEAD_ID, FILE_INDEX);
    const response = await handleFilesGet(
      new Request(`http://localhost/api/files/${LEAD_ID}/${FILE_INDEX}?token=${token}`),
      { leadId: LEAD_ID, fileIndex: FILE_INDEX },
      {
        getLead: async () => ({ files: [] }),
        resolveFileUrl: async () => "https://example.com/signed",
        secret: SECRET,
      },
    );

    expect(response.status).toBe(404);
  });

  it("redirects to the resolved signed URL for a valid token", async () => {
    const token = tokenFor(LEAD_ID, FILE_INDEX);
    const response = await handleFilesGet(
      new Request(`http://localhost/api/files/${LEAD_ID}/${FILE_INDEX}?token=${token}`),
      { leadId: LEAD_ID, fileIndex: FILE_INDEX },
      {
        getLead: async () => ({ files: [{ pathname: "leads/x/plan.pdf" }] }),
        resolveFileUrl: async (pathname) => `https://example.com/signed/${pathname}`,
        secret: SECRET,
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/signed/leads/x/plan.pdf",
    );
  });
});
