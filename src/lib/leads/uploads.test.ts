import { describe, expect, it } from "vitest";
import {
  isAllowedUploadContentType,
  isOwnedUploadPath,
} from "@/lib/leads/uploads";

describe("upload policy", () => {
  it("allows pdf and images and denies zip", () => {
    expect(isAllowedUploadContentType("application/pdf")).toBe(true);
    expect(isAllowedUploadContentType("image/jpeg")).toBe(true);
    expect(isAllowedUploadContentType("image/png")).toBe(true);
    expect(isAllowedUploadContentType("image/webp")).toBe(true);
    expect(isAllowedUploadContentType("application/zip")).toBe(false);
  });

  it("requires pathnames under leads/{draftId}/", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(isOwnedUploadPath(id, `leads/${id}/spec.pdf`)).toBe(true);
    expect(isOwnedUploadPath(id, `leads/other/spec.pdf`)).toBe(false);
    expect(isOwnedUploadPath(id, `leads/${id}/../secret.pdf`)).toBe(false);
  });
});
