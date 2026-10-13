import { describe, expect, it, vi } from "vitest";
import {
  parseNotifyRecipients,
  sendThroughCloudflareEmail,
} from "@/lib/cloudflare/email";

describe("Cloudflare lead email", () => {
  it("splits, trims, and de-duplicates notification recipients", () => {
    expect(
      parseNotifyRecipients(
        " estimating@strongfoam.com, admin@strongfoam.com, estimating@strongfoam.com ",
      ),
    ).toEqual(["estimating@strongfoam.com", "admin@strongfoam.com"]);
  });

  it("rejects an empty recipient list", () => {
    expect(() => parseNotifyRecipients(" , ")).toThrow(/recipient/i);
  });

  it("sends the recipient array through the Worker email binding", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "email-1" });

    await sendThroughCloudflareEmail(
      { send },
      {
        to: ["estimating@strongfoam.com", "office@strongfoam.com"],
        from: "Strong Foam <estimates@strongfoam.com>",
        subject: "New inquiry",
        text: "General inquiry received.",
      },
    );

    expect(send).toHaveBeenCalledWith({
      to: ["estimating@strongfoam.com", "office@strongfoam.com"],
      from: "Strong Foam <estimates@strongfoam.com>",
      subject: "New inquiry",
      text: "General inquiry received.",
    });
  });
});
