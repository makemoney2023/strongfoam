import { assertMarketingClaimsSafe } from "@/content/claims";
import sourceMediaManifest from "../../assets/source-media-manifest.json";
import pageMediaPlan from "../../assets/page-media.json";

/** Gallery records for owner-approved (2026-10-13) project photography. */
function ownerApprovedProjectRecords(): ProjectRecord[] {
  return pageMediaPlan.items
    .filter((item) => item.out.startsWith("projects/"))
    .map((item) => ({
      id: `project-${item.id.replace(/^project-/, "")}` as `project-${string}`,
      category: "building-envelope" as const,
      approvedManifestReference: item.manifestId as `media-${string}`,
      media: { sourcePath: item.source, alt: item.alt, decorative: false },
      permissionSafeCaption: `${item.alt}.`,
      publicationStatus: "publish" as const,
      publicationReason: `${pageMediaPlan.approval.scope}: approved by the ${pageMediaPlan.approval.by} on ${pageMediaPlan.approval.date}.`,
    }));
}

export type ProjectCategory = "building-envelope" | "spray-foam";
export type PublicationStatus = "publish" | "hold" | "reject";

export type ProjectRecord = {
  id: `project-${string}`;
  category: ProjectCategory;
  approvedManifestReference: `media-${string}`;
  media: {
    sourcePath: string;
    alt: string;
    decorative: boolean;
  };
  permissionSafeCaption: string;
  publicationStatus: PublicationStatus;
  publicationReason: string;
};

export const projectRecords: readonly ProjectRecord[] = [
  {
    id: "project-commercial-envelope",
    category: "building-envelope",
    approvedManifestReference: "media-da889acd7dfb11ec",
    media: {
      sourcePath: "SFI- IMAGES/IMG_7879.jpeg",
      alt: "Commercial building envelope work in progress",
      decorative: false,
    },
    permissionSafeCaption:
      "Commercial building-envelope installation shown during construction.",
    publicationStatus: "publish",
    publicationReason:
      "The media audit approved this first-party image and its generic trade description.",
  },
  {
    id: "project-multi-storey-envelope",
    category: "building-envelope",
    approvedManifestReference: "media-93e698a55726cd71",
    media: {
      sourcePath: "SFI- IMAGES/IMG_7880.jpeg",
      alt: "Commercial building under construction during envelope installation",
      decorative: false,
    },
    permissionSafeCaption:
      "Multi-storey enclosure installation shown during active construction.",
    publicationStatus: "publish",
    publicationReason:
      "The media audit approved this first-party image and its permission-safe caption.",
  },
  {
    id: "project-spray-foam-interior",
    category: "spray-foam",
    approvedManifestReference: "media-5add718188466efd",
    media: {
      sourcePath: "SFI- IMAGES/IMG_8252.jpeg",
      alt: "Spray foam insulation installed on the walls of a commercial interior",
      decorative: false,
    },
    permissionSafeCaption:
      "Spray foam insulation installed within a commercial interior assembly.",
    publicationStatus: "publish",
    publicationReason:
      "The media audit approved this first-party image and its generic trade description.",
  },
  {
    id: "project-completed-exterior",
    category: "building-envelope",
    approvedManifestReference: "media-33a625218ed2af16",
    media: {
      sourcePath: "SFI- IMAGES/IMG_7930.jpeg",
      alt: "Completed multi-storey building exterior",
      decorative: false,
    },
    permissionSafeCaption:
      "Completed multi-storey building exterior after envelope work.",
    publicationStatus: "publish",
    publicationReason:
      "The media audit approved this first-party project-gallery image.",
  },
  ...ownerApprovedProjectRecords(),
] as const;

assertMarketingClaimsSafe(projectRecords, "typed project content");

type ManifestRecord = {
  id: string;
  path: string;
  decision: {
    alt: string;
    decorative: boolean;
    status: "publish" | "hold" | "duplicate" | "reject";
  };
};

const approvedManifestRecords = new Map(
  (sourceMediaManifest.records as readonly ManifestRecord[])
    .filter((record) => record.decision.status === "publish")
    .map((record) => [record.id, record]),
);

export function filterPublishableProjects(
  records: readonly ProjectRecord[],
): readonly ProjectRecord[] {
  return records.filter(
    (record) => {
      const manifestRecord = approvedManifestRecords.get(
        record.approvedManifestReference,
      );

      return (
        record.publicationStatus === "publish" &&
        manifestRecord?.path === record.media.sourcePath &&
        manifestRecord.decision.alt === record.media.alt &&
        manifestRecord.decision.decorative === record.media.decorative &&
        !record.media.decorative &&
        record.media.alt.trim().length > 0
      );
    },
  );
}
