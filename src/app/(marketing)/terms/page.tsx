import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { termsOfService } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using the Strong Foam Insulation Inc. website, including non-binding estimates, website content and Ontario governing law.",
  alternates: { canonical: "/terms" },
};

assertMarketingClaimsSafe(metadata, "metadata /terms");

export default function TermsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]} />
      <InteriorHero
        eyebrow="Legal"
        title="Terms of Service"
        description="The terms that apply when you use strongfoam.com."
      />
      <LegalDocumentView doc={termsOfService} />
    </main>
  );
}
