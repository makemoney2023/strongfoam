import {
  filterPublishablePartners,
  partnerRecords,
  type PartnerRecord,
} from "@/content/partners";
import {
  filterPublishableProjects,
  projectRecords,
  type ProjectRecord,
} from "@/content/projects";
import { serviceContent } from "@/content/services";
import {
  companyContent,
  faqItems,
} from "@/content/site";
import {
  filterPublishableLocations,
  locationRecords,
  type PublicLocation,
} from "@/content/marketing-governance";

export const HOMEPAGE_SECTION_ORDER = [
  "hero",
  "trust",
  "services",
  "mission",
  "process",
  "sectors",
  "projects",
  "partners",
  "coverage",
  "faq",
  "contact",
] as const;

const PUBLIC_PROJECT_IMAGE_PATHS: Partial<
  Record<ProjectRecord["id"], `/media/projects/${string}`>
> = {
  "project-commercial-envelope": "/media/projects/IMG_7879.jpg",
  "project-multi-storey-envelope": "/media/projects/IMG_7880.jpeg",
};

export type MarketingProject = ProjectRecord & {
  publicImagePath: `/media/projects/${string}`;
};

export function selectMarketingProjects(
  records: readonly ProjectRecord[],
): readonly MarketingProject[] {
  return filterPublishableProjects(records).flatMap((project) => {
    const publicImagePath = PUBLIC_PROJECT_IMAGE_PATHS[project.id];
    return publicImagePath ? [{ ...project, publicImagePath }] : [];
  });
}

export function selectMarketingPartners(
  records: readonly PartnerRecord[],
): readonly PartnerRecord[] {
  return filterPublishablePartners(records);
}

export function selectMarketingLocations(
  records: readonly PublicLocation[],
): readonly PublicLocation[] {
  return filterPublishableLocations(records);
}

export function buildMarketingPageModel({
  projects,
  partners,
  locations,
}: {
  projects: readonly ProjectRecord[];
  partners: readonly PartnerRecord[];
  locations: readonly PublicLocation[];
}) {
  const strongFire = serviceContent.find(
    (service) => service.slug === "fire-protection",
  );

  if (!strongFire?.endorsement) {
    throw new Error("Strong Fire homepage content requires an endorsement.");
  }

  const selectedProjects = selectMarketingProjects(projects);
  const heroProject = selectedProjects.find(
    (project) => project.id === "project-multi-storey-envelope",
  );
  const fieldProject = selectedProjects.find(
    (project) => project.id === "project-commercial-envelope",
  );

  if (!heroProject || !fieldProject) {
    throw new Error(
      "The cinematic homepage requires approved public hero and field media.",
    );
  }

  return {
    sectionOrder: HOMEPAGE_SECTION_ORDER,
    serviceLinks: serviceContent.map((service) => ({
      id: service.slug,
      label: service.title,
      summary: service.summary,
      href: service.canonicalPath,
    })),
    strongFire,
    mission: companyContent.mission,
    slogans: companyContent.slogans,
    projects: selectedProjects,
    cinematicMedia: {
      hero: heroProject.publicImagePath,
      process: fieldProject.publicImagePath,
      sector: fieldProject.publicImagePath,
    },
    partners: selectMarketingPartners(partners),
    locations: selectMarketingLocations(locations),
    faq: faqItems,
    estimateCta: {
      label: "Request an estimate",
      href: "/request-estimate",
    } as const,
    motion: {
      disableNonEssentialMotion: true,
      essentialContentVisible: true,
      videoFallback: "poster",
      horizontalRailFallback: "scroll",
    } as const,
  };
}

export type MarketingPageModel = ReturnType<typeof buildMarketingPageModel>;

export const homepageMarketingModel = buildMarketingPageModel({
  projects: projectRecords,
  partners: partnerRecords,
  locations: locationRecords,
});
