import { ServiceMarketingPage } from "@/components/marketing/service-detail";
import { getServiceBySlug } from "@/content/services";
import { marketingMetadata } from "@/lib/site-metadata";

const service = getServiceBySlug("air-vapour-barriers");

export const metadata = marketingMetadata({
  path: service.canonicalPath,
  title: service.metadata.title,
  description: service.metadata.description,
});

export default function AirVapourBarriersPage() {
  return <ServiceMarketingPage service={service} />;
}
