import { beforeEach, describe, expect, it } from "vitest";
import { draftsFromSync } from "@/lib/ops/field-sync";

describe("field sync", () => {
  beforeEach(() => undefined);

  it("keeps the signed-in user and rejects a status change", () => {
    const result = draftsFromSync({
      organizationId: "org",
      userId: "worker",
      body: {
        items: [
          {
            id: "ok",
            kind: "draft",
            draft: {
              jobId: "job",
              userId: "someone-else",
              kind: "caption",
              body: "Photo queued on this device.",
              quote: "Photo queued on this device.",
              source: "photo",
            },
          },
          { id: "status", kind: "draft", jobStatus: "blocked", draft: { jobId: "job", kind: "blocker", body: "Down", quote: "Down", source: "manual" } },
          { id: "verify", kind: "verify", draft: { jobId: "job", kind: "labor", body: "Here", quote: "Here", source: "arrival" } },
        ],
      },
    });
    expect(result.accepted.map((draft) => draft.clientId)).toEqual(["ok"]);
    expect(result.accepted[0]?.userId).toBe("worker");
    expect(result.rejected).toEqual(["status", "verify"]);
  });
});
