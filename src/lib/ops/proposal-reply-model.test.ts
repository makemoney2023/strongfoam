import { describe, expect, it } from "vitest";
import { classifyInboundReply } from "@/lib/ops/proposal-reply-model";

describe("proposal reply model", () => {
  it("uses the keyword reader when no model is configured", async () => {
    const result = await classifyInboundReply({
      subject: "Re: E-100",
      text: "We accept the proposal.",
      organizationId: "org-1",
    });
    expect(result.classification).toBe("accepted");
    expect(result.quote.toLowerCase()).not.toContain("approved");
  });
});
