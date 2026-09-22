import { describe, expect, it } from "vitest";
import { redactAuditPayload } from "@/lib/ops/audit";

describe("audit redaction", () => {
  it("redacts signed storage URLs and raw import row values", () => {
    expect(
      redactAuditPayload({
        signedUrl: "https://example.supabase.co/storage/v1/object/sign/data-imports/file?token=abc",
        values: { name: "Acme", unit_price: "12.50" },
        download: "https://example.supabase.co/storage/v1/object/sign/data-imports/file?token=abc",
        filename: "customers.csv",
      }),
    ).toEqual({
      signedUrl: "[redacted]",
      values: "[redacted]",
      download: "[redacted]",
      filename: "customers.csv",
    });
  });
});
