/** Audited public content shared by the Scroll Craft homepage and interior routes. */

import { assertMarketingClaimsSafe } from "@/content/claims";
import type { ListedServiceId } from "@/lib/leads/types";

export const site = {
  legalName: "Strong Foam Insulation Inc.",
  brand: "Strong Foam",
  brandLogos: {
    onLight: "/media/brand/strongfoam-logo.svg",
    onDark: "/media/brand/strongfoam-logo.svg",
  },
  parent: "LioCorr Holdings Inc.",
  url: "https://strongfoam.com",
  phoneE164: "+15199006000",
  phoneDisplay: "519-900-6000",
  emailEstimating: "estimating@strongfoam.com",
  primaryOps: {
    label: "Cambridge operations",
    street: "100 McGovern Drive",
    locality: "Cambridge",
    region: "ON",
    postal: "N3H 4R7",
    country: "CA",
  },
  social: {
    facebook: "https://www.facebook.com/STRONGFOAMINSULATION",
    instagram: "https://www.instagram.com/strongfoaminsulation/",
    linkedin: "https://www.linkedin.com/company/strong-foam-insulation-inc",
    twitter: "https://twitter.com/and_foam",
  },
  taglineLegacy: "Creating STRONG Relationships",
} as const;

export type PublicRoute =
  | {
      path:
        | "/"
        | "/about"
        | "/services"
        | "/projects"
        | "/partners"
        | "/locations"
        | "/contact"
        | "/request-estimate";
      kind: "page";
      slug?: never;
    }
  | {
      path:
        | "/services/spray-foam-insulation"
        | "/services/fire-protection"
        | "/services/air-vapour-barriers"
        | "/services/spf-roofing";
      kind: "service";
      slug:
        | "spray-foam-insulation"
        | "fire-protection"
        | "air-vapour-barriers"
        | "spf-roofing";
    };

export const publicRoutes: readonly PublicRoute[] = [
  { path: "/", kind: "page" },
  { path: "/about", kind: "page" },
  { path: "/services", kind: "page" },
  {
    path: "/services/spray-foam-insulation",
    kind: "service",
    slug: "spray-foam-insulation",
  },
  {
    path: "/services/fire-protection",
    kind: "service",
    slug: "fire-protection",
  },
  {
    path: "/services/air-vapour-barriers",
    kind: "service",
    slug: "air-vapour-barriers",
  },
  {
    path: "/services/spf-roofing",
    kind: "service",
    slug: "spf-roofing",
  },
  { path: "/projects", kind: "page" },
  { path: "/partners", kind: "page" },
  { path: "/locations", kind: "page" },
  { path: "/contact", kind: "page" },
  { path: "/request-estimate", kind: "page" },
] as const;

export const companyContent = {
  story:
    "Strong Foam has grown through commercial building-envelope and fire-protection work, adapting its field practices to project specifications, schedules, and construction conditions.",
  focus:
    "The company focuses on ICI and multi-unit residential projects across Ontario, from its Cambridge operations base.",
  culture:
    "Strong Foam supports a family-oriented workplace where employees can develop their skills, collaborate, and take responsibility for their work.",
  safety:
    "Safe work practices are a core operating priority for management and field teams.",
  mission:
    "To provide knowledgeable, trustworthy, and professional service while developing long-term client relationships.",
  vision:
    "To support professional growth, responsive service, and thoughtful adaptation as the company grows.",
  purpose:
    "Develop a family-oriented workplace committed to safe work practices.",
  promise:
    "Deliver clear communication, integrity, and specification-aware service.",
  objective:
    "Use proven methods, collaborative planning, and respectful communication on each project.",
  slogans: [
    "Creating Strong Relationships",
    "Go Beyond. Go Strong.",
    "Strong People. Strong Service. Strong Results.",
  ],
} as const;

export type ServiceId = ListedServiceId;

export type ServiceCopy = {
  id: ServiceId;
  title: string;
  /** Short scroll overlay (≤ ~220 chars) */
  overlay: string;
  /** Longer body for service routes / pinned detail */
  body: string;
};

export const services: ServiceCopy[] = [
  {
    id: "spray-foam",
    title: "Spray foam insulation",
    overlay:
      "Systems-minded SPF for ICI and multi-unit envelopes. Sealed assemblies, timed to the schedule.",
    body: "Strong Foam uses a systems approach that treats the project as connected components requiring attention to detail. When specified and applied correctly, spray polyurethane foam can help reduce conditioned-air loss and support energy performance as part of the assembly.",
  },
  {
    id: "fireproofing",
    title: "Cementitious fireproofing",
    overlay:
      "Spray-applied passive fire protection for structural steel and concrete, installed to the architect’s specification.",
    body: "Protecting buildings from fire is code and responsibility. Strong Foam uses spray-applied cementitious products as specified. Passive fire protection delays loss of integrity in steel and concrete members during fire exposure by insulating structural elements for the required rating.",
  },
  {
    id: "intumescent",
    title: "Intumescent coatings",
    overlay:
      "Intumescent fire protection for commercial, industrial, and infrastructure steel across Ontario.",
    body: "Intumescent fire protection can serve suitable commercial, industrial, and infrastructure steel. For new construction or maintenance work, system selection and application follow project requirements, member conditions, and manufacturer instructions.",
  },
  {
    id: "avb",
    title: "Air-vapour barrier membranes",
    overlay:
      "Specified AVB membrane installation for suitable mid- and high-rise envelope assemblies.",
    body: "Air-vapour barrier membranes form part of Strong Foam’s envelope scope alongside SPF and fire protection. The project specification and manufacturer instructions determine membrane family, substrate preparation, transitions, and terminations.",
  },
  {
    id: "spf-roofing",
    title: "SPF roofing",
    overlay:
      "Spray polyurethane foam roofing systems for suitable specified new or recover applications.",
    body: "SPF roofing combines specified foam with a compatible protective coating. Existing roof condition, substrate, drainage, weather, and manufacturer requirements determine whether the system fits the project.",
  },
];

export type FaqItem = { question: string; answer: string };

/** Claims-safe answers aligned with the visible marketing content. */
export const faqItems: FaqItem[] = [
  {
    question: "What is commercial spray foam insulation used for?",
    answer:
      "On ICI and multi-unit projects it is used to air-seal and insulate wall, roof, and cavity assemblies as part of the building envelope. Strong Foam Insulation Inc. applies SPF as a specialty trade alongside related fire-protection and AVB scopes where specified.",
  },
  {
    question: "Do you only do residential attic foam?",
    answer:
      "Strong Foam’s public positioning is ICI and multi-unit residential. Some custom residential work exists, but commercial and mid/high-rise packages are the core focus. Request an estimate with your drawings for fit.",
  },
  {
    question: "What is cementitious fireproofing?",
    answer:
      "It is a spray-applied cementitious material used to protect structural steel for a specified fire-resistance rating, installed to the project’s listed design and manufacturer instructions.",
  },
  {
    question: "Cementitious or intumescent?",
    answer:
      "Cementitious PFP and intumescent coatings solve related but different finish, thickness, and exposure problems. The specification, member type, and architectural finish usually decide. Strong Foam works with both product families commonly specified in Ontario commercial work.",
  },
  {
    question: "How are air-vapour barrier products selected?",
    answer:
      "The project specification, assembly design, substrate, transitions, and manufacturer instructions determine the membrane family and installation details. Include the specified system when requesting an estimate.",
  },
  {
    question: "How do I request an estimate?",
    answer:
      "Start the project survey at /request-estimate. You can also email drawings and the package scope to estimating@strongfoam.com or call 519-900-6000.",
  },
];

export type ScrollSection = {
  id: string;
  eyebrow?: string;
  headline: string;
  support?: string;
  status: "ready";
  cta?: { label: string; href: string };
};

export const scrollSections: ScrollSection[] = [
  {
    id: "hero",
    eyebrow: site.brand,
    headline: "Envelope & fire trades for Ontario ICI and multi-unit work",
    support:
      "Spray foam, cementitious fireproofing, intumescent coatings, and AVB. Bid-ready specialty scope.",
    status: "ready",
    cta: { label: "Request an estimate", href: "/request-estimate" },
  },
  {
    id: "trust",
    headline: "Specification-aware crews. Documented commercial work.",
    support:
      "Serving ICI and multi-unit residential projects with field practices guided by drawings, specifications, and site conditions.",
    status: "ready",
  },
  {
    id: "services",
    headline: "One trade package. Five critical scopes.",
    support:
      "SPF, passive fire protection, intumescent, air-vapour barriers, and SPF roofing. Coordinated for envelope performance.",
    status: "ready",
  },
  {
    id: "process",
    headline: "From drawings to field execution",
    support:
      "Drawings, specifications, access, sequencing, and schedule constraints move through one field-minded process.",
    status: "ready",
  },
  {
    id: "sectors",
    headline: "Built for commercial, industrial, and multi-unit residential",
    support:
      "High-rise and ICI packages, industrial fire protection, and MUR envelopes. Built for construction teams, not DIY attic work.",
    status: "ready",
  },
  {
    id: "projects",
    headline: "Field work and project photography",
    support:
      "Spray foam, air barrier, and fire-protection work by Strong Foam crews on commercial, industrial, and multi-unit projects.",
    status: "ready",
  },
  {
    id: "coverage",
    headline: "Kitchener–Waterloo operations",
    support: `Primary operations at ${site.primaryOps.street}, ${site.primaryOps.locality}.`,
    status: "ready",
  },
  {
    id: "faq",
    headline: "Answers estimators and consultants actually ask",
    support: "Straight answers on spray foam, fireproofing, air-vapour barriers, and how to get an estimate.",
    status: "ready",
  },
  {
    id: "contact",
    headline: "Get a competitive estimate",
    support:
      "Start the project survey, or call 519-900-6000. Share the drawings, specification, access, and schedule details needed to review fit.",
    status: "ready",
    cta: {
      label: "Start the project survey",
      href: "/request-estimate",
    },
  },
];

export const productBrands: readonly string[] = [];

export const mission = companyContent.mission;

assertMarketingClaimsSafe(
  {
    site,
    publicRoutes,
    companyContent,
    services,
    faqItems,
    scrollSections,
  },
  "typed site content",
);
