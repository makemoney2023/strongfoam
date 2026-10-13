import { describe, expect, it } from "vitest";
import {
  filterPublishablePartners,
  partnerRecords,
  type PartnerRecord,
} from "@/content/partners";

describe("typed partner content", () => {
  it("records every relationship and logo approval gate explicitly", () => {
    expect(partnerRecords.map((partner) => partner.id)).toEqual([
      "partner-genyk",
      "partner-basf",
      "partner-soprema",
      "partner-henry",
      "partner-gcp-grace",
      "partner-carboline",
      "partner-hilti",
      "partner-demilec",
      "partner-sherwin-williams",
      "partner-3m",
      "partner-dakon-construction",
      "partner-blockwall",
      "partner-mcc",
      "partner-sem-construction",
    ]);
    expect(new Set(partnerRecords.map((partner) => partner.id)).size).toBe(
      partnerRecords.length,
    );
    expect(
      new Set(partnerRecords.map((partner) => partner.category)),
    ).toEqual(new Set(["supplier", "client-contractor"]));

    for (const partner of partnerRecords) {
      expect(["supplier", "client-contractor"]).toContain(partner.category);
      expect(partner.identity).toEqual(
        expect.objectContaining({
          known: expect.any(Boolean),
          reason: expect.any(String),
        }),
      );
      expect(partner.currentRelationship).toEqual(
        expect.objectContaining({
          approved: expect.any(Boolean),
          reason: expect.any(String),
        }),
      );
      expect(partner.publicationPermission).toEqual(
        expect.objectContaining({
          approved: expect.any(Boolean),
          reason: expect.any(String),
        }),
      );
      expect(
        partner.logo.approvedOfficialPath === null ||
          typeof partner.logo.approvedOfficialPath === "string",
      ).toBe(true);
      expect(partner.logo.alt).toEqual(expect.any(String));
      expect(["publish", "hold", "reject"]).toContain(
        partner.publicationStatus,
      );
    }
  });

  it("returns only fully approved publishable partner records", () => {
    const approved: PartnerRecord = {
      id: "partner-approved-fixture",
      displayName: "Approved fixture",
      category: "supplier",
      identity: { known: true, reason: "Identity verified." },
      currentRelationship: {
        approved: true,
        reason: "Current relationship confirmed.",
      },
      publicationPermission: {
        approved: true,
        reason: "Logo publication approved.",
      },
      logo: {
        approvedOfficialPath: "/media/partners/approved.svg",
        alt: "Approved fixture logo",
      },
      publicationStatus: "publish",
      publicationReason: "All relationship and logo gates are approved.",
    };
    const held: PartnerRecord = {
      ...approved,
      id: "partner-held-fixture",
      currentRelationship: {
        approved: false,
        reason: "Current relationship is not confirmed.",
      },
      publicationStatus: "hold",
      publicationReason: "Current relationship approval is missing.",
    };

    expect(filterPublishablePartners([...partnerRecords, approved, held])).toEqual([
      approved,
    ]);
    expect(filterPublishablePartners(partnerRecords)).toEqual([]);
  });
});
