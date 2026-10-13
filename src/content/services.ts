import { assertMarketingClaimsSafe } from "@/content/claims";
import type { ListedServiceId } from "@/lib/leads/types";

export const SERVICE_ROUTE_SLUGS = [
  "spray-foam-insulation",
  "fire-protection",
  "air-vapour-barriers",
  "spf-roofing",
] as const;

export type ServiceRouteSlug = (typeof SERVICE_ROUTE_SLUGS)[number];

export type ServiceTechnicalSection = {
  id: string;
  title: string;
  body: string;
};

export type ServiceContent = {
  slug: ServiceRouteSlug;
  canonicalPath: `/services/${ServiceRouteSlug}`;
  title: string;
  summary: string;
  storedServiceIds: readonly ListedServiceId[];
  metadata: {
    title: string;
    description: string;
  };
  cta: {
    label: "Request an estimate";
    href: "/request-estimate";
  };
  endorsement?: string;
  technicalSections: readonly ServiceTechnicalSection[];
  cautions: readonly string[];
};

const estimateCta = {
  label: "Request an estimate",
  href: "/request-estimate",
} as const;

export const serviceContent: readonly ServiceContent[] = [
  {
    slug: "spray-foam-insulation",
    canonicalPath: "/services/spray-foam-insulation",
    title: "Spray foam insulation",
    summary:
      "Spray polyurethane foam can support insulation and air-sealing goals as part of a specified commercial or multi-unit assembly.",
    storedServiceIds: ["spray-foam"],
    metadata: {
      title: "Commercial Spray Foam Insulation | Strong Foam",
      description:
        "Explore specification-led spray foam insulation for commercial, industrial, and multi-unit building-envelope assemblies in Ontario.",
    },
    cta: estimateCta,
    technicalSections: [
      {
        id: "systems-approach",
        title: "A systems approach",
        body:
          "The enclosure works as connected components. Spray foam selection, transitions, penetrations, and adjacent materials need to follow the project design.",
      },
      {
        id: "air-sealing",
        title: "Continuous application",
        body:
          "When specified and applied correctly, spray foam can help limit conditioned-air loss and provide insulation across suitable wall, roof, and cavity assemblies.",
      },
    ],
    cautions: [
      "Product, thickness, substrate preparation, and assembly details depend on the project specification.",
      "Installation requires suitable substrate and environmental conditions together with manufacturer requirements.",
    ],
  },
  {
    slug: "fire-protection",
    canonicalPath: "/services/fire-protection",
    title: "Strong Fire Protection",
    summary:
      "Specification-led cementitious passive fire protection and intumescent coatings for suitable commercial, industrial, infrastructure, and maintenance scopes.",
    storedServiceIds: ["fireproofing", "intumescent"],
    metadata: {
      title: "Strong Fire Protection Services | Strong Foam",
      description:
        "Review cementitious passive fire protection and intumescent coating scopes delivered as an endorsed Strong Foam service.",
    },
    cta: estimateCta,
    endorsement: "Strong Fire Protection, a Strong Foam service.",
    technicalSections: [
      {
        id: "cementitious",
        title: "Cementitious passive fire protection",
        body:
          "Spray-applied cementitious material can insulate specified structural steel or concrete members and help delay loss of structural integrity during fire exposure.",
      },
      {
        id: "intumescent",
        title: "Intumescent coatings",
        body:
          "Intumescent systems can provide a specified fire-protection solution where member type, exposure, finish, and maintenance requirements make that product family appropriate.",
      },
    ],
    cautions: [
      "System selection and required rating follow the listed design, project specification, member type, and manufacturer instructions.",
      "We check substrate condition, preparation, primer compatibility, exposure, finish, and maintenance requirements against the selected product.",
    ],
  },
  {
    slug: "air-vapour-barriers",
    canonicalPath: "/services/air-vapour-barriers",
    title: "Air-vapour barriers",
    summary:
      "Specified air and vapour control layers can help manage air movement, moisture risk, and enclosure durability across transitions and penetrations.",
    storedServiceIds: ["avb"],
    metadata: {
      title: "Air-Vapour Barrier Installation | Strong Foam",
      description:
        "Explore specification-led air-vapour barrier installation for commercial and multi-unit wall assemblies, transitions, and penetrations.",
    },
    cta: estimateCta,
    technicalSections: [
      {
        id: "air-movement",
        title: "Air movement",
        body:
          "A continuous air-control layer is designed to limit infiltration and exfiltration through the wall assembly, including transitions and penetrations.",
      },
      {
        id: "vapour-and-condensation",
        title: "Vapour and condensation",
        body:
          "Vapour-control selection and placement depend on climate, assembly design, and material properties so moisture does not become trapped in vulnerable layers.",
      },
    ],
    cautions: [
      "Membrane family, primer, substrate preparation, laps, terminations, and transitions follow the project specification and manufacturer instructions.",
      "We install the membrane system named in the specification, following the manufacturer's installation requirements.",
    ],
  },
  {
    slug: "spf-roofing",
    canonicalPath: "/services/spf-roofing",
    title: "SPF roofing",
    summary:
      "Spray polyurethane foam roofing combines specified foam with a protective coating for suitable new or recover applications.",
    storedServiceIds: ["spf-roofing"],
    metadata: {
      title: "SPF Roofing Systems and Limitations | Strong Foam",
      description:
        "Review SPF roofing composition, substrates, recover applications, slope, drainage, weather limits, and specification requirements.",
    },
    cta: estimateCta,
    technicalSections: [
      {
        id: "system-composition",
        title: "System composition",
        body:
          "Roofing SPF is installed to the required profile and protected from ultraviolet exposure by a compatible elastomeric coating or other specified covering.",
      },
      {
        id: "substrates-and-recover",
        title: "Substrates and recover applications",
        body:
          "SPF can adhere to several prepared substrates and may help add slope or fill low areas, but the existing roof and deck require evaluation before a recover application.",
      },
      {
        id: "conditions-and-limitations",
        title: "Conditions and limitations",
        body:
          "Installation depends on trained crews, suitable substrate temperatures, humidity and dew-point limits, dry surfaces, manageable wind, and manufacturer requirements.",
      },
    ],
    cautions: [
      "Every roof is assessed for substrate condition, drainage, and recover suitability before work begins.",
      "Foam and protective coatings should not be applied over ice, frost, surface moisture, or visible dampness, or outside manufacturer weather limits.",
    ],
  },
] as const;

assertMarketingClaimsSafe(serviceContent, "typed service content");

export function getServiceBySlug(slug: ServiceRouteSlug): ServiceContent {
  const service = serviceContent.find((entry) => entry.slug === slug);
  if (!service) {
    throw new Error(`Unknown service slug: ${slug}`);
  }
  return service;
}
