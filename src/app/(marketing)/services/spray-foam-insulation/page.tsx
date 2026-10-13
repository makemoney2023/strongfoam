import { ServiceMarketingPage } from "@/components/marketing/service-detail";
import { getServiceBySlug } from "@/content/services";
import { marketingMetadata } from "@/lib/site-metadata";

const service = getServiceBySlug("spray-foam-insulation");

export const metadata = marketingMetadata({
  path: service.canonicalPath,
  title: service.metadata.title,
  description: service.metadata.description,
});

export default function SprayFoamInsulationPage() {
  return <ServiceMarketingPage service={service} />;
}
