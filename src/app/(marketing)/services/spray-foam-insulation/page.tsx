import { pageMetadata } from "@/lib/page-metadata";
import type { Metadata } from "next";
import { ServiceMarketingPage } from "@/components/marketing/service-detail";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { getServiceBySlug } from "@/content/services";

const service = getServiceBySlug("spray-foam-insulation");

export const metadata: Metadata = pageMetadata({
  title: service.metadata.title,
  description: service.metadata.description,
  alternates: { canonical: service.canonicalPath },
});

assertMarketingClaimsSafe(metadata, "metadata /services/spray-foam-insulation");

export default function SprayFoamInsulationPage() {
  return <ServiceMarketingPage service={service} />;
}
