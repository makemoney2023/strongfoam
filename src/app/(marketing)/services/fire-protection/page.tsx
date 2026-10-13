import type { Metadata } from "next";
import { ServiceMarketingPage } from "@/components/marketing/service-detail";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { getServiceBySlug } from "@/content/services";

const service = getServiceBySlug("fire-protection");

export const metadata: Metadata = {
  title: service.metadata.title,
  description: service.metadata.description,
  alternates: { canonical: service.canonicalPath },
};

assertMarketingClaimsSafe(metadata, "metadata /services/fire-protection");

export default function FireProtectionPage() {
  return <ServiceMarketingPage service={service} />;
}
