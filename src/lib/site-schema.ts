import { site } from "@/content/site";

const orgId = `${site.url}/#organization`;
const websiteId = `${site.url}/#website`;

/** Stable Organization + WebSite nodes for per-page @graph composition */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": orgId,
    name: site.legalName,
    url: site.url,
    email: site.emailEstimating,
    telephone: site.phoneE164,
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

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export { orgId, websiteId };
