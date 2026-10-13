import { assertMarketingClaimsSafe } from "@/content/claims";
import sourceMediaManifest from "../../assets/source-media-manifest.json";

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
