import { pageMetadata } from "@/lib/page-metadata";
import type { Metadata } from "next";
import { ScrollWorldPage } from "@/components/scroll-world-page";
import { homepageMarketingModel } from "@/components/marketing/marketing-page-model";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { faqItems } from "@/content/site";
import { homeGraph } from "@/lib/site-schema";

export const metadata: Metadata = pageMetadata({
  title: "Ontario Envelope and Fire Trades",
  description:
    "Explore Strong Foam spray foam, fire-protection, air-vapour barrier, waterproofing, and firestopping scopes for ICI and multi-unit projects.",
  alternates: { canonical: "/" },
});

assertMarketingClaimsSafe(metadata, "metadata /");

export default function Home() {
  const jsonLd = homeGraph(faqItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content" className="flex-1">
        <ScrollWorldPage model={homepageMarketingModel} />
      </main>
    </>
  );
}
