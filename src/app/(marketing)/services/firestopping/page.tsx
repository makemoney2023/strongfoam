import type { Metadata } from "next";
import { ServiceMarketingPage } from "@/components/marketing/service-detail";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { getServiceBySlug } from "@/content/services";

const service = getServiceBySlug("firestopping");

export const metadata: Metadata = {
  title: service.metadata.title,
  description: service.metadata.description,
  alternates: { canonical: service.canonicalPath },
};

assertMarketingClaimsSafe(metadata, "metadata /services/firestopping");

export default function FirestoppingPage() {
  return <ServiceMarketingPage service={service} />;
}
