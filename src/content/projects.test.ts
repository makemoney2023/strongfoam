import { describe, expect, it } from "vitest";
import { assertMarketingClaimsSafe } from "@/content/claims";
import {
  filterPublishableProjects,
  projectRecords,
  type ProjectRecord,
} from "@/content/projects";

describe("typed project content", () => {
  it("defines stable permission-safe, manifest-backed project records", () => {
    expect(projectRecords.length).toBeGreaterThan(0);
    expect(new Set(projectRecords.map((project) => project.id)).size).toBe(
      projectRecords.length,
    );

    for (const project of projectRecords) {
      expect(project.id).toMatch(/^project-[a-z0-9-]+$/);
      expect(["building-envelope", "spray-foam"]).toContain(project.category);
      expect(project.approvedManifestReference).toMatch(/^media-[a-f0-9]{16}$/);
      expect(project.media.sourcePath).toMatch(/^SFI- IMAGES\//);
      expect(project.media.alt.length).toBeGreaterThan(10);
      expect(project.media.decorative).toBe(false);
      expect(project.publicationStatus).toBe("publish");
      expect(project.permissionSafeCaption).not.toMatch(
        /\b(?:client|address|guaranteed)\b/i,
      );
      expect(() =>
        assertMarketingClaimsSafe(project, `project ${project.id}`),
      ).not.toThrow();
    }
  });

  it("filters held and rejected records from rendered projects", () => {
    const held: ProjectRecord = {
      ...projectRecords[0],
      id: "project-held",
      publicationStatus: "hold",
      publicationReason: "Awaiting site publication permission.",
    };
    const rejected: ProjectRecord = {
      ...projectRecords[0],
      id: "project-rejected",
      publicationStatus: "reject",
      publicationReason: "Image quality is not suitable for publication.",
    };

    expect(
      filterPublishableProjects([...projectRecords, held, rejected]),
    ).toEqual(projectRecords);
  });

  it("rejects forged or mismatched manifest references even when marked publish", () => {
    const forged: ProjectRecord = {
      ...projectRecords[0],
      id: "project-forged",
      approvedManifestReference: "media-0000000000000000",
    };
    const mismatched: ProjectRecord = {
      ...projectRecords[0],
      id: "project-mismatched",
      media: {
        ...projectRecords[0].media,
        sourcePath: "SFI- IMAGES/not-the-approved-source.jpeg",
      },
    };

    expect(
      filterPublishableProjects([...projectRecords, forged, mismatched]),
    ).toEqual(projectRecords);
  });
});
