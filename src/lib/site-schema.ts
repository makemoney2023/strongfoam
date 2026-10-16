import { assertMarketingClaimsSafe } from "@/content/claims";
import { site } from "@/content/site";

const orgId = `${site.url}/#organization`;
const websiteId = `${site.url}/#website`;

export const ontarioArea = {
  "@type": "AdministrativeArea",
  name: "Ontario",
  sameAs: "https://en.wikipedia.org/wiki/Ontario",
  containedInPlace: { "@type": "Country", name: "Canada" },
} as const;

/** Stable Organization + WebSite nodes for per-page @graph composition */
export function organizationNode() {
  return {
    "@type": ["HomeAndConstructionBusiness", "Organization"],
    "@id": orgId,
    name: site.legalName,
    url: site.url,
    email: site.emailEstimating,
    telephone: site.phoneE164,
    logo: `${site.url}/icon.png`,
    image: `${site.url}/og-image.png`,
    areaServed: ontarioArea,
    parentOrganization: {
      "@type": "Organization",
      name: site.parent,
    },
    sameAs: [
      site.social.facebook,
      site.social.instagram,
      site.social.linkedin,
      site.social.twitter,
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.primaryOps.street,
      addressLocality: site.primaryOps.locality,
      addressRegion: site.primaryOps.region,
      postalCode: site.primaryOps.postal,
      addressCountry: site.primaryOps.country,
    },
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: site.url,
    name: site.brand,
    publisher: { "@id": orgId },
  };
}

export function homeGraph(faq?: { question: string; answer: string }[]) {
  const graph: Record<string, unknown>[] = [
    organizationNode(),
    websiteNode(),
    {
      "@type": "WebPage",
      "@id": `${site.url}/#webpage`,
      url: site.url,
      name: `${site.brand} — commercial spray foam & fire protection Ontario`,
      isPartOf: { "@id": websiteId },
      about: { "@id": orgId },
    },
  ];

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${site.url}/#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  const completedGraph = {
    "@context": "https://schema.org",
    "@graph": graph,
  };
  assertMarketingClaimsSafe(completedGraph, "json-ld");
  return completedGraph;
}

export function serviceGraph(service: {
  title: string;
  canonicalPath: string;
  summary: string;
}) {
  const graph = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${site.url}${service.canonicalPath}#service`,
    name: service.title,
    serviceType: service.title,
    description: service.summary,
    url: `${site.url}${service.canonicalPath}`,
    provider: { "@id": orgId, "@type": organizationNode()["@type"], name: site.brand, url: site.url },
    areaServed: ontarioArea,
  };
  assertMarketingClaimsSafe(graph, "json-ld service");
  return graph;
}

export function breadcrumbGraph(items: readonly { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href === "/" ? site.url : `${site.url}${item.href}` } : {}),
    })),
  };
}

export { orgId, websiteId };

