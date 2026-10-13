import { assertMarketingClaimsSafe } from "@/content/claims";
import {
  filterPublishableLocations,
  locationRecords,
} from "@/content/marketing-governance";
import type { ServiceContent } from "@/content/services";
import { site } from "@/content/site";

const orgId = `${site.url}/#organization`;
const websiteId = `${site.url}/#website`;
const contactPointId = `${site.url}/#contact-point`;
const localBusinessId = `${site.url}/#local-business`;

type BreadcrumbInput = {
  name: string;
  path?: "/" | `/${string}`;
};

type MarketingPageGraphInput = {
  path: "/" | `/${string}`;
  name: string;
  description: string;
  breadcrumbs?: readonly BreadcrumbInput[];
  includeLocalBusiness?: boolean;
  faq?: readonly { question: string; answer: string }[];
  service?: ServiceContent;
};

function canonicalUrl(path: "/" | `/${string}`) {
  return path === "/" ? site.url : `${site.url}${path}`;
}

/** Stable Organization + WebSite nodes for per-page @graph composition */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": orgId,
    name: site.legalName,
    url: site.url,
    contactPoint: { "@id": contactPointId },
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

export function contactPointNode() {
  return {
    "@type": "ContactPoint",
    "@id": contactPointId,
    contactType: "estimating and general inquiries",
    telephone: site.phoneE164,
    email: site.emailEstimating,
    areaServed: "Ontario",
    availableLanguage: "English",
  };
}

export function localBusinessNode() {
  const location = filterPublishableLocations(locationRecords)[0];
  if (!location?.address) {
    return null;
  }

  return {
    "@type": "LocalBusiness",
    "@id": localBusinessId,
    name: site.legalName,
    url: site.url,
    parentOrganization: { "@id": orgId },
    telephone: site.phoneE164,
    email: site.emailEstimating,
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address.street,
      addressLocality: location.address.locality,
      addressRegion: location.address.region,
      postalCode: location.address.postal,
      addressCountry: location.address.country,
    },
  };
}

function breadcrumbNode(
  path: "/" | `/${string}`,
  breadcrumbs: readonly BreadcrumbInput[],
) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl(path)}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: canonicalUrl(item.path) } : {}),
    })),
  };
}

function serviceNode(service: ServiceContent) {
  return {
    "@type": "Service",
    "@id": `${canonicalUrl(service.canonicalPath)}#service`,
    name: service.title,
    description: service.summary,
    identifier: [...service.storedServiceIds],
    url: canonicalUrl(service.canonicalPath),
    provider: { "@id": orgId },
    areaServed: "Ontario",
  };
}

export function marketingPageGraph({
  path,
  name,
  description,
  breadcrumbs,
  includeLocalBusiness = false,
  faq,
  service,
}: MarketingPageGraphInput) {
  const pageUrl = canonicalUrl(path);
  const graph: Record<string, unknown>[] = [
    organizationNode(),
    websiteNode(),
    contactPointNode(),
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name,
      description,
      isPartOf: { "@id": websiteId },
      about: { "@id": orgId },
    },
  ];

  if (includeLocalBusiness) {
    const business = localBusinessNode();
    if (business) graph.push(business);
  }

  if (breadcrumbs?.length) {
    graph.push(breadcrumbNode(path, breadcrumbs));
  }

  if (service) {
    graph.push(serviceNode(service));
  }

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
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

export function homeGraph(
  faq?: readonly { question: string; answer: string }[],
) {
  return marketingPageGraph({
    path: "/",
    name: "Ontario Envelope and Fire Trades",
    description:
      "Explore Strong Foam spray foam, fire-protection, air-vapour barrier, and SPF roofing scopes for ICI and multi-unit projects.",
    includeLocalBusiness: true,
    faq,
  });
}

export function serviceGraph(service: ServiceContent) {
  return marketingPageGraph({
    path: service.canonicalPath,
    name: service.title,
    description: service.summary,
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
      { name: service.title },
    ],
    service,
  });
}

export { contactPointId, localBusinessId, orgId, websiteId };
