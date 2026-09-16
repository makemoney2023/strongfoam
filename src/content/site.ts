/**
 * Scroll-world + SEO copy sourced from docs/ (recovered copy, dossier, ICP, AEO clusters).
 * Softened per claims guards in docs/strongfoam-build-brief.md.
 * Gaps marked with `status: "stub"` need short overlay rewrites before polish.
 */

export const site = {
  legalName: "Strong Foam Insulation Inc.",
  brand: "Strong Foam",
  parent: "LioCorr Holdings Inc.",
  url: "https://strongfoam.com",
  phoneE164: "+15199006000",
  phoneDisplay: "519-900-6000",
  emailEstimating: "estimating@strongfoam.com",
  emailAdmin: "admin@strongfoam.com",
  /** Prefer Breithaupt as ops until client confirms primary NAP */
  primaryOps: {
    label: "Kitchener operations",
    street: "1-399 Breithaupt Street",
    locality: "Kitchener",
    region: "ON",
    postal: "N2H 5H8",
    country: "CA",
  },
  headOffice: {
    label: "Head office",
    street: "322-72 St. Leger Street",
    locality: "Kitchener",
    region: "ON",
    postal: "N2H 6R4",
    country: "CA",
  },
  branches: [
    {
      id: "london",
      label: "London branch",
      street: "5130 Hamilton Road",
      locality: "Dorchester",
      region: "ON",
      postal: "N0L 1G6",
    },
    {
      id: "gta",
      label: "Toronto / GTA",
      street: "3445 Kirby",
      locality: "Woodbridge",
      region: "ON",
      postal: "L4L 1A6",
      note: "Confirm active status with client before hard GEO claims",
    },
  ],
  social: {
    facebook: "https://www.facebook.com/STRONGFOAMINSULATION",
    instagram: "https://www.instagram.com/strongfoaminsulation/",
    linkedin: "https://www.linkedin.com/company/strong-foam-insulation-inc",
    twitter: "https://twitter.com/and_foam",
  },
  taglineLegacy: "Creating STRONG Relationships",
} as const;

export type ServiceId =
  | "spray-foam"
  | "fireproofing"
  | "intumescent"
  | "avb"
  | "spf-roofing";

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
    body: "Strong Foam focuses on thermal envelope solutions that last. A systems design approach treats your project as components that need attention to detail: certified evaluation, expert advice, quality, and integrity. Applied correctly, spray polyurethane foam helps reduce conditioned-air loss and supports energy performance as part of the specified assembly.",
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
    body: "The team stays current on application procedures for intumescent fire protection on large commercial, industrial, and infrastructure projects. For new construction or maintenance of existing systems, operators work to project requirements with safety as the non-negotiable priority.",
  },
  {
    id: "avb",
    title: "Air-vapour barrier membranes",
    overlay:
      "AVB membrane installation for mid- and high-rise envelopes, including Blueskin- and Sopraseal-class systems when specified.",
    body: "Air-vapour barrier membranes are part of Strong Foam’s envelope package alongside SPF and fire protection. Product families evidenced on site materials include Henry Blueskin and Soprema Sopraseal. Confirm exact SKUs and applicator status against your specification when requesting an estimate.",
  },
  {
    id: "spf-roofing",
    title: "SPF roofing",
    overlay:
      "Spray polyurethane foam roofing systems built for durability, energy performance, and low maintenance.",
    body: "Owners want durable roofing that combines energy performance with lower maintenance. SPF roofing systems have decades of field history; Strong Foam helps specify, install, and maintain them where they fit the project.",
  },
];

export type FaqItem = { question: string; answer: string };

/** Draft AEO Q&As from docs/seo/04-aeo-geo-keyword-clusters.md. Verify before publish. */
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
      "It is a spray-applied cementitious coating used to protect structural steel for a specified fire-resistance rating, installed to the project’s listed design and manufacturer instructions (for example GCP Monokote-class products when specified).",
  },
  {
    question: "Cementitious or intumescent?",
    answer:
      "Cementitious PFP and intumescent coatings solve related but different finish, thickness, and exposure problems. The specification, member type, and architectural finish usually decide. Strong Foam works with both product families commonly specified in Ontario commercial work.",
  },
  {
    question: "Do you install Henry Blueskin and Soprema membranes?",
    answer:
      "Those product lines appear on Strong Foam’s systems and products materials. Confirm current applicator status and the exact SKU in your spec when requesting an estimate.",
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
  /** ready = docs-backed overlay; stub = needs short rewrite */
  status: "ready" | "stub";
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
      "Serving ICI and multi-unit residential from 2016. Decades of combined construction experience across the group. Exact founding narrative pending client confirmation.",
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
    headline: "Work that shows up on certificates and jobsite photos",
    support:
      "ConstructConnect substantial-performance records and field photography. Named case studies require client permission before publish.",
    status: "ready",
  },
  {
    id: "coverage",
    headline: "Kitchener–Waterloo · London · GTA",
    support: `Primary operations at ${site.primaryOps.street}, ${site.primaryOps.locality}. London / Dorchester and Woodbridge branches as published. Confirm active NAP before GEO freeze.`,
    status: "ready",
  },
  {
    id: "faq",
    headline: "Answers estimators and consultants actually ask",
    support: "Extractable answers for estimators, consultants, and search systems. Visible copy matches the JSON-LD.",
    status: "ready",
  },
  {
    id: "contact",
    headline: "Get a competitive estimate",
    support:
      "Start the project survey, or call 519-900-6000. Competitive quotes for projects of any size, with details carried from drawings to field.",
    status: "ready",
    cta: {
      label: "Start the project survey",
      href: "/request-estimate",
    },
  },
];

export const productBrands = [
  "Genyk",
  "BASF",
  "Soprema",
  "Henry Blueskin",
  "GCP / Grace",
  "Carboline",
  "Hilti",
] as const;

export const mission =
  "To be a knowledgeable, trustworthy, and professional provider on all our services on every project throughout Ontario. We are dedicated to customer service and strive to develop and nurture long-term relationships with every client.";
