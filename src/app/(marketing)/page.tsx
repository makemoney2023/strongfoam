import { ScrollWorldPage } from "@/components/scroll-world-page";
import { homepageMarketingModel } from "@/components/marketing/marketing-page-model";
import { SchemaScript } from "@/components/marketing/schema-script";
import { faqItems } from "@/content/site";
import { marketingMetadata } from "@/lib/site-metadata";
import { homeGraph } from "@/lib/site-schema";

export const metadata = marketingMetadata({
  path: "/",
  title: "Ontario Envelope and Fire Trades",
  description:
    "Explore Strong Foam spray foam, fire-protection, air-vapour barrier, and SPF roofing scopes for ICI and multi-unit projects.",
});

export default function Home() {
  const jsonLd = homeGraph(faqItems);

  return (
    <>
      <SchemaScript graph={jsonLd} />
      <main id="main-content" className="flex-1">
        <ScrollWorldPage model={homepageMarketingModel} />
      </main>
    </>
  );
}
