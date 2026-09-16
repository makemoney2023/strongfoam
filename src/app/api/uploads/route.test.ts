import { describe, expect, it } from "vitest";
import { handleUploadPost } from "@/app/api/uploads/route";

const DRAFT_ID = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("http://localhost/api/uploads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/uploads", () => {
  it("returns a client token payload for an owned, valid draft path", async () => {
    const response = await handleUploadPost(request({}), {
      handleUpload: async (options) => {
        const result = await options.onBeforeGenerateToken(
          `leads/${DRAFT_ID}/plan.pdf`,
          JSON.stringify({ draftId: DRAFT_ID }),
          false,
        );
        return { type: "blob.generate-client-token", clientToken: "token", ...result } as never;
      },
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      allowedContentTypes: string[];
      maximumSizeInBytes: number;
      addRandomSuffix: boolean;
      tokenPayload: string;
    };
    expect(json.allowedContentTypes).toContain("application/pdf");
    expect(json.maximumSizeInBytes).toBe(25 * 1024 * 1024);
    expect(json.addRandomSuffix).toBe(true);
    expect(JSON.parse(json.tokenPayload)).toEqual({ draftId: DRAFT_ID });
  });

  it("rejects a pathname outside the draft's own prefix", async () => {
    const response = await handleUploadPost(request({}), {
      handleUpload: async (options) => {
        await options.onBeforeGenerateToken(
          `leads/some-other-draft/plan.pdf`,
          JSON.stringify({ draftId: DRAFT_ID }),
          false,
        );
        return { type: "blob.generate-client-token", clientToken: "token" } as never;
      },
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("invalid_pathname");
  });

  it("rejects a non-uuid draftId", async () => {
    const response = await handleUploadPost(request({}), {
      handleUpload: async (options) => {
        await options.onBeforeGenerateToken(
          `leads/not-a-uuid/plan.pdf`,
          JSON.stringify({ draftId: "not-a-uuid" }),
          false,
        );
        return { type: "blob.generate-client-token", clientToken: "token" } as never;
      },
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("invalid_draft_id");
  });
});
