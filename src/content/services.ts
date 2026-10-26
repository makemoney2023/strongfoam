import { assertMarketingClaimsSafe } from "@/content/claims";
import type { ListedServiceId } from "@/lib/leads/types";
import { countWord } from "@/lib/count-words";

export const SERVICE_ROUTE_SLUGS = [
  "spray-foam-insulation",
  "fire-protection",
  "air-vapour-barriers",
  "waterproofing",
  "firestopping",
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
    slug: "waterproofing",
    canonicalPath: "/services/waterproofing",
    title: "Waterproofing",
    summary:
      "Specified below-grade, podium and deck waterproofing systems, including blindside, open-cut and crystalline applications and traffic toppings.",
    storedServiceIds: ["waterproofing"],
    metadata: {
      title: "Below-Grade, Podium and Deck Waterproofing | Strong Foam",
      description:
        "Blindside and open-cut below-grade waterproofing, crystalline waterproofing, podium and deck waterproofing, and traffic toppings for commercial and multi-unit projects in Ontario.",
    },
    cta: estimateCta,
    technicalSections: [
      {
        id: "below-grade-blindside",
        title: "Below-grade blindside waterproofing",
        body:
          "Blindside membranes are installed against shoring or lagging before the foundation wall is poured, for sites where there is no room to work on the outside face of the wall after the pour.",
      },
      {
        id: "below-grade-open-cut",
        title: "Below-grade open-cut waterproofing",
        body:
          "Where the excavation allows access to the outside face of the foundation, the specified membrane, protection and drainage board are applied directly to the wall before backfill.",
      },
      {
        id: "crystalline",
        title: "Crystalline waterproofing",
        body:
          "Crystalline systems are applied to or mixed into concrete as specified and react with moisture in the concrete to reduce water passage through the substrate.",
      },
      {
        id: "podium-and-deck",
        title: "Podium and deck waterproofing",
        body:
          "Podium slabs, plaza decks and other horizontal surfaces over occupied or parking space receive the specified membrane system, detailed at drains, curbs, penetrations and terminations.",
      },
      {
        id: "traffic-toppings",
        title: "Traffic toppings",
        body:
          "Traffic-bearing coating systems for parking decks, ramps and similar surfaces are applied to the specified build-up for the expected pedestrian or vehicle traffic.",
      },
    ],
    cautions: [
      "System selection, membrane type, protection, drainage and detailing follow the project specification and the manufacturer's requirements.",
      "Substrate condition, concrete cure, moisture, temperature and weather are checked against manufacturer limits before application.",
    ],
  },
  {
    slug: "firestopping",
    canonicalPath: "/services/firestopping",
    title: "Firestopping",
    summary:
      "Joint, penetration and insulated penetration firestopping installed to tested systems, with engineering judgments (EJs) obtained where a tested system does not match field conditions.",
    storedServiceIds: ["firestopping"],
    metadata: {
      title: "Firestopping: Joints, Penetrations and EJs | Strong Foam",
      description:
        "Joint firestopping, penetration and insulated penetration firestopping, and engineering judgments (EJs) as required for commercial and multi-unit projects in Ontario.",
    },
    cta: estimateCta,
    technicalSections: [
      {
        id: "joint-firestopping",
        title: "Joint firestopping",
        body:
          "Joints between fire-rated assemblies, such as head-of-wall, wall-to-wall and floor-to-wall joints, are sealed with the listed system for the joint width and movement involved.",
      },
      {
        id: "penetration-firestopping",
        title: "Penetration firestopping",
        body:
          "Pipe, conduit, cable and duct penetrations through rated walls and floors are sealed with a listed system that matches the penetrating item, opening size and assembly.",
      },
      {
        id: "insulated-penetrations",
        title: "Insulated penetration firestopping",
        body:
          "Insulated pipes and ducts need systems tested with the specific insulation type and thickness, so the insulation is confirmed before the system is selected.",
      },
      {
        id: "engineering-judgments",
        title: "Engineering judgments (EJs)",
        body:
          "Where field conditions do not match a tested system, we work with the firestop manufacturer to obtain an engineering judgment for the condition as required.",
      },
    ],
    cautions: [
      "Each installation follows the listed system or engineering judgment for that condition, together with the project specification and manufacturer instructions.",
      "Penetrating items, opening sizes, annular space and assembly ratings are confirmed on site before installation.",
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

/** Number of published service families, spelled out ("five") for copy. */
export const serviceCountWord = countWord(serviceContent.length);
